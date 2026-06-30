create table if not exists public.of_automation_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  creator_scope text not null default 'selected_creator' check (creator_scope in ('all_creators', 'selected_creator')),
  creator_id uuid references public.of_creators(id) on delete cascade,
  status text not null default 'draft' check (status in ('active', 'draft', 'paused', 'archived')),
  trigger_type text not null,
  action_type text not null check (action_type in ('run_script', 'create_task', 'queue_outbound_draft', 'notify_agency')),
  selected_script_id uuid references public.of_message_scripts(id) on delete set null,
  approval_mode text not null default 'draft_for_approval' check (approval_mode in ('task_only', 'draft_for_approval', 'auto_send')),
  conditions jsonb not null default '[]'::jsonb,
  cooldown_minutes integer not null default 0 check (cooldown_minutes >= 0),
  frequency_limit integer not null default 1 check (frequency_limit >= 1),
  metadata jsonb not null default '{}'::jsonb,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint of_automation_rules_selected_creator_check check (
    (creator_scope = 'all_creators' and creator_id is null)
    or (creator_scope = 'selected_creator' and creator_id is not null)
  )
);

create trigger set_of_automation_rules_updated_at
before update on public.of_automation_rules
for each row execute function public.set_updated_at();

create unique index if not exists of_automation_rules_creator_name_key
on public.of_automation_rules (coalesce(creator_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

create index if not exists of_automation_rules_scope_status_idx
on public.of_automation_rules (creator_scope, creator_id, status, trigger_type);

alter table public.of_automation_simulations
add column if not exists rule_id uuid references public.of_automation_rules(id) on delete set null;

create index if not exists of_automation_simulations_rule_idx
on public.of_automation_simulations (rule_id, updated_at desc);

alter table public.of_automation_rules enable row level security;

grant select, insert, update, delete on public.of_automation_rules to authenticated;
grant select, insert, update, delete on public.of_automation_rules to service_role;

create policy "agency users can manage automation rules"
on public.of_automation_rules for all to authenticated using (true) with check (true);
