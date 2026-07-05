create table public.creator_intelligence_snapshots (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  source_product text not null,
  contract_version text not null,
  intelligence_version text not null,
  source_package_reference text not null,
  source_assessment_reference text not null,
  package_payload jsonb not null,
  imported_at timestamptz not null default now(),
  superseded_at timestamptz,
  unique (creator_id, source_package_reference)
);

create table public.creator_intelligence_opportunity_projections (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  intelligence_snapshot_id uuid not null references public.creator_intelligence_snapshots(id) on delete cascade,
  source_opportunity_reference text not null,
  source_scenario_reference text,
  journey_type text not null,
  opportunity_type text not null,
  title text not null,
  rationale text not null,
  confidence integer not null default 0 check (confidence >= 0 and confidence <= 100),
  priority integer not null default 0 check (priority >= 0 and priority <= 100),
  projection_state text not null default 'available' check (projection_state in ('available', 'accepted', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (intelligence_snapshot_id, source_opportunity_reference)
);

create or replace function public.set_creator_intelligence_opportunity_projections_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_creator_intelligence_snapshot_mutation()
returns trigger
language plpgsql
as $$
begin
  if (to_jsonb(new) - 'superseded_at') is distinct from (to_jsonb(old) - 'superseded_at') then
    raise exception 'creator_intelligence_snapshots are immutable except for superseded_at';
  end if;

  return new;
end;
$$;

create trigger set_creator_intelligence_opportunity_projections_updated_at
before update on public.creator_intelligence_opportunity_projections
for each row execute function public.set_creator_intelligence_opportunity_projections_updated_at();

create trigger prevent_creator_intelligence_snapshot_mutation
before update on public.creator_intelligence_snapshots
for each row execute function public.prevent_creator_intelligence_snapshot_mutation();

create index creator_intelligence_snapshots_creator_imported_idx
on public.creator_intelligence_snapshots (creator_id, imported_at desc);

create index creator_intelligence_opportunity_projections_creator_state_idx
on public.creator_intelligence_opportunity_projections (creator_id, projection_state, priority asc, created_at desc);

create index creator_intelligence_opportunity_projections_snapshot_idx
on public.creator_intelligence_opportunity_projections (intelligence_snapshot_id, created_at desc);

alter table public.creator_intelligence_snapshots enable row level security;
alter table public.creator_intelligence_opportunity_projections enable row level security;

grant select on public.creator_intelligence_snapshots to authenticated;
grant select on public.creator_intelligence_opportunity_projections to authenticated;

grant select, insert, update, delete on public.creator_intelligence_snapshots to service_role;
grant select, insert, update, delete on public.creator_intelligence_opportunity_projections to service_role;

create policy "agency users can read creator intelligence snapshots"
on public.creator_intelligence_snapshots for select to authenticated using (true);

create policy "agency users can read creator intelligence opportunities"
on public.creator_intelligence_opportunity_projections for select to authenticated using (true);

