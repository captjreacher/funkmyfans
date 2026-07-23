drop index if exists public.of_sync_runs_one_active_sync_all_idx;

create unique index of_sync_runs_one_active_sync_all_idx
  on public.of_sync_runs (creator_id)
  where sync_type = 'all'
    and status = 'running';