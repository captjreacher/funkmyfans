create table if not exists public.of_automation_audit_trail (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  conversation_instance_id uuid references public.of_conversation_instances(id) on delete set null,
  simulation_run_id uuid references public.of_automation_simulations(id) on delete set null,
  outbound_message_id uuid references public.of_outbound_messages(id) on delete set null,
  entity_type text not null default 'conversation' check (entity_type in ('conversation', 'simulation', 'outbound_message', 'runtime')),
  action text not null,
  actor_type text not null default 'operator' check (actor_type in ('system', 'operator')),
  actor_label text,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists of_automation_audit_trail_creator_created_idx
on public.of_automation_audit_trail (creator_id, created_at desc);

create index if not exists of_automation_audit_trail_conversation_created_idx
on public.of_automation_audit_trail (conversation_instance_id, created_at desc)
where conversation_instance_id is not null;

create index if not exists of_automation_audit_trail_action_created_idx
on public.of_automation_audit_trail (action, created_at desc);

create index if not exists of_conversation_instances_ops_filters_idx
on public.of_conversation_instances (status, execution_mode, updated_at desc);

alter table public.of_automation_audit_trail enable row level security;

grant select, insert on public.of_automation_audit_trail to authenticated;
grant select, insert, update, delete on public.of_automation_audit_trail to service_role;

create policy "agency users can read automation audit trail"
on public.of_automation_audit_trail for select to authenticated using (true);

create policy "agency users can insert automation audit trail"
on public.of_automation_audit_trail for insert to authenticated with check (true);
