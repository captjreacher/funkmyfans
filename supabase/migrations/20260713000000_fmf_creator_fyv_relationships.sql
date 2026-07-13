-- FMF-1: Creator Relationship Controller — FMF-owned model of the FMF↔FYV creator link.
--
-- FMF (Creator Cockpit) is the source of truth for agency creator management,
-- creator invitation workflows, and creator operational relationship state.
-- FYV owns assessments, reports, intelligence generation, and the actual invite
-- delivery (email/token/creator-facing surface). This table is FMF's local view
-- of that relationship; it does NOT copy or duplicate FYV intelligence content.
--
-- One row per FMF creator (unique fmf_creator_id): a single FMF creator has at
-- most one FYV account link. FYV creator id is text (opaque external id, not a
-- UUID) and nullable so a row can exist in `pending` before the FYV account is
-- provisioned.
--
-- Additive + reversible. No existing tables changed.
--
-- Reversible (down):
--   drop trigger if exists set_fmf_creator_fyv_relationships_updated_at on public.fmf_creator_fyv_relationships;
--   drop policy if exists "agency users can read fmf creator fyv relationships"
--     on public.fmf_creator_fyv_relationships;
--   drop table if exists public.fmf_creator_fyv_relationships;

create table public.fmf_creator_fyv_relationships (
  id uuid primary key default gen_random_uuid(),
  fmf_creator_id uuid not null unique references public.of_creators(id) on delete cascade,
  fyv_creator_id text,
  relationship_state text not null default 'pending'
    check (relationship_state in ('pending', 'invited', 'accepted', 'active')),
  invited_at timestamptz,
  accepted_at timestamptz,
  activated_at timestamptz,
  state_changed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reuse the existing set_updated_at() function (migration 20260618184143).
create trigger set_fmf_creator_fyv_relationships_updated_at
before update on public.fmf_creator_fyv_relationships
for each row execute function public.set_updated_at();

-- Partial index for the by-FYV-id lookup (event consumer's fallback path).
create index if not exists fmf_creator_fyv_relationships_fyv_id_idx
  on public.fmf_creator_fyv_relationships (fyv_creator_id)
  where fyv_creator_id is not null;

-- Index on state for status filters/reports.
create index if not exists fmf_creator_fyv_relationships_state_idx
  on public.fmf_creator_fyv_relationships (relationship_state);

alter table public.fmf_creator_fyv_relationships enable row level security;

grant select on public.fmf_creator_fyv_relationships to authenticated;
grant select, insert, update, delete on public.fmf_creator_fyv_relationships to service_role;

create policy "agency users can read fmf creator fyv relationships"
  on public.fmf_creator_fyv_relationships for select
  to authenticated using (true);
