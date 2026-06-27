alter table public.of_tasks
add column if not exists priority_score integer not null default 50 check (priority_score between 0 and 100),
add column if not exists priority_reason text,
add column if not exists reason text,
add column if not exists evidence jsonb not null default '[]'::jsonb,
add column if not exists confidence integer not null default 75 check (confidence between 0 and 100),
add column if not exists recommended_action text,
add column if not exists suggested_action text,
add column if not exists suggested_script text,
add column if not exists ai_suggestion jsonb not null default '{}'::jsonb,
add column if not exists started_at timestamptz,
add column if not exists cancelled_at timestamptz,
add column if not exists completed_by text,
add column if not exists cancelled_by text,
add column if not exists ignore_reason text,
add column if not exists assigned_to text,
add column if not exists viewed_at timestamptz,
add column if not exists archived_at timestamptz,
add column if not exists execution_count integer not null default 0 check (execution_count >= 0),
add column if not exists last_triggered_at timestamptz,
add column if not exists cooldown_until timestamptz,
add column if not exists next_eligible_at timestamptz;

update public.of_tasks
set status = 'completed'
where status = 'done';

update public.of_tasks
set status = 'ignored'
where status = 'dismissed';

update public.of_tasks
set
  reason = coalesce(reason, description, title),
  recommended_action = coalesce(recommended_action, title),
  suggested_action = coalesce(suggested_action, case
    when task_type = 'send_welcome_message' then 'send_welcome'
    when task_type like '%chat%' then 'open_chat'
    when task_type like '%transaction%' then 'review_purchase'
    else 'review_task'
  end),
  priority_score = case priority
    when 'urgent' then greatest(priority_score, 90)
    when 'high' then greatest(priority_score, 75)
    when 'medium' then greatest(priority_score, 50)
    else greatest(priority_score, 25)
  end,
  priority_reason = coalesce(priority_reason, 'Migrated from static priority ' || priority || '.'),
  evidence = case
    when evidence = '[]'::jsonb then jsonb_build_array(jsonb_build_object('label', 'Legacy task description', 'value', coalesce(description, title)))
    else evidence
  end,
  completed_at = case when status = 'completed' then coalesce(completed_at, updated_at, created_at) else completed_at end,
  started_at = case when status = 'in_progress' then coalesce(started_at, updated_at, created_at) else started_at end,
  last_triggered_at = coalesce(last_triggered_at, created_at),
  next_eligible_at = coalesce(next_eligible_at, cooldown_until, created_at)
where reason is null
   or recommended_action is null
   or suggested_action is null
   or priority_reason is null
   or evidence = '[]'::jsonb
   or last_triggered_at is null
   or next_eligible_at is null;

alter table public.of_tasks
drop constraint if exists of_tasks_status_check;

alter table public.of_tasks
add constraint of_tasks_status_check
check (status in ('open', 'in_progress', 'waiting', 'completed', 'cancelled', 'ignored', 'archived'));

alter table public.of_tasks
drop constraint if exists of_tasks_done_status_check;

alter table public.of_tasks
drop constraint if exists of_tasks_completed_status_check;

alter table public.of_tasks
add constraint of_tasks_lifecycle_status_check
check (
  (status = 'completed' and completed_at is not null)
  or (status = 'cancelled' and cancelled_at is not null)
  or (status = 'archived' and archived_at is not null)
  or status in ('open', 'in_progress', 'waiting', 'ignored')
);

drop index if exists public.of_tasks_active_source_rule_key;

create unique index if not exists of_tasks_active_source_rule_key
on public.of_tasks (creator_id, source_type, source_id, task_type, rule_name)
where source_id is not null and status in ('open', 'in_progress', 'waiting');

create index if not exists of_tasks_inbox_score_idx
on public.of_tasks (status, priority_score desc, due_at asc nulls last, created_at desc);

create index if not exists of_tasks_cooldown_idx
on public.of_tasks (creator_id, rule_name, next_eligible_at);

create table if not exists public.of_task_timeline (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.of_tasks(id) on delete cascade,
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  event_type text not null check (event_type in ('task_created', 'viewed', 'assigned', 'status_changed', 'ai_suggestion_generated', 'completed', 'cancelled', 'ignored', 'reopened', 'note_added')),
  actor text not null default 'system',
  from_status text,
  to_status text,
  title text not null,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists of_task_timeline_task_created_idx
on public.of_task_timeline (task_id, created_at desc);

alter table public.of_task_timeline enable row level security;

grant select on public.of_task_timeline to authenticated;
grant select, insert, update, delete on public.of_task_timeline to service_role;

drop policy if exists "agency users can read task timeline" on public.of_task_timeline;
create policy "agency users can read task timeline"
on public.of_task_timeline for select to authenticated using (true);

insert into public.of_task_timeline (task_id, creator_id, event_type, actor, to_status, title, detail, created_at)
select
  task.id,
  task.creator_id,
  'task_created',
  'rules_engine',
  task.status,
  'Task Created',
  coalesce(task.reason, task.description, task.title),
  task.created_at
from public.of_tasks task
where not exists (
  select 1
  from public.of_task_timeline timeline
  where timeline.task_id = task.id
    and timeline.event_type = 'task_created'
);
