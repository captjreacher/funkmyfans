alter table public.of_outbound_messages
add column if not exists provider_message_id text,
add column if not exists failed_at timestamptz,
add column if not exists failure_reason text,
add column if not exists generated_text text;

update public.of_outbound_messages
set
  generated_text = coalesce(generated_text, draft_text, message_body),
  final_text = coalesce(final_text, case when status = 'sent' then message_body else null end),
  failure_reason = coalesce(failure_reason, error_message),
  failed_at = case
    when status = 'failed' and failed_at is null then created_at
    else failed_at
  end
where generated_text is null
  or final_text is null
  or failure_reason is null
  or (status = 'failed' and failed_at is null);

update public.of_outbound_messages
set status = 'rejected'
where status = 'skipped'
  and approval_status = 'rejected';

alter table public.of_outbound_messages
drop constraint if exists of_outbound_messages_status_check;

alter table public.of_outbound_messages
add constraint of_outbound_messages_status_check
check (status in ('pending_approval', 'queued', 'sending', 'sent', 'failed', 'rejected'));

create index if not exists of_outbound_messages_provider_message_idx
on public.of_outbound_messages (provider_message_id)
where provider_message_id is not null;

create index if not exists of_outbound_messages_status_created_idx
on public.of_outbound_messages (status, created_at desc);

grant select on public.of_outbound_messages to authenticated;
grant select, insert, update, delete on public.of_outbound_messages to service_role;

update public.of_message_scripts
set
  status = 'active',
  action_mode = 'auto_send',
  auto_send_enabled = true,
  requires_approval = false,
  cooldown_hours = 24,
  max_sends_per_fan = 1
where trigger_event_type = 'subscriber_created'
  and name = 'New Subscriber Welcome';

update public.of_message_script_steps
set
  step_type = 'message',
  message_body = $$Hey babe 😘
Thanks for subscribing. I'm glad you're here.
Tell me — are you more into cute, teasing, or naughty surprises?$$,
  delay_minutes = 0,
  condition_key = null,
  condition_value = null,
  next_step_id = null,
  fallback_step_id = null
where script_id in (
    select id
    from public.of_message_scripts
    where trigger_event_type = 'subscriber_created'
      and name = 'New Subscriber Welcome'
  )
  and step_order = 1;
