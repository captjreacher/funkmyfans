create table if not exists public.of_conversation_intelligence (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  subscriber_id uuid not null references public.of_subscribers(id) on delete cascade,
  relationship_id uuid not null references public.of_subscriber_relationships(id) on delete cascade,
  rolling_summary text not null default 'No conversation summary yet.',
  last_summary_at timestamptz,
  conversation_sentiment text not null default 'neutral' check (conversation_sentiment in ('positive', 'neutral', 'negative', 'excited', 'hesitant', 'frustrated', 'high_engagement', 'cold')),
  conversation_stage text not null default 'unknown',
  relationship_temperature text not null default 'cold',
  engagement_trend text not null default 'unknown',
  last_meaningful_message_at timestamptz,
  unresolved_topics jsonb not null default '[]'::jsonb,
  promises_made jsonb not null default '[]'::jsonb,
  important_facts jsonb not null default '[]'::jsonb,
  current_intent text check (current_intent in ('greeting', 'flirting', 'buying_signal', 'ppv_interest', 'custom_request', 'sexting', 'casual_chat', 'support', 'complaint', 'price_objection', 'subscription_question', 'goodbye')),
  current_intent_confidence integer check (current_intent_confidence between 0 and 100),
  current_intent_evidence jsonb not null default '[]'::jsonb,
  sentiment_score integer not null default 50 check (sentiment_score between 0 and 100),
  engagement_score integer not null default 0 check (engagement_score between 0 and 100),
  likely_ppv_buyer integer not null default 0 check (likely_ppv_buyer between 0 and 100),
  custom_buyer integer not null default 0 check (custom_buyer between 0 and 100),
  tipper integer not null default 0 check (tipper between 0 and 100),
  renewal_likelihood integer not null default 50 check (renewal_likelihood between 0 and 100),
  churn_probability integer not null default 50 check (churn_probability between 0 and 100),
  vip_potential integer not null default 0 check (vip_potential between 0 and 100),
  whale_potential integer not null default 0 check (whale_potential between 0 and 100),
  ai_briefing text not null default 'No AI briefing yet.',
  recommended_next_action text,
  suggested_script text,
  confidence integer not null default 50 check (confidence between 0 and 100),
  provider text not null default 'heuristic-v1',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, subscriber_id),
  unique (relationship_id)
);

drop trigger if exists set_of_conversation_intelligence_updated_at on public.of_conversation_intelligence;
create trigger set_of_conversation_intelligence_updated_at
before update on public.of_conversation_intelligence
for each row execute function public.set_updated_at();

create table if not exists public.of_conversation_summary_versions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  subscriber_id uuid not null references public.of_subscribers(id) on delete cascade,
  relationship_id uuid not null references public.of_subscriber_relationships(id) on delete cascade,
  rolling_summary text not null,
  summary_version integer not null default 1,
  provider text not null,
  source_event_id uuid references public.of_events(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists of_conversation_summary_versions_relationship_idx
on public.of_conversation_summary_versions (relationship_id, created_at desc);

create table if not exists public.of_message_classifications (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  subscriber_id uuid not null references public.of_subscribers(id) on delete cascade,
  relationship_id uuid not null references public.of_subscriber_relationships(id) on delete cascade,
  source_event_id uuid references public.of_events(id) on delete set null,
  message_text text,
  primary_intent text not null check (primary_intent in ('greeting', 'flirting', 'buying_signal', 'ppv_interest', 'custom_request', 'sexting', 'casual_chat', 'support', 'complaint', 'price_objection', 'subscription_question', 'goodbye')),
  confidence integer not null default 50 check (confidence between 0 and 100),
  evidence jsonb not null default '[]'::jsonb,
  classified_by text not null default 'heuristic-v1',
  classified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source_event_id)
);

create index if not exists of_message_classifications_relationship_idx
on public.of_message_classifications (relationship_id, classified_at desc);

alter table public.of_relationship_timeline
drop constraint if exists of_relationship_timeline_timeline_type_check;

alter table public.of_relationship_timeline
add constraint of_relationship_timeline_timeline_type_check
check (timeline_type in (
  'subscription',
  'renewal',
  'ppv_purchase',
  'tip',
  'custom_purchase',
  'message',
  'summary_refreshed',
  'intent_changed',
  'sentiment_changed',
  'vip_promoted',
  'churn_warning',
  'buying_signal_detected',
  'ai_action',
  'operator_action',
  'automation',
  'state_change',
  'sync',
  'context_event'
));

alter table public.of_conversation_intelligence enable row level security;
alter table public.of_conversation_summary_versions enable row level security;
alter table public.of_message_classifications enable row level security;

grant select on public.of_conversation_intelligence to authenticated;
grant select on public.of_conversation_summary_versions to authenticated;
grant select on public.of_message_classifications to authenticated;

grant select, insert, update, delete on public.of_conversation_intelligence to service_role;
grant select, insert, update, delete on public.of_conversation_summary_versions to service_role;
grant select, insert, update, delete on public.of_message_classifications to service_role;

drop policy if exists "agency users can read conversation intelligence" on public.of_conversation_intelligence;
create policy "agency users can read conversation intelligence"
on public.of_conversation_intelligence for select to authenticated using (true);

drop policy if exists "agency users can read conversation summary versions" on public.of_conversation_summary_versions;
create policy "agency users can read conversation summary versions"
on public.of_conversation_summary_versions for select to authenticated using (true);

drop policy if exists "agency users can read message classifications" on public.of_message_classifications;
create policy "agency users can read message classifications"
on public.of_message_classifications for select to authenticated using (true);

insert into public.of_conversation_intelligence (
  creator_id,
  subscriber_id,
  relationship_id,
  rolling_summary,
  conversation_stage,
  relationship_temperature,
  engagement_trend,
  sentiment_score,
  engagement_score,
  churn_probability,
  vip_potential,
  ai_briefing,
  recommended_next_action
)
select
  creator_id,
  subscriber_id,
  id,
  'No conversation summary yet.',
  relationship_stage,
  case
    when engagement_score >= 75 then 'hot'
    when engagement_score >= 45 then 'warm'
    else 'cold'
  end,
  revenue_trend,
  50,
  engagement_score,
  churn_risk,
  vip_score,
  'No AI briefing yet.',
  recommended_next_action
from public.of_subscriber_relationships
on conflict (relationship_id) do nothing;
