alter table public.of_message_scripts
add column if not exists action_mode text not null default 'draft_for_approval';

alter table public.of_message_scripts
drop constraint if exists of_message_scripts_action_mode_check;

alter table public.of_message_scripts
add constraint of_message_scripts_action_mode_check
check (action_mode in ('task_only', 'draft_for_approval', 'auto_send'));

update public.of_message_scripts
set
  action_mode = 'auto_send',
  auto_send_enabled = true,
  requires_approval = false
where trigger_event_type = 'subscriber_created'
  and name = 'New Subscriber Welcome';

alter table public.of_automation_runs
add column if not exists action_mode text not null default 'draft_for_approval';

alter table public.of_automation_runs
drop constraint if exists of_automation_runs_action_mode_check;

alter table public.of_automation_runs
add constraint of_automation_runs_action_mode_check
check (action_mode in ('task_only', 'draft_for_approval', 'auto_send'));

alter table public.of_tasks
add column if not exists source_event_id uuid references public.of_events(id) on delete set null,
add column if not exists subscriber_id uuid references public.of_subscribers(id) on delete set null,
add column if not exists chat_id uuid references public.of_chats(id) on delete set null;

update public.of_tasks
set source_event_id = source_id
where source_event_id is null
  and source_type = 'event'
  and source_id is not null;

create index if not exists of_tasks_source_event_idx
on public.of_tasks (source_event_id);

create index if not exists of_tasks_subscriber_idx
on public.of_tasks (subscriber_id);

create index if not exists of_tasks_chat_idx
on public.of_tasks (chat_id);

create index if not exists of_tasks_open_event_type_idx
on public.of_tasks (creator_id, source_event_id, task_type)
where source_event_id is not null and status in ('open', 'in_progress');

alter table public.of_outbound_messages
add column if not exists source_event_id uuid references public.of_events(id) on delete set null,
add column if not exists draft_text text,
add column if not exists final_text text,
add column if not exists approved_by text;

alter table public.of_outbound_messages
drop constraint if exists of_outbound_messages_status_check;

alter table public.of_outbound_messages
add constraint of_outbound_messages_status_check
check (status in ('pending_approval', 'queued', 'sent', 'failed', 'skipped'));

update public.of_outbound_messages
set
  source_event_id = coalesce(of_outbound_messages.source_event_id, runs.source_event_id),
  draft_text = coalesce(of_outbound_messages.draft_text, of_outbound_messages.message_body),
  final_text = coalesce(of_outbound_messages.final_text, case when of_outbound_messages.status = 'sent' then of_outbound_messages.message_body else null end)
from public.of_automation_runs runs
where of_outbound_messages.automation_run_id = runs.id;

create index if not exists of_outbound_messages_source_event_idx
on public.of_outbound_messages (source_event_id);

create unique index if not exists of_outbound_messages_automation_event_key
on public.of_outbound_messages (automation_run_id, source_event_id)
where automation_run_id is not null and source_event_id is not null;

insert into public.of_message_scripts (
  creator_id,
  name,
  trigger_event_type,
  status,
  action_mode,
  auto_send_enabled,
  requires_approval,
  cooldown_hours,
  max_sends_per_fan
)
select
  creator.id,
  template.name,
  template.trigger_event_type,
  'inactive',
  template.action_mode,
  template.action_mode = 'auto_send',
  template.action_mode <> 'auto_send',
  template.cooldown_hours,
  template.max_sends_per_fan
from public.of_creators creator
cross join (
  values
    ('Chat Message Suggested Reply', 'chat_message', 'draft_for_approval', 1, 0),
    ('Returning Subscriber Re-engagement', 'subscriber_created', 'auto_send', 24, 1),
    ('Expiring Subscriber Retention Offer', 'subscriber_expiring', 'draft_for_approval', 24, 1),
    ('Tip Received Thank You', 'transaction_created', 'auto_send', 0, 0)
) as template(name, trigger_event_type, action_mode, cooldown_hours, max_sends_per_fan)
on conflict do nothing;

with scripts as (
  select script.id, script.name
  from public.of_message_scripts script
  where script.name in (
    'Chat Message Suggested Reply',
    'Returning Subscriber Re-engagement',
    'Expiring Subscriber Retention Offer',
    'Tip Received Thank You'
  )
),
steps as (
  select *
  from (
    values
      ('Chat Message Suggested Reply', 1, 'message', 'Suggested Reply'),
      ('Returning Subscriber Re-engagement', 1, 'message', 'Welcome back. I am glad to see you here again.'),
      ('Expiring Subscriber Retention Offer', 1, 'message', 'Suggested Reply: I would love to keep you around. Want me to set aside something special for your renewal?'),
      ('Tip Received Thank You', 1, 'message', 'Thank you for the tip. I really appreciate it.')
  ) as step_template(script_name, step_order, step_type, message_body)
)
insert into public.of_message_script_steps (
  script_id,
  step_order,
  step_type,
  message_body,
  delay_minutes
)
select
  scripts.id,
  steps.step_order,
  steps.step_type,
  steps.message_body,
  0
from scripts
join steps on steps.script_name = scripts.name
on conflict do nothing;
