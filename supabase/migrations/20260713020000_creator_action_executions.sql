-- FMF-4: Operational Action Dispatcher — append-only action-execution ledger.
--
-- Records one row per (readiness_event, action_type) — enforcing "one execution
-- per readiness event + action" via a UNIQUE constraint. Handlers transition
-- rows from pending -> processing -> completed | failed. Retry is a manual
-- replay against the failed row (future); MVP records the error + result.
--
-- Reversible (down):
--   drop trigger if exists set_creator_action_executions_updated_at on public.creator_action_executions;
--   drop policy if exists "agency users can read creator action executions"
--     on public.creator_action_executions;
--   drop index if exists public.creator_action_executions_creator_time_idx;
--   drop table if exists public.creator_action_executions;

create table public.creator_action_executions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  readiness_event_id uuid not null references public.creator_readiness_events(id) on delete cascade,
  action_type text not null check (
    action_type in (
      'queue_default_journey_activation',
      'enable_operational_automations',
      'pause_creator_automations',
      'refresh_readiness'
    )
  ),
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'completed', 'failed')
  ),
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  result jsonb not null default '{}'::jsonb,
  trigger_event text,
  milestone text,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Idempotency: one execution per (readiness event, action type). A replay of
  -- the same event yields the same row (23505 -> deduped) rather than a second
  -- execution.
  constraint creator_action_executions_unique_per_event
    unique (readiness_event_id, action_type)
);

create trigger set_creator_action_executions_updated_at
before update on public.creator_action_executions
for each row execute function public.set_updated_at();

create index creator_action_executions_creator_time_idx
  on public.creator_action_executions (creator_id, created_at desc);

create index creator_action_executions_status_idx
  on public.creator_action_executions (status, queued_at);

alter table public.creator_action_executions enable row level security;

grant select on public.creator_action_executions to authenticated;
grant select, insert, update, delete on public.creator_action_executions to service_role;

create policy "agency users can read creator action executions"
  on public.creator_action_executions for select
  to authenticated using (true);
