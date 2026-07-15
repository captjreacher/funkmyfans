alter table public.of_sync_runs
  add column if not exists provider text default 'betterfans',
  add column if not exists current_stage text,
  add column if not exists cursor integer,
  add column if not exists processed_count integer,
  add column if not exists has_more boolean,
  add column if not exists retry_count integer not null default 0,
  add column if not exists last_error text,
  add column if not exists last_error_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.of_sync_runs
set
  provider = coalesce(provider, 'betterfans'),
  processed_count = coalesce(processed_count, 0),
  has_more = coalesce(has_more, false),
  retry_count = coalesce(retry_count, 0),
  updated_at = coalesce(updated_at, started_at, now())
where provider is null
   or processed_count is null
   or has_more is null
   or retry_count is null
   or updated_at is null;

with ranked_active_runs as (
  select
    id,
    row_number() over (
      partition by creator_id
      order by started_at desc, id desc
    ) as active_rank
  from public.of_sync_runs
  where status = 'running'
    and sync_type = 'all'
)
update public.of_sync_runs as runs
set
  status = 'failed',
  completed_at = coalesce(runs.completed_at, now()),
  last_error = coalesce(
    runs.last_error,
    'Closed during migration: duplicate active sync-all run'
  ),
  last_error_at = coalesce(runs.last_error_at, now()),
  updated_at = now()
from ranked_active_runs
where runs.id = ranked_active_runs.id
  and ranked_active_runs.active_rank > 1;

create index if not exists of_sync_runs_creator_status_started_idx
  on public.of_sync_runs (
    creator_id,
    sync_type,
    status,
    started_at desc
  );

create unique index if not exists of_sync_runs_one_active_sync_all_idx
  on public.of_sync_runs (creator_id)
  where sync_type = 'all'
    and status = 'running';