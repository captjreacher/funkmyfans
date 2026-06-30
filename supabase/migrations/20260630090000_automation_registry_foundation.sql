create table if not exists public.of_automation_registry_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'event_type',
    'conversation_classification',
    'routing_destination',
    'playbook_goal',
    'playbook_style',
    'queue_state'
  )),
  registry_key text not null,
  label text not null,
  description text,
  category text,
  premium boolean not null default false,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint of_automation_registry_entries_kind_key_unique unique (kind, registry_key)
);

create trigger set_of_automation_registry_entries_updated_at
before update on public.of_automation_registry_entries
for each row execute function public.set_updated_at();

create index if not exists of_automation_registry_entries_kind_sort_idx
on public.of_automation_registry_entries (kind, sort_order, label);

alter table public.of_automation_registry_entries enable row level security;

grant select on public.of_automation_registry_entries to authenticated;
grant select on public.of_automation_registry_entries to service_role;

create policy "agency users can read automation registry"
on public.of_automation_registry_entries for select to authenticated using (true);

insert into public.of_automation_registry_entries (
  kind,
  registry_key,
  label,
  description,
  category,
  premium,
  is_default,
  sort_order,
  metadata
)
values
  -- Event registry
  ('event_type', 'subscriber_created', 'New Subscriber', 'A new subscriber has joined the creator experience.', 'Customer lifecycle', false, true, 10, jsonb_build_object('kind', 'customer_lifecycle', 'rule_trigger_type', 'new_subscriber')),
  ('event_type', 'trial_subscriber', 'Trial Subscriber', 'A trial subscriber entered the funnel.', 'Customer lifecycle', false, false, 20, jsonb_build_object('kind', 'customer_lifecycle')),
  ('event_type', 'subscription_renewal', 'Subscription Renewal', 'A subscriber is renewing or approaching a renewal state.', 'Customer lifecycle', false, false, 30, jsonb_build_object('kind', 'customer_lifecycle', 'rule_trigger_type', 'subscription_renewed')),
  ('event_type', 'subscription_expired', 'Subscription Expired', 'A subscription has expired and recovery is possible.', 'Customer lifecycle', false, false, 40, jsonb_build_object('kind', 'customer_lifecycle', 'rule_trigger_type', 'subscription_expiring')),
  ('event_type', 'resubscribed', 'Resubscribed', 'A subscriber has returned after a lapse.', 'Customer lifecycle', false, false, 50, jsonb_build_object('kind', 'customer_lifecycle')),
  ('event_type', 'ppv_purchased', 'PPV Purchased', 'A fan bought a PPV message or offer.', 'Revenue', false, false, 60, jsonb_build_object('kind', 'revenue', 'rule_trigger_type', 'ppv_purchased')),
  ('event_type', 'tip_received', 'Tip Received', 'A fan sent a tip.', 'Revenue', false, false, 70, jsonb_build_object('kind', 'revenue')),
  ('event_type', 'high_spender', 'High Spend Threshold', 'A fan crossed a configured spending threshold.', 'Revenue', false, false, 80, jsonb_build_object('kind', 'revenue', 'rule_trigger_type', 'high_spender_detected')),
  ('event_type', 'custom_content_purchased', 'Custom Content Purchased', 'A fan purchased custom content.', 'Revenue', false, false, 90, jsonb_build_object('kind', 'revenue')),
  ('event_type', 'tracked_link_click', 'Tracked Link Click', 'A tracked campaign link was clicked.', 'Marketing', false, false, 100, jsonb_build_object('kind', 'marketing')),
  ('event_type', 'landing_page_conversion', 'Landing Page Conversion', 'A landing page converted a lead.', 'Marketing', false, false, 110, jsonb_build_object('kind', 'marketing')),
  ('event_type', 'external_campaign', 'External Campaign', 'A response came from an external campaign source.', 'Marketing', false, false, 120, jsonb_build_object('kind', 'marketing')),
  ('event_type', 'mass_message_response', 'Mass Message Response', 'A fan responded to a broadcast or mass message.', 'Marketing', false, false, 130, jsonb_build_object('kind', 'marketing')),
  ('event_type', 'new_conversation', 'New Conversation', 'A brand new conversation opened.', 'Messaging', false, false, 140, jsonb_build_object('kind', 'messaging', 'rule_trigger_type', 'new_inbound_message')),
  ('event_type', 'reply_to_automation', 'Reply to Automation', 'A fan replied to an automated message.', 'Messaging', false, false, 150, jsonb_build_object('kind', 'messaging', 'rule_trigger_type', 'new_inbound_message')),
  ('event_type', 'reply_to_creator', 'Reply to Creator', 'A fan replied directly to the creator.', 'Messaging', false, false, 160, jsonb_build_object('kind', 'messaging', 'rule_trigger_type', 'new_inbound_message')),
  ('event_type', 'reply_after_inactivity', 'Reply after Inactivity', 'A dormant thread became active again.', 'Messaging', false, false, 170, jsonb_build_object('kind', 'messaging', 'rule_trigger_type', 'no_chat_activity')),
  ('event_type', 'existing_conversation', 'Existing Conversation Continues', 'An in-flight thread continued.', 'Messaging', false, false, 180, jsonb_build_object('kind', 'messaging', 'rule_trigger_type', 'new_inbound_message')),
  ('event_type', 'creator_initiated_chat', 'Creator Initiated Chat', 'The creator started the conversation.', 'Internal', false, false, 190, jsonb_build_object('kind', 'internal')),
  ('event_type', 'agency_initiated_chat', 'Agency Initiated Chat', 'The agency started the conversation.', 'Internal', false, false, 200, jsonb_build_object('kind', 'internal')),
  ('event_type', 'manual_assignment', 'Manual Assignment', 'A human assigned the conversation manually.', 'Internal', false, false, 210, jsonb_build_object('kind', 'internal', 'rule_trigger_type', 'manual')),
  ('event_type', 'ai_reply_approved', 'AI Reply Approved', 'An AI reply was approved by a human.', 'Internal', false, false, 220, jsonb_build_object('kind', 'internal')),
  ('event_type', 'ai_reply_rejected', 'AI Reply Rejected', 'An AI reply was rejected by a human.', 'Internal', false, false, 230, jsonb_build_object('kind', 'internal')),
  ('event_type', 'automation_paused', 'Automation Paused', 'Automation was paused intentionally.', 'Internal', false, false, 240, jsonb_build_object('kind', 'internal')),
  ('event_type', 'automation_resumed', 'Automation Resumed', 'Automation was resumed intentionally.', 'Internal', false, false, 250, jsonb_build_object('kind', 'internal')),
  -- Conversation classifications
  ('conversation_classification', 'unknown_lead', 'Unknown Lead', 'Treat the response as a new lead until context is known.', null, false, true, 10, '{}'::jsonb),
  ('conversation_classification', 'existing_subscriber', 'Existing Subscriber', 'The fan already exists in the active lifecycle.', null, false, false, 20, '{}'::jsonb),
  ('conversation_classification', 'existing_conversation', 'Existing Conversation', 'The fan is continuing an active thread.', null, false, false, 30, '{}'::jsonb),
  ('conversation_classification', 'automation_response', 'Automation Response', 'The message is responding to an automation flow.', null, false, false, 40, '{}'::jsonb),
  ('conversation_classification', 'priority_customer', 'Priority Customer', 'The fan is high priority and should move quickly.', null, false, false, 50, '{}'::jsonb),
  ('conversation_classification', 'vip', 'VIP', 'The fan warrants premium handling.', null, false, false, 60, '{}'::jsonb),
  ('conversation_classification', 'spam', 'Spam', 'The message should be short-circuited away from automation.', null, false, false, 70, '{}'::jsonb),
  ('conversation_classification', 'creator_only', 'Creator Only', 'The creator should own the response.', null, false, false, 80, '{}'::jsonb),
  ('conversation_classification', 'agency_only', 'Agency Only', 'The agency should own the response.', null, false, false, 90, '{}'::jsonb),
  ('conversation_classification', 'shared_conversation', 'Shared Conversation', 'Either creator or agency may respond.', null, false, false, 100, '{}'::jsonb),
  -- Routing destinations
  ('routing_destination', 'general_queue', 'General Queue', 'No automation. Needs a human.', null, false, true, 10, '{}'::jsonb),
  ('routing_destination', 'automation_queue', 'Automation Queue', 'Automation currently owns the conversation.', null, false, false, 20, '{}'::jsonb),
  ('routing_destination', 'review_queue', 'Review Queue', 'Waiting approval.', null, false, false, 30, '{}'::jsonb),
  ('routing_destination', 'creator_queue', 'Creator Queue', 'Assigned to creator.', null, false, false, 40, '{}'::jsonb),
  ('routing_destination', 'agency_queue', 'Agency Queue', 'Assigned to MGRNZ.', null, false, false, 50, '{}'::jsonb),
  ('routing_destination', 'shared_queue', 'Shared Queue', 'Either party may respond.', null, false, false, 60, '{}'::jsonb),
  ('routing_destination', 'escalation_queue', 'Escalation Queue', 'Automation requires intervention.', null, false, false, 70, '{}'::jsonb),
  -- Playbook goals
  ('playbook_goal', 'welcome_new_subscriber', 'Welcome New Subscriber', 'Open the relationship, introduce creator voice, and set expectations.', 'Journey', false, true, 10, jsonb_build_object('trigger_event_type', 'subscriber_created', 'folder_name', 'Journey Library', 'category', 'Welcome', 'cooldown_hours', 24, 'max_sends_per_fan', 1, 'tags', jsonb_build_array('welcome', 'relationship'), 'preview_steps', jsonb_build_array(
    jsonb_build_object('type', 'message', 'body', 'Hey {{subscriber_name}}, welcome in. I am glad you are here.', 'delayMinutes', 0),
    jsonb_build_object('type', 'question', 'body', 'What kind of stuff do you want most from me?', 'delayMinutes', 60)
  )),
  ('playbook_goal', 'build_relationship', 'Build Relationship', 'Keep the conversation warm, natural, and personal.', 'Journey', false, false, 20, jsonb_build_object('trigger_event_type', 'existing_conversation', 'folder_name', 'Journey Library', 'category', 'Relationship', 'cooldown_hours', 36, 'max_sends_per_fan', 2, 'tags', jsonb_build_array('relationship', 'conversation'), 'preview_steps', jsonb_build_array(
    jsonb_build_object('type', 'message', 'body', 'I saw your message and wanted to answer properly.', 'delayMinutes', 0),
    jsonb_build_object('type', 'follow_up', 'body', 'If you want, we can keep this going later tonight.', 'delayMinutes', 180)
  )),
  ('playbook_goal', 'high_spender_follow_up', 'High Spender Follow-up', 'Prioritise high-value fans with a careful follow-up.', 'Revenue', false, false, 30, jsonb_build_object('trigger_event_type', 'high_spender', 'folder_name', 'Revenue Plays', 'category', 'Revenue', 'cooldown_hours', 12, 'max_sends_per_fan', 1, 'tags', jsonb_build_array('vip', 'revenue'), 'preview_steps', jsonb_build_array(
    jsonb_build_object('type', 'message', 'body', 'You have been incredibly supportive lately, so I wanted to reach out directly.', 'delayMinutes', 0),
    jsonb_build_object('type', 'question', 'body', 'Want something custom from me next?', 'delayMinutes', 90)
  )),
  ('playbook_goal', 'upsell_custom_content', 'Upsell Custom Content', 'Move a fan toward custom content with a clear offer.', 'Revenue', true, false, 40, jsonb_build_object('trigger_event_type', 'custom_content_purchased', 'folder_name', 'Revenue Plays', 'category', 'Revenue', 'cooldown_hours', 24, 'max_sends_per_fan', 1, 'tags', jsonb_build_array('custom', 'upsell'), 'preview_steps', jsonb_build_array(
    jsonb_build_object('type', 'message', 'body', 'I can do that for you. Here is the fastest way to make it happen.', 'delayMinutes', 0),
    jsonb_build_object('type', 'follow_up', 'body', 'If you want the premium version, I can put that together too.', 'delayMinutes', 120)
  )),
  ('playbook_goal', 'recover_expired_subscriber', 'Recover Expired Subscriber', 'Bring back a churned fan with a low-friction re-entry.', 'Recovery', false, false, 50, jsonb_build_object('trigger_event_type', 'subscription_expired', 'folder_name', 'Recovery', 'category', 'Retention', 'cooldown_hours', 72, 'max_sends_per_fan', 2, 'tags', jsonb_build_array('retention', 'recovery'), 'preview_steps', jsonb_build_array(
    jsonb_build_object('type', 'message', 'body', 'I noticed you dropped off, so I wanted to make this easy to pick back up.', 'delayMinutes', 0),
    jsonb_build_object('type', 'question', 'body', 'Want me to send you something worth coming back for?', 'delayMinutes', 240)
  )),
  ('playbook_goal', 're_engage_quiet_fan', 'Re-engage Quiet Fan', 'Wake up a quiet fan with a light, low-pressure message.', 'Reactivation', false, false, 60, jsonb_build_object('trigger_event_type', 'reply_after_inactivity', 'folder_name', 'Reactivation', 'category', 'Reactivation', 'cooldown_hours', 48, 'max_sends_per_fan', 1, 'tags', jsonb_build_array('reactivation', 'quiet-fan'), 'preview_steps', jsonb_build_array(
    jsonb_build_object('type', 'message', 'body', 'You have been quiet lately, so I thought I would check in.', 'delayMinutes', 0),
    jsonb_build_object('type', 'question', 'body', 'Still around, or should I tempt you back?', 'delayMinutes', 180)
  )),
  ('playbook_goal', 'warning_stand_down', 'Warning / Stand Down', 'Send a firm boundary message when the conversation needs a stop or reset.', 'Safety', false, false, 70, jsonb_build_object('trigger_event_type', 'manual', 'folder_name', 'Boundaries', 'category', 'Safety', 'cooldown_hours', 0, 'max_sends_per_fan', 1, 'tags', jsonb_build_array('warning', 'boundaries'), 'preview_steps', jsonb_build_array(
    jsonb_build_object('type', 'message', 'body', 'I need to keep this conversation within boundaries.', 'delayMinutes', 0),
    jsonb_build_object('type', 'end', 'body', 'Conversation closed.', 'delayMinutes', 0)
  )),
  ('playbook_goal', 'manual_campaign', 'Manual Campaign', 'Operator-led playbook for broadcasts, launches, and campaigns.', 'Campaign', false, false, 80, jsonb_build_object('trigger_event_type', 'manual', 'folder_name', 'Manual Campaigns', 'category', 'Campaign', 'cooldown_hours', 6, 'max_sends_per_fan', 1, 'tags', jsonb_build_array('manual', 'campaign'), 'preview_steps', jsonb_build_array(
    jsonb_build_object('type', 'message', 'body', 'I have got something new I want to share with you.', 'delayMinutes', 0),
    jsonb_build_object('type', 'follow_up', 'body', 'If you missed it, I can send the details again.', 'delayMinutes', 180)
  )),
  -- Playbook styles
  ('playbook_style', 'friendly', 'Friendly', 'Warm, upbeat, and easy to trust.', 'Tone', false, false, 10, jsonb_build_object('ai_mode', 'draft_only', 'approval_mode', 'always_approve', 'tags', jsonb_build_array('friendly', 'warm'))),
  ('playbook_style', 'flirty', 'Flirty', 'Playful energy with a little edge.', 'Tone', false, false, 20, jsonb_build_object('ai_mode', 'draft_only', 'approval_mode', 'always_approve', 'tags', jsonb_build_array('flirty', 'playful'))),
  ('playbook_style', 'direct_sales', 'Direct Sales', 'Clear CTA, strong framing, low ambiguity.', 'Tone', false, false, 30, jsonb_build_object('ai_mode', 'requires_approval', 'approval_mode', 'auto_approve_below_threshold', 'tags', jsonb_build_array('sales', 'direct'))),
  ('playbook_style', 'vip', 'VIP', 'Concierge-style treatment for top fans.', 'Tone', true, false, 40, jsonb_build_object('ai_mode', 'requires_approval', 'approval_mode', 'always_approve', 'tags', jsonb_build_array('vip', 'premium'))),
  ('playbook_style', 'relationship_builder', 'Relationship Builder', 'Slower cadence, more curiosity, more context.', 'Tone', false, false, 50, jsonb_build_object('ai_mode', 'draft_only', 'approval_mode', 'always_approve', 'tags', jsonb_build_array('relationship', 'context'))),
  ('playbook_style', 'authority', 'Authority', 'Firm, confident, and boundary-led.', 'Tone', false, false, 60, jsonb_build_object('ai_mode', 'requires_approval', 'approval_mode', 'always_approve', 'tags', jsonb_build_array('authority', 'boundaries'))),
  ('playbook_style', 'warning', 'Warning', 'Clear stand-down language for risky conversations.', 'Tone', false, false, 70, jsonb_build_object('ai_mode', 'disabled', 'approval_mode', 'always_approve', 'tags', jsonb_build_array('warning', 'safety'))),
  ('playbook_style', 'soft_reactivation', 'Soft Reactivation', 'Gentle reminder that gives the fan an easy way back in.', 'Tone', false, false, 80, jsonb_build_object('ai_mode', 'draft_only', 'approval_mode', 'always_approve', 'tags', jsonb_build_array('reactivation', 'soft'))),
  -- Queue states
  ('queue_state', 'unassigned', 'Unassigned', 'Conversation has not been assigned yet.', null, false, true, 10, jsonb_build_object('state', 'open')),
  ('queue_state', 'assigned_creator', 'Assigned Creator', 'Conversation is assigned to the creator.', null, false, false, 20, jsonb_build_object('state', 'owned_by_creator')),
  ('queue_state', 'assigned_agency', 'Assigned Agency', 'Conversation is assigned to the agency.', null, false, false, 30, jsonb_build_object('state', 'owned_by_agency')),
  ('queue_state', 'shared', 'Shared', 'Either creator or agency may respond.', null, false, false, 40, jsonb_build_object('state', 'shared')),
  ('queue_state', 'waiting_customer', 'Waiting Customer', 'The system is waiting for the customer to reply.', null, false, false, 50, jsonb_build_object('state', 'waiting_customer')),
  ('queue_state', 'waiting_creator', 'Waiting Creator', 'The conversation is waiting for creator action.', null, false, false, 60, jsonb_build_object('state', 'waiting_creator')),
  ('queue_state', 'waiting_agency', 'Waiting Agency', 'The conversation is waiting for agency action.', null, false, false, 70, jsonb_build_object('state', 'waiting_agency')),
  ('queue_state', 'waiting_ai_approval', 'Waiting AI Approval', 'The conversation is waiting for reply approval.', null, false, false, 80, jsonb_build_object('state', 'waiting_ai_approval')),
  ('queue_state', 'completed', 'Completed', 'The work item is complete.', null, false, false, 90, jsonb_build_object('state', 'completed')),
  ('queue_state', 'archived', 'Archived', 'The work item has been archived.', null, false, false, 100, jsonb_build_object('state', 'archived'))
on conflict (kind, registry_key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  premium = excluded.premium,
  is_default = excluded.is_default,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata,
  updated_at = now();
