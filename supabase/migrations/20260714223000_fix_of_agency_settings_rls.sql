begin;

alter table public.of_agency_settings enable row level security;

drop policy if exists "super admins can read agency settings"
on public.of_agency_settings;

drop policy if exists "super admins can create agency settings"
on public.of_agency_settings;

drop policy if exists "super admins can update agency settings"
on public.of_agency_settings;

create policy "super admins can read agency settings"
on public.of_agency_settings
for select
to authenticated
using (
  public.is_super_admin()
);

create policy "super admins can create agency settings"
on public.of_agency_settings
for insert
to authenticated
with check (
  public.is_super_admin()
);

create policy "super admins can update agency settings"
on public.of_agency_settings
for update
to authenticated
using (
  public.is_super_admin()
)
with check (
  public.is_super_admin()
);

commit;
