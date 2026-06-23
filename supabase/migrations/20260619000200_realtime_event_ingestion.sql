alter table public.of_events
add column if not exists provider text not null default 'betterfans',
add column if not exists provider_event_id text,
add column if not exists received_at timestamptz not null default now(),
add column if not exists processed_at timestamptz,
add column if not exists processing_status text not null default 'processed',
add column if not exists processing_error text;

alter table public.of_events
drop constraint if exists of_events_processing_status_check;

alter table public.of_events
add constraint of_events_processing_status_check
check (processing_status in ('received', 'processed', 'failed'));

create unique index if not exists of_events_provider_event_id_key
on public.of_events (provider, provider_event_id)
where provider_event_id is not null;

create index if not exists of_events_provider_type_idx
on public.of_events (provider, event_type);

create index if not exists of_events_processing_status_idx
on public.of_events (processing_status, received_at desc);
