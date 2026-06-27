alter table public.of_subscriber_relationships
  add column if not exists persona_key text not null default 'new_fan' check (persona_key in ('new_fan', 'warm_buyer', 'vip', 'collector', 'conversational', 'drifting_away', 'dormant')),
  add column if not exists persona_name text not null default 'New Fan',
  add column if not exists persona_emoji text not null default '👋',
  add column if not exists persona_color text not null default '#38bdf8',
  add column if not exists persona_description text not null default 'Recently subscribed and still learning their preferences.',
  add column if not exists persona_strategy text not null default 'Build relationship.',
  add column if not exists persona_confidence integer not null default 0 check (persona_confidence between 0 and 100),
  add column if not exists persona_reason text,
  add column if not exists opportunity_classification text not null default 'no_action' check (opportunity_classification in ('welcome', 'upsell_ppv', 'offer_custom', 'retention', 'renewal', 'vip_outreach', 'human_conversation', 'no_action')),
  add column if not exists opportunity_reason text,
  add column if not exists operator_briefing text not null default '',
  add column if not exists operator_briefing_provider text not null default 'deterministic-v1',
  add column if not exists journey_stage_reason text,
  add column if not exists journey_stage text not null default 'New' check (journey_stage in ('New', 'Welcomed', 'Engaged', 'Purchasing', 'Growing', 'VIP', 'At Risk', 'Recovering', 'Dormant'));

alter table public.of_relationship_timeline
  drop constraint if exists of_relationship_timeline_timeline_type_check;

alter table public.of_relationship_timeline
  add constraint of_relationship_timeline_timeline_type_check
  check (timeline_type in ('subscription', 'renewal', 'ppv_purchase', 'tip', 'custom_purchase', 'message', 'ai_action', 'operator_action', 'automation', 'state_change', 'persona_change', 'journey_transition', 'opportunity_change', 'briefing_generated', 'sync', 'context_event'));

create index if not exists of_relationships_creator_persona_idx
  on public.of_subscriber_relationships (creator_id, persona_key, opportunity_classification, journey_stage);

create index if not exists of_relationships_creator_journey_idx
  on public.of_subscriber_relationships (creator_id, journey_stage, updated_at desc);

create index if not exists of_relationships_creator_opportunity_idx
  on public.of_subscriber_relationships (creator_id, opportunity_classification, updated_at desc);
