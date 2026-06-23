create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.of_creators (
  id uuid primary key default gen_random_uuid(),
  platform_provider text not null default 'betterfans',
  betterfans_account_id text unique,
  username text not null,
  display_name text,
  bio text,
  location text,
  status text not null default 'connected' check (status in ('connected', 'attention', 'paused', 'disconnected')),
  onboarding_status text not null default 'connected' check (onboarding_status in ('connected', 'syncing', 'ready', 'needs_attention')),
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint of_creators_platform_provider_check check (platform_provider in ('betterfans', 'onlyfans', 'fansly', 'other')),
  constraint of_creators_betterfans_required check (platform_provider <> 'betterfans' or betterfans_account_id is not null)
);

create trigger set_of_creators_updated_at
before update on public.of_creators
for each row execute function public.set_updated_at();

create table public.of_creator_snapshots (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  snapshot_date date not null,
  subscribers_count integer not null default 0 check (subscribers_count >= 0),
  active_subscribers integer not null default 0 check (active_subscribers >= 0),
  expired_subscribers integer not null default 0 check (expired_subscribers >= 0),
  revenue numeric(12, 2) not null default 0,
  chat_count integer not null default 0 check (chat_count >= 0),
  priority_chat_count integer not null default 0 check (priority_chat_count >= 0),
  posts_count integer not null default 0 check (posts_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, snapshot_date)
);

create trigger set_of_creator_snapshots_updated_at
before update on public.of_creator_snapshots
for each row execute function public.set_updated_at();

create table public.of_subscribers (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  platform_subscriber_id text not null,
  username text,
  display_name text,
  subscription_status text,
  renews_at timestamptz,
  expires_at timestamptz,
  total_spend numeric(12, 2),
  raw_payload jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, platform_subscriber_id)
);

create trigger set_of_subscribers_updated_at
before update on public.of_subscribers
for each row execute function public.set_updated_at();

create table public.of_chats (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  platform_chat_id text not null,
  platform_user_id text,
  last_message_at timestamptz,
  unread boolean not null default false,
  priority boolean not null default false,
  raw_payload jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, platform_chat_id)
);

create trigger set_of_chats_updated_at
before update on public.of_chats
for each row execute function public.set_updated_at();

create table public.of_events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.of_tasks (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  task_type text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'dismissed')),
  title text not null,
  description text,
  source text not null default 'rules_engine' check (source in ('sync', 'event', 'operator', 'rules_engine')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint of_tasks_completed_status_check check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed')
  )
);

create table public.of_recommendations (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  recommendation_type text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  title text not null,
  rationale text not null,
  source_data jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'accepted', 'dismissed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_of_recommendations_updated_at
before update on public.of_recommendations
for each row execute function public.set_updated_at();

create table public.creator_profile_links (
  id uuid primary key default gen_random_uuid(),
  creator_profile_id uuid not null,
  of_creator_id uuid not null references public.of_creators(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_profile_id),
  unique (of_creator_id)
);

create trigger set_creator_profile_links_updated_at
before update on public.creator_profile_links
for each row execute function public.set_updated_at();

create index of_creator_snapshots_creator_date_idx on public.of_creator_snapshots (creator_id, snapshot_date desc);
create index of_events_creator_created_idx on public.of_events (creator_id, created_at desc);
create index of_tasks_creator_status_priority_idx on public.of_tasks (creator_id, status, priority);
create index of_recommendations_creator_status_idx on public.of_recommendations (creator_id, status);
create index of_subscribers_creator_status_idx on public.of_subscribers (creator_id, subscription_status);
create index of_chats_creator_workload_idx on public.of_chats (creator_id, priority desc, unread desc, last_message_at desc);

alter table public.of_creators enable row level security;
alter table public.of_creator_snapshots enable row level security;
alter table public.of_subscribers enable row level security;
alter table public.of_chats enable row level security;
alter table public.of_events enable row level security;
alter table public.of_tasks enable row level security;
alter table public.of_recommendations enable row level security;
alter table public.creator_profile_links enable row level security;

grant select on public.of_creators to authenticated;
grant select on public.of_creator_snapshots to authenticated;
grant select on public.of_subscribers to authenticated;
grant select on public.of_chats to authenticated;
grant select on public.of_events to authenticated;
grant select, insert, update on public.of_tasks to authenticated;
grant select, insert, update on public.of_recommendations to authenticated;
grant select on public.creator_profile_links to authenticated;

grant select, insert, update, delete on public.of_creators to service_role;
grant select, insert, update, delete on public.of_creator_snapshots to service_role;
grant select, insert, update, delete on public.of_subscribers to service_role;
grant select, insert, update, delete on public.of_chats to service_role;
grant select, insert, update, delete on public.of_events to service_role;
grant select, insert, update, delete on public.of_tasks to service_role;
grant select, insert, update, delete on public.of_recommendations to service_role;
grant select, insert, update, delete on public.creator_profile_links to service_role;

create policy "agency users can read creators"
on public.of_creators for select to authenticated using (true);

create policy "agency users can read snapshots"
on public.of_creator_snapshots for select to authenticated using (true);

create policy "agency users can read subscribers"
on public.of_subscribers for select to authenticated using (true);

create policy "agency users can read chats"
on public.of_chats for select to authenticated using (true);

create policy "agency users can read events"
on public.of_events for select to authenticated using (true);

create policy "agency users can manage workflow tasks"
on public.of_tasks for all to authenticated using (true) with check (true);

create policy "agency users can manage recommendations"
on public.of_recommendations for all to authenticated using (true) with check (true);

create policy "agency users can read ikigai links"
on public.creator_profile_links for select to authenticated using (true);
