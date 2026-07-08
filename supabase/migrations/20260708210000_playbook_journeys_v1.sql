-- NODE-1C: Journey persistence surface.
-- Stores one JourneyGraph per playbook (script), keyed by a unique script_id.
-- This is an editorial/orchestration surface only (ADR-0002). It does NOT touch
-- runtime tables (of_message_script_steps, of_conversation_instances) and does
-- not change execution behaviour.

create table if not exists public.playbook_journeys (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null unique references public.of_message_scripts(id) on delete cascade,
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  title text not null default 'Journey',
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  schema_version integer not null default 1,
  version integer not null default 1,
  graph jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_playbook_journeys_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_playbook_journeys_updated_at on public.playbook_journeys;
create trigger set_playbook_journeys_updated_at
before update on public.playbook_journeys
for each row execute function public.set_playbook_journeys_updated_at();

create index if not exists playbook_journeys_creator_idx
on public.playbook_journeys (creator_id, updated_at desc);

alter table public.playbook_journeys enable row level security;

grant select on public.playbook_journeys to authenticated;
grant select, insert, update, delete on public.playbook_journeys to service_role;

drop policy if exists "agency users can read playbook journeys" on public.playbook_journeys;
create policy "agency users can read playbook journeys"
on public.playbook_journeys for select to authenticated using (true);
