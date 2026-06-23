alter table public.of_creator_snapshots
drop constraint if exists of_creator_snapshots_creator_id_snapshot_date_key;

alter table public.of_subscribers
add column if not exists betterfans_subscriber_id text,
add column if not exists status text,
add column if not exists renewal_date timestamptz,
add column if not exists last_seen_at timestamptz;

update public.of_subscribers
set
  betterfans_subscriber_id = coalesce(betterfans_subscriber_id, platform_subscriber_id),
  status = coalesce(status, subscription_status),
  renewal_date = coalesce(renewal_date, renews_at)
where betterfans_subscriber_id is null
   or status is null
   or renewal_date is null;

alter table public.of_subscribers
alter column betterfans_subscriber_id set not null;

alter table public.of_subscribers
drop constraint if exists of_subscribers_creator_id_platform_subscriber_id_key;

alter table public.of_subscribers
add constraint of_subscribers_creator_id_betterfans_subscriber_id_key
unique (creator_id, betterfans_subscriber_id);

create index if not exists of_subscribers_creator_status_v2_idx
on public.of_subscribers (creator_id, status);

create index if not exists of_subscribers_creator_last_seen_idx
on public.of_subscribers (creator_id, last_seen_at desc);

alter table public.of_chats
add column if not exists fan_username text,
add column if not exists fan_display_name text,
add column if not exists last_activity_at timestamptz,
add column if not exists unread_count integer not null default 0 check (unread_count >= 0);

update public.of_chats
set last_activity_at = coalesce(last_activity_at, last_message_at)
where last_activity_at is null;

create index if not exists of_chats_creator_activity_idx
on public.of_chats (creator_id, last_activity_at desc);

create table if not exists public.of_sync_runs (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  sync_type text not null check (sync_type in ('profile', 'stats', 'subscribers', 'chats', 'all')),
  status text not null default 'running' check (status in ('running', 'success', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  records_processed integer not null default 0 check (records_processed >= 0),
  error_message text
);

create index if not exists of_sync_runs_creator_started_idx
on public.of_sync_runs (creator_id, started_at desc);

alter table public.of_sync_runs enable row level security;

grant select on public.of_sync_runs to authenticated;
grant select, insert, update, delete on public.of_sync_runs to service_role;

drop policy if exists "agency users can read sync runs" on public.of_sync_runs;
create policy "agency users can read sync runs"
on public.of_sync_runs for select to authenticated using (true);
