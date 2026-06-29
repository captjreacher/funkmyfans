create table if not exists public.of_conversation_instances (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  subscriber_id uuid references public.of_subscribers(id) on delete set null,
  relationship_id uuid references public.of_subscriber_relationships(id) on delete set null,
  script_id uuid not null references public.of_message_scripts(id) on delete cascade,
  source_script_id uuid references public.of_message_scripts(id) on delete set null,
  script_version integer not null default 1 check (script_version >= 1),
  automation_run_id uuid references public.of_automation_runs(id) on delete set null,
  originating_event_id uuid references public.of_events(id) on delete set null,
  last_event_id uuid references public.of_events(id) on delete set null,
  current_step_id uuid references public.of_message_script_steps(id) on delete set null,
  next_step_id uuid references public.of_message_script_steps(id) on delete set null,
  status text not null default 'running' check (status in ('running', 'waiting_delay', 'waiting_reply', 'waiting_approval', 'completed', 'cancelled', 'failed')),
  variables jsonb not null default '{}'::jsonb,
  retry_count integer not null default 0 check (retry_count >= 0),
  waiting_until timestamptz,
  waiting_reason text,
  cancellation_reason text,
  completion_reason text,
  last_error text,
  processing_started_at timestamptz,
  last_resumed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.of_conversation_history (
  id uuid primary key default gen_random_uuid(),
  conversation_instance_id uuid not null references public.of_conversation_instances(id) on delete cascade,
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  event_id uuid references public.of_events(id) on delete set null,
  step_id uuid references public.of_message_script_steps(id) on delete set null,
  transition_key text not null,
  event_type text not null,
  from_status text,
  to_status text,
  detail text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.of_outbound_messages
add column if not exists conversation_instance_id uuid references public.of_conversation_instances(id) on delete set null,
add column if not exists script_step_id uuid references public.of_message_script_steps(id) on delete set null;

create trigger set_of_conversation_instances_updated_at
before update on public.of_conversation_instances
for each row execute function public.set_updated_at();

create unique index if not exists of_conversation_instances_script_event_key
on public.of_conversation_instances (script_id, originating_event_id)
where originating_event_id is not null;

create index if not exists of_conversation_instances_creator_status_idx
on public.of_conversation_instances (creator_id, status, updated_at desc);

create index if not exists of_conversation_instances_waiting_idx
on public.of_conversation_instances (status, waiting_until)
where status in ('waiting_delay', 'running');

create index if not exists of_conversation_instances_reply_idx
on public.of_conversation_instances (creator_id, subscriber_id, status, updated_at desc)
where status = 'waiting_reply';

create unique index if not exists of_conversation_history_transition_key
on public.of_conversation_history (conversation_instance_id, transition_key);

create index if not exists of_conversation_history_conversation_created_idx
on public.of_conversation_history (conversation_instance_id, created_at desc);

create unique index if not exists of_outbound_messages_conversation_step_key
on public.of_outbound_messages (conversation_instance_id, script_step_id)
where conversation_instance_id is not null and script_step_id is not null;

alter table public.of_conversation_instances enable row level security;
alter table public.of_conversation_history enable row level security;

grant select, insert, update, delete on public.of_conversation_instances to authenticated;
grant select on public.of_conversation_history to authenticated;
grant select, insert, update, delete on public.of_conversation_instances to service_role;
grant select, insert, update, delete on public.of_conversation_history to service_role;

create policy "agency users can manage conversation instances"
on public.of_conversation_instances for all to authenticated using (true) with check (true);

create policy "agency users can read conversation history"
on public.of_conversation_history for select to authenticated using (true);
