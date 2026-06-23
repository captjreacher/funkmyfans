alter table public.of_tasks
add column if not exists source_type text,
add column if not exists source_id uuid,
add column if not exists rule_name text,
add column if not exists rule_version text,
add column if not exists due_at timestamptz,
add column if not exists resolution_note text,
add column if not exists updated_at timestamptz not null default now();

update public.of_tasks
set
  source_type = coalesce(source_type, source),
  rule_name = coalesce(rule_name, task_type),
  rule_version = coalesce(rule_version, 'legacy')
where source_type is null
   or rule_name is null
   or rule_version is null;

update public.of_tasks
set status = 'done'
where status = 'completed';

alter table public.of_tasks
alter column source_type set not null,
alter column rule_name set not null,
alter column rule_version set not null;

alter table public.of_tasks
drop constraint if exists of_tasks_status_check;

alter table public.of_tasks
add constraint of_tasks_status_check
check (status in ('open', 'in_progress', 'done', 'dismissed'));

alter table public.of_tasks
drop constraint if exists of_tasks_completed_status_check;

alter table public.of_tasks
add constraint of_tasks_done_status_check
check (
  (status = 'done' and completed_at is not null)
  or (status <> 'done')
);

drop trigger if exists set_of_tasks_updated_at on public.of_tasks;
create trigger set_of_tasks_updated_at
before update on public.of_tasks
for each row execute function public.set_updated_at();

create index if not exists of_tasks_creator_idx on public.of_tasks (creator_id);
create index if not exists of_tasks_status_idx on public.of_tasks (status);
create index if not exists of_tasks_priority_idx on public.of_tasks (priority);
create index if not exists of_tasks_due_at_idx on public.of_tasks (due_at);
create index if not exists of_tasks_source_idx on public.of_tasks (source_type, source_id);

create unique index if not exists of_tasks_active_source_rule_key
on public.of_tasks (creator_id, source_type, source_id, task_type, rule_name)
where source_id is not null and status in ('open', 'in_progress');
