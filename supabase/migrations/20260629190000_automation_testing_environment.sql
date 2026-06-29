create table if not exists public.of_simulated_subscribers (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  name text not null,
  username text not null,
  subscription_status text not null default 'active',
  renewal_state text not null default 'current',
  spend_level text not null default 'medium',
  lifetime_value numeric(12,2) not null default 0,
  message_history_summary text,
  custom_variables jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint of_simulated_subscribers_creator_username_key unique (creator_id, username)
);

create trigger set_of_simulated_subscribers_updated_at
before update on public.of_simulated_subscribers
for each row execute function public.set_updated_at();

create table if not exists public.of_automation_simulations (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  script_id uuid references public.of_message_scripts(id) on delete set null,
  scenario_id uuid references public.of_creator_automation_scenarios(id) on delete set null,
  simulated_subscriber_id uuid references public.of_simulated_subscribers(id) on delete set null,
  conversation_instance_id uuid references public.of_conversation_instances(id) on delete set null,
  automation_run_id uuid references public.of_automation_runs(id) on delete set null,
  source_event_id uuid references public.of_events(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'running', 'paused', 'completed', 'cancelled', 'failed')),
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  initial_variables jsonb not null default '{}'::jsonb,
  runtime_state jsonb not null default '{}'::jsonb,
  failure_plan jsonb not null default '{}'::jsonb,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_of_automation_simulations_updated_at
before update on public.of_automation_simulations
for each row execute function public.set_updated_at();

alter table public.of_events
add column if not exists execution_mode text not null default 'production',
add column if not exists simulation_run_id uuid references public.of_automation_simulations(id) on delete set null,
add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.of_events
drop constraint if exists of_events_execution_mode_check;

alter table public.of_events
add constraint of_events_execution_mode_check
check (execution_mode in ('production', 'simulation'));

alter table public.of_automation_runs
add column if not exists execution_mode text not null default 'production',
add column if not exists simulation_run_id uuid references public.of_automation_simulations(id) on delete set null,
add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.of_automation_runs
drop constraint if exists of_automation_runs_execution_mode_check;

alter table public.of_automation_runs
add constraint of_automation_runs_execution_mode_check
check (execution_mode in ('production', 'simulation'));

alter table public.of_conversation_instances
add column if not exists execution_mode text not null default 'production',
add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.of_conversation_instances
drop constraint if exists of_conversation_instances_execution_mode_check;

alter table public.of_conversation_instances
add constraint of_conversation_instances_execution_mode_check
check (execution_mode in ('production', 'simulation'));

alter table public.of_outbound_messages
add column if not exists execution_mode text not null default 'production',
add column if not exists simulation_run_id uuid references public.of_automation_simulations(id) on delete set null,
add column if not exists destination text,
add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.of_outbound_messages
drop constraint if exists of_outbound_messages_execution_mode_check;

alter table public.of_outbound_messages
add constraint of_outbound_messages_execution_mode_check
check (execution_mode in ('production', 'simulation'));

create index if not exists of_simulated_subscribers_creator_updated_idx
on public.of_simulated_subscribers (creator_id, updated_at desc);

create index if not exists of_automation_simulations_creator_status_idx
on public.of_automation_simulations (creator_id, status, updated_at desc);

create index if not exists of_automation_simulations_conversation_idx
on public.of_automation_simulations (conversation_instance_id);

create index if not exists of_events_execution_mode_received_idx
on public.of_events (execution_mode, received_at desc);

create index if not exists of_automation_runs_execution_mode_started_idx
on public.of_automation_runs (execution_mode, started_at desc);

create index if not exists of_conversation_instances_execution_mode_updated_idx
on public.of_conversation_instances (execution_mode, updated_at desc);

create index if not exists of_outbound_messages_execution_mode_created_idx
on public.of_outbound_messages (execution_mode, created_at desc);

alter table public.of_simulated_subscribers enable row level security;
alter table public.of_automation_simulations enable row level security;

grant select, insert, update, delete on public.of_simulated_subscribers to authenticated;
grant select, insert, update, delete on public.of_automation_simulations to authenticated;
grant select, insert, update, delete on public.of_simulated_subscribers to service_role;
grant select, insert, update, delete on public.of_automation_simulations to service_role;

create policy "agency users can manage simulated subscribers"
on public.of_simulated_subscribers for all to authenticated using (true) with check (true);

create policy "agency users can manage automation simulations"
on public.of_automation_simulations for all to authenticated using (true) with check (true);
