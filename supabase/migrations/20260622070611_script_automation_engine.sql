create table public.of_message_scripts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  name text not null,
  trigger_event_type text not null,
  status text not null default 'inactive' check (status in ('active', 'inactive')),
  auto_send_enabled boolean not null default false,
  requires_approval boolean not null default true,
  cooldown_hours integer not null default 24 check (cooldown_hours >= 0),
  max_sends_per_fan integer not null default 1 check (max_sends_per_fan >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_of_message_scripts_updated_at
before update on public.of_message_scripts
for each row execute function public.set_updated_at();

create table public.of_message_script_steps (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.of_message_scripts(id) on delete cascade,
  step_order integer not null check (step_order >= 0),
  step_type text not null check (step_type in ('message', 'follow_up', 'question', 'branch', 'end')),
  message_body text,
  delay_minutes integer check (delay_minutes is null or delay_minutes >= 0),
  condition_key text,
  condition_value text,
  next_step_id uuid references public.of_message_script_steps(id) on delete set null,
  fallback_step_id uuid references public.of_message_script_steps(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint of_message_script_steps_message_body_check check (
    step_type in ('branch', 'end') or nullif(trim(message_body), '') is not null
  )
);

create trigger set_of_message_script_steps_updated_at
before update on public.of_message_script_steps
for each row execute function public.set_updated_at();

create table public.of_automation_runs (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  script_id uuid not null references public.of_message_scripts(id) on delete cascade,
  fan_id text not null,
  source_event_id uuid references public.of_events(id) on delete set null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed', 'skipped')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text
);

create table public.of_outbound_messages (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  fan_id text not null,
  script_id uuid references public.of_message_scripts(id) on delete set null,
  automation_run_id uuid references public.of_automation_runs(id) on delete set null,
  message_body text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  approval_status text not null default 'pending' check (approval_status in ('not_required', 'pending', 'approved', 'rejected')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create unique index of_message_scripts_creator_name_key
on public.of_message_scripts (creator_id, lower(name));

create index of_message_scripts_creator_trigger_idx
on public.of_message_scripts (creator_id, trigger_event_type, status);

create unique index of_message_script_steps_order_key
on public.of_message_script_steps (script_id, step_order);

create index of_automation_runs_creator_started_idx
on public.of_automation_runs (creator_id, started_at desc);

create unique index of_automation_runs_script_event_key
on public.of_automation_runs (script_id, source_event_id)
where source_event_id is not null;

create index of_automation_runs_script_fan_idx
on public.of_automation_runs (script_id, fan_id, started_at desc);

create index of_outbound_messages_creator_created_idx
on public.of_outbound_messages (creator_id, created_at desc);

create index of_outbound_messages_script_fan_idx
on public.of_outbound_messages (script_id, fan_id, created_at desc);

alter table public.of_message_scripts enable row level security;
alter table public.of_message_script_steps enable row level security;
alter table public.of_automation_runs enable row level security;
alter table public.of_outbound_messages enable row level security;

grant select, insert, update, delete on public.of_message_scripts to authenticated;
grant select, insert, update, delete on public.of_message_script_steps to authenticated;
grant select on public.of_automation_runs to authenticated;
grant select on public.of_outbound_messages to authenticated;

grant select, insert, update, delete on public.of_message_scripts to service_role;
grant select, insert, update, delete on public.of_message_script_steps to service_role;
grant select, insert, update, delete on public.of_automation_runs to service_role;
grant select, insert, update, delete on public.of_outbound_messages to service_role;

create policy "agency users can manage message scripts"
on public.of_message_scripts for all to authenticated using (true) with check (true);

create policy "agency users can manage message script steps"
on public.of_message_script_steps for all to authenticated using (true) with check (true);

create policy "agency users can read automation runs"
on public.of_automation_runs for select to authenticated using (true);

create policy "agency users can read outbound messages"
on public.of_outbound_messages for select to authenticated using (true);

with created_scripts as (
  insert into public.of_message_scripts (
    creator_id,
    name,
    trigger_event_type,
    status,
    auto_send_enabled,
    requires_approval,
    cooldown_hours,
    max_sends_per_fan
  )
  select
    creator.id,
    'New Subscriber Welcome',
    'subscriber_created',
    'inactive',
    false,
    true,
    24,
    1
  from public.of_creators creator
  on conflict do nothing
  returning id
),
seed_steps as (
  select *
  from (
    values
      (1, 'message', 'Welcome, and thanks for subscribing. I am glad you are here.', 0, null, null),
      (2, 'question', 'What kind of updates would you most like to see here?', 0, null, null),
      (3, 'follow_up', 'Just checking in. If you have a preference, send it through and I will keep it in mind.', 1440, null, null),
      (4, 'follow_up', 'One more quick note from me. You can reply any time with what you want more of.', 2880, null, null),
      (5, 'end', null, null, 'no_reply_action', 'none')
  ) as step_template(step_order, step_type, message_body, delay_minutes, condition_key, condition_value)
)
insert into public.of_message_script_steps (
  script_id,
  step_order,
  step_type,
  message_body,
  delay_minutes,
  condition_key,
  condition_value
)
select
  created_scripts.id,
  seed_steps.step_order,
  seed_steps.step_type,
  seed_steps.message_body,
  seed_steps.delay_minutes,
  seed_steps.condition_key,
  seed_steps.condition_value
from created_scripts
cross join seed_steps;
