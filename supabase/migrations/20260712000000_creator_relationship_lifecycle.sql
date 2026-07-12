-- FYV -> FMF Creator Intelligence Package handoff: creator RELATIONSHIP lifecycle.
--
-- Additive + reversible. Adds a nullable relationship_state (+ a changed-at
-- timestamp) to the EXISTING canonical creator model (of_creators). It is
-- deliberately SEPARATE from status (platform connection health) and
-- onboarding_status (setup/sync): this is the FMF relationship arc
--   invited -> accepted -> active -> paused -> offboarded
--
-- Nullable so every existing creator is unaffected (no lifecycle until one is
-- set). No new creator identity system and no new package table: the FYV package
-- REFERENCE lives in of_creators.metadata.fyv_package, and full received-package
-- provenance stays in creator_intelligence_snapshots (unchanged).
--
-- Reversible (down):
--   drop index if exists public.of_creators_relationship_state_idx;
--   alter table public.of_creators drop constraint if exists of_creators_relationship_state_check;
--   alter table public.of_creators drop column if exists relationship_state_changed_at;
--   alter table public.of_creators drop column if exists relationship_state;

alter table public.of_creators
  add column if not exists relationship_state text,
  add column if not exists relationship_state_changed_at timestamptz;

alter table public.of_creators
  drop constraint if exists of_creators_relationship_state_check;

alter table public.of_creators
  add constraint of_creators_relationship_state_check
  check (
    relationship_state is null
    or relationship_state in ('invited', 'accepted', 'active', 'paused', 'offboarded')
  );

-- Partial index: only creators that have entered the relationship lifecycle.
create index if not exists of_creators_relationship_state_idx
  on public.of_creators (relationship_state)
  where relationship_state is not null;
