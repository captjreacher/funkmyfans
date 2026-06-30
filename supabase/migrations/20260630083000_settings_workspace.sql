create table if not exists public.of_agency_settings (
  id uuid primary key default gen_random_uuid(),
  default_approval_mode text not null default 'draft_for_approval' check (default_approval_mode in ('task_only', 'draft_for_approval', 'auto_send')),
  default_ai_mode text not null default 'draft_only' check (default_ai_mode in ('disabled', 'draft_only', 'approval_required', 'auto_send')),
  default_timezone text not null default 'Pacific/Auckland',
  quiet_hours jsonb not null default '{"enabled": true, "startHour": 22, "endHour": 8}'::jsonb,
  default_cooldown_minutes integer not null default 60 check (default_cooldown_minutes >= 0),
  daily_outbound_cap_per_creator integer not null default 150 check (daily_outbound_cap_per_creator >= 0),
  daily_outbound_cap_per_fan integer not null default 20 check (daily_outbound_cap_per_fan >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_of_agency_settings_updated_at
before update on public.of_agency_settings
for each row execute function public.set_updated_at();

create table if not exists public.of_creator_settings (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null unique references public.of_creators(id) on delete cascade,
  automation_enabled boolean not null default true,
  chat_automation_enabled boolean not null default true,
  ppv_automation_enabled boolean not null default true,
  tone_notes text,
  restricted_topics text[] not null default '{}',
  escalation_notes text,
  ai_behavior jsonb not null default '{"ai_mode":"draft_only","max_message_length":240,"emoji_level":"light","flirty_level":"medium","sales_aggressiveness":"balanced","use_creator_memory":true,"escalate_high_value_fan_threshold":100}'::jsonb,
  safety jsonb not null default '{"require_approval_first_message":true,"require_approval_ppv_offers":true,"require_approval_above_spend_threshold":100,"require_approval_vip_fans":true,"require_approval_custom_requests":true,"restricted_keywords":[],"allow_auto_send_for_vip":false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_of_creator_settings_updated_at
before update on public.of_creator_settings
for each row execute function public.set_updated_at();

create table if not exists public.of_settings_audit (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('agency', 'creator')),
  entity_id uuid,
  actor_label text,
  change_summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists of_settings_audit_entity_created_idx
on public.of_settings_audit (entity_type, entity_id, created_at desc);

alter table public.of_agency_settings enable row level security;
alter table public.of_creator_settings enable row level security;
alter table public.of_settings_audit enable row level security;

grant select, insert, update, delete on public.of_agency_settings to authenticated;
grant select, insert, update, delete on public.of_creator_settings to authenticated;
grant select, insert on public.of_settings_audit to authenticated;

grant select, insert, update, delete on public.of_agency_settings to service_role;
grant select, insert, update, delete on public.of_creator_settings to service_role;
grant select, insert, update, delete on public.of_settings_audit to service_role;

create policy "agency users can manage agency settings"
on public.of_agency_settings for all to authenticated using (true) with check (true);

create policy "agency users can manage creator settings"
on public.of_creator_settings for all to authenticated using (true) with check (true);

create policy "agency users can read settings audit"
on public.of_settings_audit for select to authenticated using (true);

create policy "agency users can insert settings audit"
on public.of_settings_audit for insert to authenticated with check (true);

insert into public.of_agency_settings (
  default_approval_mode,
  default_ai_mode,
  default_timezone,
  quiet_hours,
  default_cooldown_minutes,
  daily_outbound_cap_per_creator,
  daily_outbound_cap_per_fan
)
select
  'draft_for_approval',
  'draft_only',
  'Pacific/Auckland',
  '{"enabled": true, "startHour": 22, "endHour": 8}'::jsonb,
  60,
  150,
  20
where not exists (
  select 1 from public.of_agency_settings
);
