create table if not exists public.of_conversation_opportunities (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null,
  conversation_instance_id uuid not null,
  queue_id uuid null,
  queue_item_id uuid null,
  source_event_id uuid null,
  source_step_id uuid null,
  route_key text not null,
  opportunity_classification text not null,
  category text not null,
  title text not null,
  summary text not null,
  status text not null default 'queued',
  priority text not null default 'medium',
  queue_handoff boolean not null default true,
  recommended_next_objective text null,
  resolved_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.of_queue_items
  add column if not exists opportunity_id uuid null;

do $$
begin
  if to_regclass('public.of_creators') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'of_conversation_opportunities_creator_id_fkey'
         and conrelid = 'public.of_conversation_opportunities'::regclass
     )
  then
    alter table public.of_conversation_opportunities
      add constraint of_conversation_opportunities_creator_id_fkey
      foreign key (creator_id)
      references public.of_creators(id)
      on delete cascade;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.of_conversation_instances') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'of_conversation_opportunities_conversation_instance_id_fkey'
         and conrelid = 'public.of_conversation_opportunities'::regclass
     )
  then
    alter table public.of_conversation_opportunities
      add constraint of_conversation_opportunities_conversation_instance_id_fkey
      foreign key (conversation_instance_id)
      references public.of_conversation_instances(id)
      on delete cascade;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.of_queues') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'of_conversation_opportunities_queue_id_fkey'
         and conrelid = 'public.of_conversation_opportunities'::regclass
     )
  then
    alter table public.of_conversation_opportunities
      add constraint of_conversation_opportunities_queue_id_fkey
      foreign key (queue_id)
      references public.of_queues(id)
      on delete set null;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.of_queue_items') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'of_conversation_opportunities_queue_item_id_fkey'
         and conrelid = 'public.of_conversation_opportunities'::regclass
     )
  then
    alter table public.of_conversation_opportunities
      add constraint of_conversation_opportunities_queue_item_id_fkey
      foreign key (queue_item_id)
      references public.of_queue_items(id)
      on delete set null;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.of_queue_items') is not null
     and to_regclass('public.of_conversation_opportunities') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'of_queue_items'
         and column_name = 'opportunity_id'
     )
     and not exists (
       select 1
       from pg_constraint
       where conname = 'of_queue_items_opportunity_id_fkey'
         and conrelid = 'public.of_queue_items'::regclass
     )
  then
    alter table public.of_queue_items
      add constraint of_queue_items_opportunity_id_fkey
      foreign key (opportunity_id)
      references public.of_conversation_opportunities(id)
      on delete set null;
  end if;
end
$$;

create index if not exists
  idx_of_conversation_opportunities_conversation_instance_id
  on public.of_conversation_opportunities (conversation_instance_id);

create index if not exists
  idx_of_conversation_opportunities_queue_item_id
  on public.of_conversation_opportunities (queue_item_id);

create index if not exists
  idx_of_conversation_opportunities_status
  on public.of_conversation_opportunities (status);

create index if not exists
  idx_of_conversation_opportunities_route_key
  on public.of_conversation_opportunities (route_key);

create index if not exists
  idx_of_queue_items_opportunity_id
  on public.of_queue_items (opportunity_id);