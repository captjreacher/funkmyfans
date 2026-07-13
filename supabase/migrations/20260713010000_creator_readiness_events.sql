-- FMF-3: Creator Readiness Orchestrator — append-only readiness history.
--
-- Persists every meaningful readiness transition as an event. Replay-safe:
-- milestone-reached events are one-shot per (creator, milestone) via a partial
-- unique index; readiness_changed / regressed / blocked / unblocked events are
-- transition-triggered so cannot dup for the same delta.
--
-- Read-only from the API surface (GET /api/creators/:id/readiness/history).
-- No new relationship state, no new operational stores. Reuses of_creators
-- exclusively for FK cascade; the FMF-1 relationship table and FMF-2 pure
-- calculator remain the source of truth for state.
--
-- Reversible (down):
--   drop index if exists public.creator_readiness_events_milestone_once_idx;
--   drop index if exists public.creator_readiness_events_creator_time_idx;
--   drop table if exists public.creator_readiness_events;

create table public.creator_readiness_events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'creator_readiness_changed',
      'creator_reached_infrastructure',
      'creator_reached_intelligence',
      'creator_reached_creator_ready',
      'creator_reached_operational',
      'creator_reached_production',
      'creator_regressed',
      'creator_blocked',
      'creator_unblocked'
    )
  ),
  previous_score integer,
  new_score integer not null check (new_score >= 0 and new_score <= 100),
  previous_status text,
  new_status text not null,
  previous_milestone text,
  new_milestone text not null check (
    new_milestone in (
      'discovery',
      'infrastructure_ready',
      'intelligence_ready',
      'creator_ready',
      'operational',
      'production_ready'
    )
  ),
  trigger_event text,
  blocking_issues text[] not null default array[]::text[],
  warnings text[] not null default array[]::text[],
  actions jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Milestone "reached" events fire ONCE per creator+milestone. Partial unique
-- index scopes uniqueness to the milestone-reached family so
-- creator_readiness_changed / regressed / blocked / unblocked are unaffected.
create unique index creator_readiness_events_milestone_once_idx
  on public.creator_readiness_events (creator_id, event_type, new_milestone)
  where event_type in (
    'creator_reached_infrastructure',
    'creator_reached_intelligence',
    'creator_reached_creator_ready',
    'creator_reached_operational',
    'creator_reached_production'
  );

create index creator_readiness_events_creator_time_idx
  on public.creator_readiness_events (creator_id, created_at desc);

alter table public.creator_readiness_events enable row level security;

grant select on public.creator_readiness_events to authenticated;
grant select, insert, update, delete on public.creator_readiness_events to service_role;

create policy "agency users can read creator readiness events"
  on public.creator_readiness_events for select
  to authenticated using (true);
