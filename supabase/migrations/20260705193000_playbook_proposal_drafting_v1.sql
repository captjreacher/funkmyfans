create table if not exists public.creator_playbook_proposals (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  intelligence_snapshot_id uuid not null references public.creator_intelligence_snapshots(id) on delete cascade,
  creator_intelligence_opportunity_projection_id uuid not null references public.creator_intelligence_opportunity_projections(id) on delete cascade,
  proposal_title text not null,
  journey_type text not null,
  source_opportunity_type text not null,
  proposal_state text not null default 'draft' check (proposal_state in ('draft', 'accepted', 'dismissed')),
  proposal_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_creator_playbook_proposals_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_creator_playbook_proposals_updated_at on public.creator_playbook_proposals;
create trigger set_creator_playbook_proposals_updated_at
before update on public.creator_playbook_proposals
for each row execute function public.set_creator_playbook_proposals_updated_at();

create unique index if not exists creator_playbook_proposals_one_draft_per_opportunity_idx
on public.creator_playbook_proposals (creator_id, creator_intelligence_opportunity_projection_id)
where proposal_state = 'draft';

create index if not exists creator_playbook_proposals_creator_state_idx
on public.creator_playbook_proposals (creator_id, proposal_state, created_at desc);

create index if not exists creator_playbook_proposals_snapshot_idx
on public.creator_playbook_proposals (intelligence_snapshot_id, created_at desc);

alter table public.creator_playbook_proposals enable row level security;

grant select on public.creator_playbook_proposals to authenticated;
grant select, insert, update, delete on public.creator_playbook_proposals to service_role;

drop policy if exists "agency users can read creator playbook proposals" on public.creator_playbook_proposals;
create policy "agency users can read creator playbook proposals"
on public.creator_playbook_proposals for select to authenticated using (true);
