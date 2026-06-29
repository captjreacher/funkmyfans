alter table public.of_message_scripts
add column if not exists description text,
add column if not exists folder_name text,
add column if not exists category text,
add column if not exists tags text[] not null default '{}',
add column if not exists version_number integer not null default 1 check (version_number >= 1),
add column if not exists source_script_id uuid references public.of_message_scripts(id) on delete set null,
add column if not exists builder_config jsonb not null default '{}'::jsonb;

alter table public.of_message_script_steps
add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.of_message_script_steps
drop constraint if exists of_message_script_steps_step_type_check;

alter table public.of_message_script_steps
add constraint of_message_script_steps_step_type_check
check (step_type in ('message', 'follow_up', 'question', 'branch', 'wait', 'set_variable', 'end'));

alter table public.of_message_script_steps
drop constraint if exists of_message_script_steps_message_body_check;

alter table public.of_message_script_steps
add constraint of_message_script_steps_message_body_check check (
  step_type in ('branch', 'wait', 'set_variable', 'end')
  or nullif(trim(message_body), '') is not null
);

create index if not exists of_message_scripts_creator_folder_idx
on public.of_message_scripts (creator_id, folder_name, category, status);

create index if not exists of_message_scripts_source_script_idx
on public.of_message_scripts (source_script_id, version_number desc);
