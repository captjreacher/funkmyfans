alter table public.of_message_scripts
add column if not exists action_mode text not null default 'draft_for_approval',
add column if not exists description text,
add column if not exists folder_name text,
add column if not exists category text,
add column if not exists tags text[] not null default '{}',
add column if not exists version_number integer not null default 1,
add column if not exists source_script_id uuid references public.of_message_scripts(id) on delete set null,
add column if not exists builder_config jsonb not null default '{}'::jsonb;

alter table public.of_message_scripts
drop constraint if exists of_message_scripts_action_mode_check;

alter table public.of_message_scripts
add constraint of_message_scripts_action_mode_check
check (action_mode in ('task_only', 'draft_for_approval', 'auto_send'));

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

alter table public.of_automation_runs
add column if not exists action_mode text not null default 'draft_for_approval',
add column if not exists execution_mode text not null default 'production',
add column if not exists simulation_run_id uuid,
add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.of_automation_runs
drop constraint if exists of_automation_runs_action_mode_check;

alter table public.of_automation_runs
add constraint of_automation_runs_action_mode_check
check (action_mode in ('task_only', 'draft_for_approval', 'auto_send'));

alter table public.of_automation_runs
drop constraint if exists of_automation_runs_execution_mode_check;

alter table public.of_automation_runs
add constraint of_automation_runs_execution_mode_check
check (execution_mode in ('production', 'simulation'));

alter table public.of_outbound_messages
add column if not exists source_event_id uuid references public.of_events(id) on delete set null,
add column if not exists execution_mode text not null default 'production',
add column if not exists simulation_run_id uuid,
add column if not exists destination text,
add column if not exists provider_message_id text,
add column if not exists generated_text text,
add column if not exists draft_text text,
add column if not exists final_text text,
add column if not exists approved_by text,
add column if not exists failed_at timestamptz,
add column if not exists failure_reason text,
add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.of_outbound_messages
drop constraint if exists of_outbound_messages_status_check;

alter table public.of_outbound_messages
add constraint of_outbound_messages_status_check
check (status in ('pending_approval', 'queued', 'sending', 'sent', 'failed', 'rejected', 'skipped'));

alter table public.of_outbound_messages
drop constraint if exists of_outbound_messages_approval_status_check;

alter table public.of_outbound_messages
add constraint of_outbound_messages_approval_status_check
check (approval_status in ('not_required', 'pending', 'approved', 'rejected'));

alter table public.of_outbound_messages
drop constraint if exists of_outbound_messages_execution_mode_check;

alter table public.of_outbound_messages
add constraint of_outbound_messages_execution_mode_check
check (execution_mode in ('production', 'simulation'));

alter table public.of_events
add column if not exists execution_mode text not null default 'production',
add column if not exists simulation_run_id uuid,
add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.of_events
drop constraint if exists of_events_execution_mode_check;

alter table public.of_events
add constraint of_events_execution_mode_check
check (execution_mode in ('production', 'simulation'));

create table if not exists public.of_creator_automation_scenarios (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  scenario_key text not null,
  label text not null,
  description text,
  trigger_event_type text not null,
  linked_script_id uuid references public.of_message_scripts(id) on delete set null,
  enabled boolean not null default true,
  creator_enabled boolean not null default true,
  action_mode_override text,
  metadata jsonb not null default '{}'::jsonb,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint of_creator_automation_scenarios_creator_key unique (creator_id, scenario_key)
);

create table if not exists public.of_simulated_subscribers (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  name text not null,
  username text not null,
  subscription_status text not null default 'active',
  renewal_state text not null default 'new',
  spend_level text not null default 'new',
  lifetime_value numeric not null default 0,
  message_history_summary text,
  custom_variables jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint of_simulated_subscribers_creator_username_key unique (creator_id, username)
);

create table if not exists public.of_conversation_instances (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  subscriber_id uuid references public.of_subscribers(id) on delete set null,
  relationship_id uuid,
  script_id uuid not null references public.of_message_scripts(id) on delete cascade,
  source_script_id uuid references public.of_message_scripts(id) on delete set null,
  script_version integer not null default 1,
  automation_run_id uuid references public.of_automation_runs(id) on delete set null,
  originating_event_id uuid references public.of_events(id) on delete set null,
  last_event_id uuid references public.of_events(id) on delete set null,
  current_step_id uuid references public.of_message_script_steps(id) on delete set null,
  next_step_id uuid references public.of_message_script_steps(id) on delete set null,
  status text not null default 'running',
  execution_mode text not null default 'production',
  variables jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  retry_count integer not null default 0,
  waiting_until timestamptz,
  waiting_reason text,
  cancellation_reason text,
  completion_reason text,
  last_error text,
  processing_started_at timestamptz,
  last_resumed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.of_conversation_instances
drop constraint if exists of_conversation_instances_status_check;

alter table public.of_conversation_instances
add constraint of_conversation_instances_status_check
check (status in ('running', 'waiting_delay', 'waiting_reply', 'waiting_approval', 'completed', 'cancelled', 'failed'));

alter table public.of_conversation_instances
drop constraint if exists of_conversation_instances_execution_mode_check;

alter table public.of_conversation_instances
add constraint of_conversation_instances_execution_mode_check
check (execution_mode in ('production', 'simulation'));

create table if not exists public.of_conversation_history (
  id uuid primary key default gen_random_uuid(),
  conversation_instance_id uuid not null references public.of_conversation_instances(id) on delete cascade,
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  event_id uuid references public.of_events(id) on delete set null,
  step_id uuid references public.of_message_script_steps(id) on delete set null,
  transition_key text not null,
  event_type text not null,
  from_status text,
  to_status text,
  detail text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.of_outbound_messages
add column if not exists conversation_instance_id uuid references public.of_conversation_instances(id) on delete set null,
add column if not exists script_step_id uuid references public.of_message_script_steps(id) on delete set null;

create table if not exists public.of_automation_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  creator_scope text not null default 'selected_creator',
  creator_id uuid references public.of_creators(id) on delete cascade,
  status text not null default 'draft',
  trigger_type text not null,
  action_type text not null,
  selected_script_id uuid references public.of_message_scripts(id) on delete set null,
  approval_mode text not null default 'draft_for_approval',
  conditions jsonb not null default '[]'::jsonb,
  cooldown_minutes integer not null default 0,
  frequency_limit integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.of_automation_simulations (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  script_id uuid references public.of_message_scripts(id) on delete set null,
  rule_id uuid references public.of_automation_rules(id) on delete set null,
  scenario_id uuid references public.of_creator_automation_scenarios(id) on delete set null,
  simulated_subscriber_id uuid references public.of_simulated_subscribers(id) on delete set null,
  conversation_instance_id uuid references public.of_conversation_instances(id) on delete set null,
  automation_run_id uuid references public.of_automation_runs(id) on delete set null,
  source_event_id uuid references public.of_events(id) on delete set null,
  status text not null default 'draft',
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  initial_variables jsonb not null default '{}'::jsonb,
  runtime_state jsonb not null default '{}'::jsonb,
  failure_plan jsonb not null default '{}'::jsonb,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.of_automation_runs
drop constraint if exists of_automation_runs_simulation_run_id_fkey;

alter table public.of_automation_runs
add constraint of_automation_runs_simulation_run_id_fkey
foreign key (simulation_run_id) references public.of_automation_simulations(id) on delete set null;

alter table public.of_outbound_messages
drop constraint if exists of_outbound_messages_simulation_run_id_fkey;

alter table public.of_outbound_messages
add constraint of_outbound_messages_simulation_run_id_fkey
foreign key (simulation_run_id) references public.of_automation_simulations(id) on delete set null;

create table if not exists public.of_queues (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  queue_key text not null,
  name text not null,
  label text not null,
  description text,
  operational_status text not null default 'active',
  visibility_state text not null default 'visible',
  priority text not null default 'medium',
  assigned_operator_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint of_queues_creator_key_key unique (creator_id, queue_key)
);

create table if not exists public.of_queue_items (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references public.of_queues(id) on delete cascade,
  legacy_task_id uuid references public.of_tasks(id) on delete set null,
  conversation_id uuid references public.of_conversation_instances(id) on delete set null,
  assigned_operator_id text,
  priority text not null default 'medium',
  status text not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  moved_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.of_automation_audit_trail (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  conversation_instance_id uuid references public.of_conversation_instances(id) on delete set null,
  simulation_run_id uuid references public.of_automation_simulations(id) on delete set null,
  outbound_message_id uuid references public.of_outbound_messages(id) on delete set null,
  entity_type text not null default 'conversation',
  action text not null,
  actor_type text not null default 'operator',
  actor_label text,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists of_message_scripts_creator_name_key
on public.of_message_scripts (creator_id, lower(name));

create unique index if not exists of_message_script_steps_order_key
on public.of_message_script_steps (script_id, step_order);

create unique index if not exists of_automation_runs_script_event_key
on public.of_automation_runs (script_id, source_event_id)
where source_event_id is not null;

create unique index if not exists of_conversation_instances_script_event_key
on public.of_conversation_instances (script_id, originating_event_id)
where originating_event_id is not null;

create unique index if not exists of_conversation_history_transition_key
on public.of_conversation_history (conversation_instance_id, transition_key);

create unique index if not exists of_outbound_messages_conversation_step_key
on public.of_outbound_messages (conversation_instance_id, script_step_id)
where conversation_instance_id is not null and script_step_id is not null;

create unique index if not exists of_automation_rules_creator_name_key
on public.of_automation_rules (coalesce(creator_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

create unique index if not exists of_queue_items_legacy_task_key
on public.of_queue_items (legacy_task_id)
where legacy_task_id is not null;

grant select, insert, update, delete on public.of_message_scripts to authenticated, service_role;
grant select, insert, update, delete on public.of_message_script_steps to authenticated, service_role;
grant select, insert, update, delete on public.of_automation_runs to authenticated, service_role;
grant select, insert, update, delete on public.of_outbound_messages to authenticated, service_role;
grant select, insert, update, delete on public.of_creator_automation_scenarios to authenticated, service_role;
grant select, insert, update, delete on public.of_simulated_subscribers to authenticated, service_role;
grant select, insert, update, delete on public.of_conversation_instances to authenticated, service_role;
grant select, insert, update, delete on public.of_conversation_history to authenticated, service_role;
grant select, insert, update, delete on public.of_automation_rules to authenticated, service_role;
grant select, insert, update, delete on public.of_automation_simulations to authenticated, service_role;
grant select, insert, update, delete on public.of_queues to authenticated, service_role;
grant select, insert, update, delete on public.of_queue_items to authenticated, service_role;
grant select, insert, update, delete on public.of_automation_audit_trail to authenticated, service_role;

insert into public.of_message_scripts (
  creator_id,
  name,
  description,
  trigger_event_type,
  status,
  auto_send_enabled,
  requires_approval,
  action_mode,
  cooldown_hours,
  max_sends_per_fan,
  folder_name,
  category,
  tags,
  version_number,
  builder_config
)
select
  c.id,
  'New Subscriber Funnel',
  'Production reference flow for welcoming a new subscriber, handling AI confidence approval, offering PPV, and completing on purchase outcome.',
  'subscriber_created',
  'active',
  true,
  false,
  'auto_send',
  24,
  1,
  'Revenue',
  'Revenue',
  array['seed', 'new-subscriber', 'revenue', 'ppv', 'reference-flow'],
  1,
  jsonb_build_object(
    'schemaVersion', 1,
    'variables', jsonb_build_array(
      jsonb_build_object('key', 'subscriber_name', 'label', 'Subscriber Name', 'defaultValue', 'there'),
      jsonb_build_object('key', 'creator_signature', 'label', 'Creator Signature', 'defaultValue', 'xo'),
      jsonb_build_object('key', 'starter_ppv_title', 'label', 'Starter PPV Title', 'defaultValue', 'Starter PPV'),
      jsonb_build_object('key', 'starter_ppv_price', 'label', 'Starter PPV Price', 'defaultValue', '19')
    ),
    'workspace', jsonb_build_object(
      'templateKey', 'new_subscriber_funnel',
      'execution', jsonb_build_object('mode', 'immediate'),
      'ai', jsonb_build_object('mode', 'auto_send'),
      'approval', jsonb_build_object('mode', 'never_approve'),
      'conditions', '[]'::jsonb,
      'archivedAt', null
    )
  )
from public.of_creators c
where c.active = true
  and not exists (
    select 1
    from public.of_message_scripts existing
    where existing.creator_id = c.id
      and lower(existing.name) = lower('New Subscriber Funnel')
  );

update public.of_message_scripts
set
  description = 'Production reference flow for welcoming a new subscriber, handling AI confidence approval, offering PPV, and completing on purchase outcome.',
  trigger_event_type = 'subscriber_created',
  status = 'active',
  auto_send_enabled = true,
  requires_approval = false,
  action_mode = 'auto_send',
  cooldown_hours = 24,
  max_sends_per_fan = 1,
  folder_name = 'Revenue',
  category = 'Revenue',
  tags = array['seed', 'new-subscriber', 'revenue', 'ppv', 'reference-flow'],
  version_number = greatest(version_number, 1),
  builder_config = jsonb_build_object(
    'schemaVersion', 1,
    'variables', jsonb_build_array(
      jsonb_build_object('key', 'subscriber_name', 'label', 'Subscriber Name', 'defaultValue', 'there'),
      jsonb_build_object('key', 'creator_signature', 'label', 'Creator Signature', 'defaultValue', 'xo'),
      jsonb_build_object('key', 'starter_ppv_title', 'label', 'Starter PPV Title', 'defaultValue', 'Starter PPV'),
      jsonb_build_object('key', 'starter_ppv_price', 'label', 'Starter PPV Price', 'defaultValue', '19')
    ),
    'workspace', jsonb_build_object(
      'templateKey', 'new_subscriber_funnel',
      'execution', jsonb_build_object('mode', 'immediate'),
      'ai', jsonb_build_object('mode', 'auto_send'),
      'approval', jsonb_build_object('mode', 'never_approve'),
      'conditions', '[]'::jsonb,
      'archivedAt', null
    )
  )
where lower(name) = lower('New Subscriber Funnel');

delete from public.of_message_script_steps
where script_id in (
  select id
  from public.of_message_scripts
  where lower(name) = lower('New Subscriber Funnel')
);

create temporary table _mvp1a_new_subscriber_funnel_steps (
  script_id uuid not null,
  node_key text not null,
  step_id uuid not null default gen_random_uuid(),
  primary key (script_id, node_key)
) on commit drop;

insert into _mvp1a_new_subscriber_funnel_steps (script_id, node_key)
select script.id, node.node_key
from public.of_message_scripts script
cross join (
  values
    ('welcome_message'),
    ('short_wait'),
    ('engagement_question'),
    ('interpret_reply'),
    ('ai_draft'),
    ('confidence_check'),
    ('auto_reply'),
    ('approval_reply'),
    ('ppv_offer'),
    ('purchase_check'),
    ('purchased_branch'),
    ('deliver_content'),
    ('follow_up'),
    ('end')
) as node(node_key)
where lower(script.name) = lower('New Subscriber Funnel');

insert into public.of_message_script_steps (
  id,
  script_id,
  step_order,
  step_type,
  message_body,
  delay_minutes,
  next_step_id,
  fallback_step_id,
  metadata
)
select
  current_step.step_id,
  script.id,
  seed.step_order,
  seed.step_type,
  seed.message_body,
  seed.delay_minutes,
  next_step.step_id,
  fallback_step.step_id,
  seed.metadata
from public.of_message_scripts script
join (
  values
    (0, 'welcome_message', 'message', 'Hey {{subscriber_name}}. I love seeing a new name come in. You picked a fun time to join me.', null::integer, 'short_wait', null::text, jsonb_build_object('kind', 'send_message', 'nodeKey', 'welcome_message', 'label', 'Welcome Message')),
    (1, 'short_wait', 'wait', 'Wait before asking the engagement question.', 2, 'engagement_question', null::text, jsonb_build_object('kind', 'wait', 'nodeKey', 'short_wait', 'label', 'Wait')),
    (2, 'engagement_question', 'question', 'What kind of vibe do you want most from me first: playful, teasing, or something more personal?', null::integer, 'interpret_reply', null::text, jsonb_build_object('kind', 'ask_question', 'nodeKey', 'engagement_question', 'label', 'Ask Engagement Question')),
    (3, 'interpret_reply', 'set_variable', 'Interpret subscriber reply.', null::integer, 'ai_draft', null::text, jsonb_build_object('kind', 'set_variable', 'nodeKey', 'interpret_reply', 'label', 'Interpret Reply', 'variableKey', 'ai_confidence', 'variableValue', '__derive_from_last_reply__')),
    (4, 'ai_draft', 'set_variable', 'Draft AI reply from the subscriber response.', null::integer, 'confidence_check', null::text, jsonb_build_object('kind', 'set_variable', 'nodeKey', 'ai_draft', 'label', 'AI Draft', 'variableKey', 'ai_draft_reply', 'variableValue', '__draft_from_last_reply__')),
    (5, 'confidence_check', 'branch', 'Route by AI confidence.', null::integer, 'auto_reply', 'approval_reply', jsonb_build_object('kind', 'branch', 'nodeKey', 'confidence_check', 'label', 'Confidence Check', 'branchRules', jsonb_build_array(jsonb_build_object('id', 'high_confidence', 'label', 'High Confidence', 'condition', jsonb_build_object('source', 'variable', 'key', 'ai_confidence', 'operator', 'gte', 'value', '75'), 'nextStepId', 'auto_reply')))),
    (6, 'auto_reply', 'message', '{{ai_draft_reply}}', null::integer, 'ppv_offer', null::text, jsonb_build_object('kind', 'send_message', 'nodeKey', 'auto_reply', 'label', 'Auto Send', 'messageGenerationMode', 'ai_generated')),
    (7, 'approval_reply', 'message', '{{ai_draft_reply}}', null::integer, 'ppv_offer', null::text, jsonb_build_object('kind', 'send_message', 'nodeKey', 'approval_reply', 'label', 'Human Approval', 'messageGenerationMode', 'ai_generated', 'notes', 'Approve AI Reply')),
    (8, 'ppv_offer', 'message', 'I can send you my {{starter_ppv_title}} for ${{starter_ppv_price}} if you want a little welcome treat.', null::integer, 'purchase_check', null::text, jsonb_build_object('kind', 'send_message', 'nodeKey', 'ppv_offer', 'label', 'Offer PPV', 'ppvTitle', 'Starter PPV', 'ppvPrice', 19)),
    (9, 'purchase_check', 'wait', 'Wait for PPV purchase result.', null::integer, 'purchased_branch', null::text, jsonb_build_object('kind', 'wait', 'nodeKey', 'purchase_check', 'label', 'Purchase Check', 'waitForPurchase', true)),
    (10, 'purchased_branch', 'branch', 'Purchased?', null::integer, 'follow_up', 'follow_up', jsonb_build_object('kind', 'branch', 'nodeKey', 'purchased_branch', 'label', 'Purchased?', 'branchRules', jsonb_build_array(jsonb_build_object('id', 'purchased_yes', 'label', 'YES', 'condition', jsonb_build_object('source', 'variable', 'key', 'purchase_status', 'operator', 'equals', 'value', 'purchased'), 'nextStepId', 'deliver_content')))),
    (11, 'deliver_content', 'message', 'Perfect. I unlocked it for you. Enjoy this one and tell me which part got your attention.', null::integer, 'end', null::text, jsonb_build_object('kind', 'send_message', 'nodeKey', 'deliver_content', 'label', 'Deliver Content')),
    (12, 'follow_up', 'follow_up', 'No pressure. I will keep the welcome treat ready if you decide you want it.', null::integer, 'end', null::text, jsonb_build_object('kind', 'send_message', 'nodeKey', 'follow_up', 'label', 'Follow-up')),
    (13, 'end', 'end', null::text, null::integer, null::text, null::text, jsonb_build_object('kind', 'end_conversation', 'nodeKey', 'end', 'label', 'End'))
) as seed(step_order, node_key, step_type, message_body, delay_minutes, next_node_key, fallback_node_key, metadata)
  on lower(script.name) = lower('New Subscriber Funnel')
join _mvp1a_new_subscriber_funnel_steps current_step
  on current_step.script_id = script.id
 and current_step.node_key = seed.node_key
left join _mvp1a_new_subscriber_funnel_steps next_step
  on next_step.script_id = script.id
 and next_step.node_key = seed.next_node_key
left join _mvp1a_new_subscriber_funnel_steps fallback_step
  on fallback_step.script_id = script.id
 and fallback_step.node_key = seed.fallback_node_key;

insert into public.of_automation_rules (
  name,
  description,
  creator_scope,
  creator_id,
  status,
  trigger_type,
  action_type,
  selected_script_id,
  approval_mode,
  conditions,
  cooldown_minutes,
  frequency_limit,
  metadata
)
select
  'New subscriber -> New Subscriber Funnel',
  'Runs the production reference funnel for a fresh subscriber from welcome through PPV purchase check.',
  'selected_creator',
  script.creator_id,
  'active',
  'new_subscriber',
  'run_script',
  script.id,
  'auto_send',
  '[]'::jsonb,
  60,
  1,
  jsonb_build_object('seed', true, 'seed_key', 'new_subscriber_funnel', 'mvp', 'MVP-1A')
from public.of_message_scripts script
where lower(script.name) = lower('New Subscriber Funnel')
  and not exists (
    select 1
    from public.of_automation_rules existing
    where existing.creator_id = script.creator_id
      and lower(existing.name) = lower('New subscriber -> New Subscriber Funnel')
  );

update public.of_automation_rules rule
set
  description = 'Runs the production reference funnel for a fresh subscriber from welcome through PPV purchase check.',
  status = 'active',
  trigger_type = 'new_subscriber',
  action_type = 'run_script',
  selected_script_id = script.id,
  approval_mode = 'auto_send',
  conditions = '[]'::jsonb,
  cooldown_minutes = 60,
  frequency_limit = 1,
  metadata = coalesce(rule.metadata, '{}'::jsonb) || jsonb_build_object('seed', true, 'seed_key', 'new_subscriber_funnel', 'mvp', 'MVP-1A')
from public.of_message_scripts script
where rule.creator_id = script.creator_id
  and lower(rule.name) = lower('New subscriber -> New Subscriber Funnel')
  and lower(script.name) = lower('New Subscriber Funnel');

update public.of_automation_rules
set status = 'paused'
where trigger_type = 'new_subscriber'
  and lower(name) in (lower('New subscriber -> Welcome New Subscriber'), lower('New subscriber -> Welcome + PPV'));

update public.of_creator_automation_scenarios scenario
set
  linked_script_id = script.id,
  enabled = true,
  creator_enabled = true,
  action_mode_override = 'auto_send',
  metadata = coalesce(scenario.metadata, '{}'::jsonb) || jsonb_build_object('mvp_reference_flow', 'new_subscriber_funnel')
from public.of_message_scripts script
where scenario.creator_id = script.creator_id
  and scenario.scenario_key = 'new_subscriber'
  and lower(script.name) = lower('New Subscriber Funnel');
