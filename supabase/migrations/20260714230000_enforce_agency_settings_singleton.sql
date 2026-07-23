begin;

alter table public.of_agency_settings
add column if not exists singleton_key boolean not null default true;

create unique index if not exists of_agency_settings_singleton_key_idx
on public.of_agency_settings (singleton_key);

commit;
