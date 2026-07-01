create table if not exists public.of_queues (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  queue_key text not null,
  name text not null,
  label text not null,
  description text,
  operational_status text not null default 'active' check (operational_status in ('active', 'paused', 'archived')),
  visibility_state text not null default 'visible' check (visibility_state in ('visible', 'hidden')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_operator_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint of_queues_creator_key_key unique (creator_id, queue_key)
);

create trigger set_of_queues_updated_at
before update on public.of_queues
for each row execute function public.set_updated_at();

create index if not exists of_queues_creator_status_idx
on public.of_queues (creator_id, operational_status, updated_at desc);

create index if not exists of_queues_creator_priority_idx
on public.of_queues (creator_id, priority, updated_at desc);

create table if not exists public.of_queue_items (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references public.of_queues(id) on delete cascade,
  legacy_task_id uuid references public.of_tasks(id) on delete set null,
  conversation_id uuid references public.of_conversation_instances(id) on delete set null,
  assigned_operator_id text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'visible' check (status in ('visible', 'claimed', 'assigned', 'moved', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  moved_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create trigger set_of_queue_items_updated_at
before update on public.of_queue_items
for each row execute function public.set_updated_at();

create unique index if not exists of_queue_items_legacy_task_key
on public.of_queue_items (legacy_task_id)
where legacy_task_id is not null;

create index if not exists of_queue_items_queue_status_idx
on public.of_queue_items (queue_id, status, priority, updated_at desc);

create index if not exists of_queue_items_conversation_idx
on public.of_queue_items (conversation_id, updated_at desc)
where conversation_id is not null;

insert into public.of_queues (
  creator_id,
  queue_key,
  name,
  label,
  description,
  operational_status,
  visibility_state,
  priority,
  assigned_operator_id,
  metadata
)
select distinct
  creators.creator_id,
  'conversation_queue' as queue_key,
  'conversation_queue' as name,
  'Conversation Queue' as label,
  'Canonical queue for conversation work items.' as description,
  'active' as operational_status,
  'visible' as visibility_state,
  'medium' as priority,
  null as assigned_operator_id,
  jsonb_build_object('source', 'backfill')
from (
  select creator_id from public.of_conversation_instances
  union
  select creator_id from public.of_tasks
) as creators
on conflict (creator_id, queue_key) do nothing;

with queue_lookup as (
  select id, creator_id
  from public.of_queues
  where queue_key = 'conversation_queue'
),
conversation_from_event as (
  select
    t.id as task_id,
    conv.id as conversation_id
  from public.of_tasks t
  join public.of_conversation_instances conv
    on conv.creator_id = t.creator_id
   and conv.originating_event_id = t.source_event_id
),
conversation_from_source as (
  select
    t.id as task_id,
    conv.id as conversation_id
  from public.of_tasks t
  join public.of_conversation_instances conv
    on conv.id = t.source_id
   and t.source_type ilike '%conversation%'
)
insert into public.of_queue_items (
  queue_id,
  legacy_task_id,
  conversation_id,
  assigned_operator_id,
  priority,
  status,
  created_at,
  updated_at,
  moved_at,
  resolved_at,
  metadata
)
select
  q.id as queue_id,
  t.id as legacy_task_id,
  coalesce(event_match.conversation_id, source_match.conversation_id) as conversation_id,
  t.assigned_to as assigned_operator_id,
  t.priority,
  case
    when t.status = 'open' then 'visible'
    when t.status = 'in_progress' then 'claimed'
    when t.status = 'waiting' then 'assigned'
    else 'resolved'
  end as status,
  t.created_at,
  t.updated_at,
  coalesce(t.started_at, t.updated_at) as moved_at,
  coalesce(t.completed_at, t.cancelled_at, t.archived_at) as resolved_at,
  jsonb_build_object(
    'creator_id', t.creator_id,
    'source_type', t.source_type,
    'source_id', t.source_id,
    'source_event_id', t.source_event_id,
    'subscriber_id', t.subscriber_id,
    'chat_id', t.chat_id,
    'task_type', t.task_type,
    'rule_name', t.rule_name,
    'rule_version', t.rule_version,
    'priority_score', t.priority_score,
    'priority_reason', t.priority_reason,
    'source', coalesce(t.source, 'legacy'),
    'viewed_at', t.viewed_at,
    'ignore_reason', t.ignore_reason,
    'resolution_note', t.resolution_note
  ) as metadata
from public.of_tasks t
join queue_lookup q
  on q.creator_id = t.creator_id
left join conversation_from_event event_match
  on event_match.task_id = t.id
left join conversation_from_source source_match
  on source_match.task_id = t.id
where not exists (
  select 1
  from public.of_queue_items existing
  where existing.legacy_task_id = t.id
);

create or replace view public.of_conversations as
select *
from public.of_conversation_instances;

create or replace view public.of_queue_items_compat as
select
  t.id as legacy_task_id,
  q.id as queue_id,
  coalesce(event_match.conversation_id, source_match.conversation_id) as conversation_id,
  t.assigned_to as assigned_operator_id,
  t.priority,
  case
    when t.status = 'open' then 'visible'
    when t.status = 'in_progress' then 'claimed'
    when t.status = 'waiting' then 'assigned'
    else 'resolved'
  end as status,
  t.created_at,
  t.updated_at,
  coalesce(t.started_at, t.updated_at) as moved_at,
  coalesce(t.completed_at, t.cancelled_at, t.archived_at) as resolved_at,
  jsonb_build_object(
    'creator_id', t.creator_id,
    'source_type', t.source_type,
    'source_id', t.source_id,
    'source_event_id', t.source_event_id,
    'subscriber_id', t.subscriber_id,
    'chat_id', t.chat_id,
    'task_type', t.task_type,
    'rule_name', t.rule_name,
    'rule_version', t.rule_version,
    'priority_score', t.priority_score,
    'priority_reason', t.priority_reason,
    'source', coalesce(t.source, 'legacy'),
    'viewed_at', t.viewed_at,
    'ignore_reason', t.ignore_reason,
    'resolution_note', t.resolution_note
  ) as metadata
from public.of_tasks t
left join public.of_queues q
  on q.creator_id = t.creator_id
 and q.queue_key = 'conversation_queue'
left join (
  select
    t.id as task_id,
    conv.id as conversation_id
  from public.of_tasks t
  join public.of_conversation_instances conv
    on conv.creator_id = t.creator_id
   and conv.originating_event_id = t.source_event_id
) event_match
  on event_match.task_id = t.id
left join (
  select
    t.id as task_id,
    conv.id as conversation_id
  from public.of_tasks t
  join public.of_conversation_instances conv
    on conv.id = t.source_id
   and t.source_type ilike '%conversation%'
) source_match
  on source_match.task_id = t.id;

alter table public.of_queues enable row level security;
alter table public.of_queue_items enable row level security;

grant select, insert, update, delete on public.of_queues to authenticated;
grant select, insert, update, delete on public.of_queues to service_role;
grant select, insert, update, delete on public.of_queue_items to authenticated;
grant select, insert, update, delete on public.of_queue_items to service_role;
grant select on public.of_conversations to authenticated;
grant select on public.of_conversations to service_role;
grant select on public.of_queue_items_compat to authenticated;
grant select on public.of_queue_items_compat to service_role;

drop policy if exists "agency users can manage queues" on public.of_queues;
create policy "agency users can manage queues"
on public.of_queues for all to authenticated using (true) with check (true);

drop policy if exists "agency users can manage queue items" on public.of_queue_items;
create policy "agency users can manage queue items"
on public.of_queue_items for all to authenticated using (true) with check (true);
