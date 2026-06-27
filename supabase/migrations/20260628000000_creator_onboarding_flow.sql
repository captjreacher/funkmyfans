alter table public.of_creators
add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.of_creators
drop constraint if exists of_creators_status_check;

alter table public.of_creators
add constraint of_creators_status_check
check (status in ('pending', 'connected', 'attention', 'paused', 'disconnected'));

alter table public.of_creators
drop constraint if exists of_creators_onboarding_status_check;

alter table public.of_creators
add constraint of_creators_onboarding_status_check
check (onboarding_status in ('draft', 'pending', 'connected', 'syncing', 'ready', 'needs_attention'));

alter table public.of_creators
alter column status set default 'pending';

alter table public.of_creators
alter column onboarding_status set default 'draft';
