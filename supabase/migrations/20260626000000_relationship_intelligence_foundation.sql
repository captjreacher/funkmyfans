create table if not exists public.of_subscriber_relationships (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  subscriber_id uuid not null references public.of_subscribers(id) on delete cascade,
  betterfans_subscriber_id text not null,
  username text,
  display_name text,
  avatar_url text,
  country text,
  current_subscription_status text,
  subscription_tier text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz,
  lifetime_spend numeric(12, 2) not null default 0,
  subscription_spend numeric(12, 2) not null default 0,
  ppv_purchases numeric(12, 2) not null default 0,
  tips numeric(12, 2) not null default 0,
  customs_purchased numeric(12, 2) not null default 0,
  purchase_count integer not null default 0 check (purchase_count >= 0),
  average_order_value numeric(12, 2) not null default 0,
  last_purchase_at timestamptz,
  revenue_trend text not null default 'unknown' check (revenue_trend in ('unknown', 'new', 'rising', 'steady', 'cooling', 'declining')),
  relationship_state text not null default 'prospect' check (relationship_state in ('prospect', 'new_subscriber', 'welcomed', 'engaged', 'vip', 'cooling', 'at_risk', 'expired', 'reactivated')),
  relationship_stage text not null default 'prospect',
  relationship_score integer not null default 0 check (relationship_score between 0 and 100),
  vip_score integer not null default 0 check (vip_score between 0 and 100),
  churn_risk integer not null default 0 check (churn_risk between 0 and 100),
  engagement_score integer not null default 0 check (engagement_score between 0 and 100),
  conversation_count integer not null default 0 check (conversation_count >= 0),
  last_creator_response_at timestamptz,
  last_subscriber_message_at timestamptz,
  average_reply_delay_seconds integer,
  active_script_id uuid references public.of_message_scripts(id) on delete set null,
  current_workflow text,
  pending_actions integer not null default 0 check (pending_actions >= 0),
  pending_approvals integer not null default 0 check (pending_approvals >= 0),
  automation_paused boolean not null default false,
  human_takeover boolean not null default false,
  auto_send_enabled boolean not null default false,
  recommended_next_action text,
  last_event_id uuid references public.of_events(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, subscriber_id),
  unique (creator_id, betterfans_subscriber_id)
);

create trigger set_of_subscriber_relationships_updated_at
before update on public.of_subscriber_relationships
for each row execute function public.set_updated_at();

create index if not exists of_relationships_creator_state_idx
on public.of_subscriber_relationships (creator_id, relationship_state, updated_at desc);

create index if not exists of_relationships_creator_scores_idx
on public.of_subscriber_relationships (creator_id, vip_score desc, churn_risk desc, engagement_score desc);

create table if not exists public.of_relationship_summaries (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  subscriber_id uuid not null references public.of_subscribers(id) on delete cascade,
  relationship_id uuid not null references public.of_subscriber_relationships(id) on delete cascade,
  operational_summary text not null default '',
  personality text,
  interests jsonb not null default '[]'::jsonb,
  likes jsonb not null default '[]'::jsonb,
  dislikes jsonb not null default '[]'::jsonb,
  requests jsonb not null default '[]'::jsonb,
  kinks jsonb not null default '[]'::jsonb,
  conversation_tone text,
  current_topics jsonb not null default '[]'::jsonb,
  important_reminders jsonb not null default '[]'::jsonb,
  summary_version integer not null default 1,
  model text,
  source_event_id uuid references public.of_events(id) on delete set null,
  refreshed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, subscriber_id),
  unique (relationship_id)
);

create trigger set_of_relationship_summaries_updated_at
before update on public.of_relationship_summaries
for each row execute function public.set_updated_at();

create table if not exists public.of_relationship_timeline (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  subscriber_id uuid references public.of_subscribers(id) on delete set null,
  relationship_id uuid references public.of_subscriber_relationships(id) on delete cascade,
  source_event_id uuid references public.of_events(id) on delete set null,
  timeline_type text not null check (timeline_type in ('subscription', 'renewal', 'ppv_purchase', 'tip', 'custom_purchase', 'message', 'ai_action', 'operator_action', 'automation', 'state_change', 'sync', 'context_event')),
  title text not null,
  detail text,
  actor text not null default 'system' check (actor in ('subscriber', 'creator', 'operator', 'automation', 'ai', 'system')),
  amount numeric(12, 2),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists of_relationship_timeline_relationship_idx
on public.of_relationship_timeline (relationship_id, occurred_at desc);

create unique index if not exists of_relationship_timeline_event_type_key
on public.of_relationship_timeline (source_event_id, timeline_type)
where source_event_id is not null and timeline_type <> 'automation';

create table if not exists public.of_context_events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.of_creators(id) on delete cascade,
  subscriber_id uuid references public.of_subscribers(id) on delete set null,
  relationship_id uuid references public.of_subscriber_relationships(id) on delete cascade,
  source_event_id uuid references public.of_events(id) on delete set null,
  event_type text not null check (event_type in ('vip_detected', 'churn_risk_changed', 'revenue_milestone', 'coaching_opportunity', 'subscriber_reactivated', 'ai_relationship_summary_updated')),
  payload jsonb not null default '{}'::jsonb,
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'delivered', 'failed', 'skipped')),
  emitted_at timestamptz not null default now(),
  delivered_at timestamptz,
  error_message text
);

create index if not exists of_context_events_pending_idx
on public.of_context_events (delivery_status, emitted_at);

alter table public.of_subscriber_relationships enable row level security;
alter table public.of_relationship_summaries enable row level security;
alter table public.of_relationship_timeline enable row level security;
alter table public.of_context_events enable row level security;

grant select on public.of_subscriber_relationships to authenticated;
grant select on public.of_relationship_summaries to authenticated;
grant select on public.of_relationship_timeline to authenticated;
grant select on public.of_context_events to authenticated;

grant select, insert, update, delete on public.of_subscriber_relationships to service_role;
grant select, insert, update, delete on public.of_relationship_summaries to service_role;
grant select, insert, update, delete on public.of_relationship_timeline to service_role;
grant select, insert, update, delete on public.of_context_events to service_role;

drop policy if exists "agency users can read subscriber relationships" on public.of_subscriber_relationships;
create policy "agency users can read subscriber relationships"
on public.of_subscriber_relationships for select to authenticated using (true);

drop policy if exists "agency users can read relationship summaries" on public.of_relationship_summaries;
create policy "agency users can read relationship summaries"
on public.of_relationship_summaries for select to authenticated using (true);

drop policy if exists "agency users can read relationship timeline" on public.of_relationship_timeline;
create policy "agency users can read relationship timeline"
on public.of_relationship_timeline for select to authenticated using (true);

drop policy if exists "agency users can read relationship context events" on public.of_context_events;
create policy "agency users can read relationship context events"
on public.of_context_events for select to authenticated using (true);

create or replace function public.of_clamp_score(value numeric)
returns integer
language sql
immutable
as $$
  select greatest(0, least(100, coalesce(round(value), 0)))::integer;
$$;

create or replace function public.of_relationship_state(
  subscription_status text,
  lifetime_spend numeric,
  conversation_count integer,
  last_seen_at timestamptz,
  previous_state text
)
returns text
language plpgsql
stable
as $$
declare
  normalized_status text := lower(coalesce(subscription_status, ''));
  days_since_seen integer;
begin
  if last_seen_at is not null then
    days_since_seen := floor(extract(epoch from (now() - last_seen_at)) / 86400)::integer;
  end if;

  if normalized_status in ('expired', 'cancelled', 'canceled', 'inactive') then
    return 'expired';
  end if;

  if previous_state = 'expired' and normalized_status in ('active', 'subscribed', 'trialing') then
    return 'reactivated';
  end if;

  if days_since_seen is not null and days_since_seen >= 21 then
    return 'at_risk';
  end if;

  if days_since_seen is not null and days_since_seen >= 10 then
    return 'cooling';
  end if;

  if coalesce(lifetime_spend, 0) >= 500 or coalesce(conversation_count, 0) >= 25 then
    return 'vip';
  end if;

  if coalesce(conversation_count, 0) >= 3 or coalesce(lifetime_spend, 0) > 0 then
    return 'engaged';
  end if;

  if normalized_status in ('active', 'subscribed', 'trialing') then
    return 'new_subscriber';
  end if;

  return 'prospect';
end;
$$;

create or replace function public.of_recalculate_relationship_scores(p_relationship_id uuid)
returns void
language plpgsql
as $$
declare
  rel public.of_subscriber_relationships%rowtype;
  days_since_seen integer;
  new_vip integer;
  new_engagement integer;
  new_churn integer;
  new_relationship integer;
  new_state text;
  old_churn integer;
  old_state text;
begin
  select * into rel from public.of_subscriber_relationships where id = p_relationship_id;
  if not found then
    return;
  end if;

  if rel.last_seen_at is not null then
    days_since_seen := floor(extract(epoch from (now() - rel.last_seen_at)) / 86400)::integer;
  end if;

  old_churn := rel.churn_risk;
  old_state := rel.relationship_state;
  new_vip := public.of_clamp_score((rel.lifetime_spend / 10) + (rel.purchase_count * 8) + (rel.conversation_count * 1.5));
  new_engagement := public.of_clamp_score((rel.conversation_count * 5) + case when rel.last_subscriber_message_at > now() - interval '7 days' then 25 else 0 end);
  new_churn := public.of_clamp_score(
    case when lower(coalesce(rel.current_subscription_status, '')) in ('expired', 'cancelled', 'canceled', 'inactive') then 80 else 0 end
    + coalesce(days_since_seen, 0) * 3
    - (new_engagement / 5)
  );
  new_relationship := public.of_clamp_score((new_vip * 0.35) + (new_engagement * 0.45) + ((100 - new_churn) * 0.20));
  new_state := public.of_relationship_state(rel.current_subscription_status, rel.lifetime_spend, rel.conversation_count, rel.last_seen_at, rel.relationship_state);

  update public.of_subscriber_relationships
  set
    vip_score = new_vip,
    engagement_score = new_engagement,
    churn_risk = new_churn,
    relationship_score = new_relationship,
    relationship_state = new_state,
    relationship_stage = replace(new_state, '_', ' '),
    average_order_value = case when purchase_count > 0 then round(lifetime_spend / purchase_count, 2) else 0 end,
    revenue_trend = case
      when lifetime_spend = 0 then 'unknown'
      when last_purchase_at > now() - interval '14 days' and lifetime_spend >= 500 then 'rising'
      when last_purchase_at > now() - interval '30 days' then 'steady'
      else 'cooling'
    end,
    recommended_next_action = case
      when new_churn >= 70 then 'Prioritise retention outreach'
      when new_vip >= 75 then 'Review VIP upsell or personal thank-you'
      when new_engagement >= 60 then 'Continue active conversation'
      when new_state = 'new_subscriber' then 'Send welcome message'
      else 'Monitor relationship'
    end
  where id = p_relationship_id;

  if old_state = 'expired' and new_state = 'reactivated' then
    insert into public.of_context_events (creator_id, subscriber_id, relationship_id, event_type, payload)
    values (rel.creator_id, rel.subscriber_id, rel.id, 'subscriber_reactivated', jsonb_build_object('previous_state', old_state, 'state', new_state));
  end if;

  if old_churn is distinct from new_churn and abs(coalesce(old_churn, 0) - new_churn) >= 20 then
    insert into public.of_context_events (creator_id, subscriber_id, relationship_id, event_type, payload)
    values (rel.creator_id, rel.subscriber_id, rel.id, 'churn_risk_changed', jsonb_build_object('previous_churn_risk', old_churn, 'churn_risk', new_churn));
  end if;

  if rel.vip_score < 75 and new_vip >= 75 then
    insert into public.of_context_events (creator_id, subscriber_id, relationship_id, event_type, payload)
    values (rel.creator_id, rel.subscriber_id, rel.id, 'vip_detected', jsonb_build_object('vip_score', new_vip, 'lifetime_spend', rel.lifetime_spend));
  end if;
end;
$$;

create or replace function public.of_upsert_relationship_from_subscriber(p_subscriber_id uuid)
returns uuid
language plpgsql
as $$
declare
  sub public.of_subscribers%rowtype;
  rel_id uuid;
  raw jsonb;
begin
  select * into sub from public.of_subscribers where id = p_subscriber_id;
  if not found then
    return null;
  end if;

  raw := coalesce(sub.raw_payload, '{}'::jsonb);

  insert into public.of_subscriber_relationships (
    creator_id,
    subscriber_id,
    betterfans_subscriber_id,
    username,
    display_name,
    avatar_url,
    country,
    current_subscription_status,
    subscription_tier,
    first_seen_at,
    last_seen_at,
    lifetime_spend
  )
  values (
    sub.creator_id,
    sub.id,
    sub.betterfans_subscriber_id,
    sub.username,
    sub.display_name,
    raw #>> '{avatar}',
    coalesce(raw #>> '{country}', raw #>> '{location,country}'),
    coalesce(sub.status, sub.subscription_status),
    coalesce(raw #>> '{tier}', raw #>> '{subscription,tier}'),
    sub.created_at,
    coalesce(sub.last_seen_at, sub.last_sync_at),
    coalesce(sub.total_spend, 0)
  )
  on conflict (creator_id, subscriber_id) do update
  set
    betterfans_subscriber_id = excluded.betterfans_subscriber_id,
    username = excluded.username,
    display_name = excluded.display_name,
    avatar_url = coalesce(excluded.avatar_url, public.of_subscriber_relationships.avatar_url),
    country = coalesce(excluded.country, public.of_subscriber_relationships.country),
    current_subscription_status = excluded.current_subscription_status,
    subscription_tier = coalesce(excluded.subscription_tier, public.of_subscriber_relationships.subscription_tier),
    first_seen_at = least(public.of_subscriber_relationships.first_seen_at, excluded.first_seen_at),
    last_seen_at = greatest(coalesce(public.of_subscriber_relationships.last_seen_at, excluded.last_seen_at), coalesce(excluded.last_seen_at, public.of_subscriber_relationships.last_seen_at)),
    lifetime_spend = greatest(public.of_subscriber_relationships.lifetime_spend, excluded.lifetime_spend)
  returning id into rel_id;

  insert into public.of_relationship_summaries (creator_id, subscriber_id, relationship_id, operational_summary)
  values (sub.creator_id, sub.id, rel_id, 'No relationship summary yet.')
  on conflict (relationship_id) do nothing;

  perform public.of_recalculate_relationship_scores(rel_id);
  return rel_id;
end;
$$;

create or replace function public.of_subscriber_relationship_sync_trigger()
returns trigger
language plpgsql
as $$
begin
  perform public.of_upsert_relationship_from_subscriber(new.id);
  return new;
end;
$$;

drop trigger if exists sync_of_subscriber_relationship on public.of_subscribers;
create trigger sync_of_subscriber_relationship
after insert or update on public.of_subscribers
for each row execute function public.of_subscriber_relationship_sync_trigger();

create or replace function public.of_apply_relationship_event(p_event_id uuid)
returns uuid
language plpgsql
as $$
declare
  evt public.of_events%rowtype;
  payload jsonb;
  fan_id text;
  subscriber_uuid uuid;
  rel_id uuid;
  occurred timestamptz;
  amount numeric(12, 2);
  transaction_kind text;
  message_actor text;
  timeline_kind text;
  old_lifetime numeric(12, 2);
  new_lifetime numeric(12, 2);
  old_state text;
  new_state text;
begin
  select * into evt from public.of_events where id = p_event_id;
  if not found then
    return null;
  end if;

  payload := coalesce(evt.payload, '{}'::jsonb);
  fan_id := coalesce(
    payload #>> '{fanId}',
    payload #>> '{fan_id}',
    payload #>> '{subscriberId}',
    payload #>> '{subscriber_id}',
    payload #>> '{userId}',
    payload #>> '{user_id}',
    payload #>> '{platform_user_id}',
    payload #>> '{fan,id}',
    payload #>> '{subscriber,id}',
    payload #>> '{user,id}',
    payload #>> '{fan,username}',
    payload #>> '{subscriber,username}',
    payload #>> '{username}'
  );

  if fan_id is null then
    return null;
  end if;

  select id into subscriber_uuid
  from public.of_subscribers
  where creator_id = evt.creator_id
    and (
      betterfans_subscriber_id = fan_id
      or platform_subscriber_id = fan_id
      or username = fan_id
    )
  limit 1;

  if subscriber_uuid is null and evt.event_type in ('subscriber_created', 'chat_message', 'transaction_created') then
    insert into public.of_subscribers (
      creator_id,
      betterfans_subscriber_id,
      platform_subscriber_id,
      username,
      display_name,
      status,
      subscription_status,
      total_spend,
      last_seen_at,
      raw_payload,
      last_sync_at
    )
    values (
      evt.creator_id,
      fan_id,
      fan_id,
      coalesce(payload #>> '{username}', payload #>> '{fan,username}', payload #>> '{subscriber,username}'),
      coalesce(payload #>> '{displayName}', payload #>> '{display_name}', payload #>> '{fan,displayName}', payload #>> '{subscriber,displayName}'),
      case when evt.event_type = 'subscriber_created' then 'active' else null end,
      case when evt.event_type = 'subscriber_created' then 'active' else null end,
      0,
      coalesce(evt.received_at, evt.created_at),
      payload,
      now()
    )
    on conflict (creator_id, betterfans_subscriber_id) do update
    set
      username = coalesce(excluded.username, public.of_subscribers.username),
      display_name = coalesce(excluded.display_name, public.of_subscribers.display_name),
      last_seen_at = greatest(coalesce(public.of_subscribers.last_seen_at, excluded.last_seen_at), excluded.last_seen_at),
      raw_payload = public.of_subscribers.raw_payload || excluded.raw_payload,
      last_sync_at = now()
    returning id into subscriber_uuid;
  end if;

  if subscriber_uuid is null then
    return null;
  end if;

  rel_id := public.of_upsert_relationship_from_subscriber(subscriber_uuid);
  occurred := coalesce(evt.received_at, evt.created_at, now());

  select relationship_state, lifetime_spend into old_state, old_lifetime
  from public.of_subscriber_relationships
  where id = rel_id;

  if evt.event_type = 'subscriber_created' then
    update public.of_subscriber_relationships
    set
      current_subscription_status = 'active',
      last_seen_at = greatest(coalesce(last_seen_at, occurred), occurred),
      last_event_id = evt.id
    where id = rel_id;

    insert into public.of_relationship_timeline (creator_id, subscriber_id, relationship_id, source_event_id, timeline_type, title, detail, actor, occurred_at, metadata)
    values (evt.creator_id, subscriber_uuid, rel_id, evt.id, 'subscription', 'Subscriber created', 'Subscription became active.', 'subscriber', occurred, payload)
    on conflict do nothing;
  elsif evt.event_type = 'subscriber_expired' then
    update public.of_subscriber_relationships
    set current_subscription_status = 'expired', last_event_id = evt.id
    where id = rel_id;

    insert into public.of_relationship_timeline (creator_id, subscriber_id, relationship_id, source_event_id, timeline_type, title, detail, actor, occurred_at, metadata)
    values (evt.creator_id, subscriber_uuid, rel_id, evt.id, 'subscription', 'Subscriber expired', 'Subscription expired.', 'system', occurred, payload)
    on conflict do nothing;
  elsif evt.event_type = 'chat_message' then
    message_actor := lower(coalesce(payload #>> '{actor}', payload #>> '{sender_type}', payload #>> '{message,sender_type}', 'subscriber'));
    update public.of_subscriber_relationships
    set
      conversation_count = conversation_count + 1,
      last_seen_at = greatest(coalesce(last_seen_at, occurred), occurred),
      last_subscriber_message_at = case when message_actor in ('subscriber', 'fan', 'user') then occurred else last_subscriber_message_at end,
      last_creator_response_at = case when message_actor in ('creator', 'operator') then occurred else last_creator_response_at end,
      last_event_id = evt.id
    where id = rel_id;

    insert into public.of_relationship_timeline (creator_id, subscriber_id, relationship_id, source_event_id, timeline_type, title, detail, actor, occurred_at, metadata)
    values (
      evt.creator_id,
      subscriber_uuid,
      rel_id,
      evt.id,
      'message',
      'Chat message',
      left(coalesce(payload #>> '{text}', payload #>> '{message,text}', payload #>> '{body}', 'Message received.'), 240),
      case when message_actor in ('creator', 'operator') then 'creator' else 'subscriber' end,
      occurred,
      payload
    )
    on conflict do nothing;
  elsif evt.event_type = 'transaction_created' then
    amount := coalesce(nullif(payload #>> '{amount}', '')::numeric, nullif(payload #>> '{transaction,amount}', '')::numeric, 0);
    transaction_kind := lower(coalesce(payload #>> '{transactionType}', payload #>> '{transaction_type}', payload #>> '{type}', payload #>> '{transaction,type}', 'purchase'));
    timeline_kind := case
      when transaction_kind like '%tip%' then 'tip'
      when transaction_kind like '%custom%' then 'custom_purchase'
      when transaction_kind like '%ppv%' then 'ppv_purchase'
      when transaction_kind like '%subscription%' or transaction_kind like '%renewal%' then 'renewal'
      else 'ppv_purchase'
    end;

    update public.of_subscriber_relationships
    set
      lifetime_spend = lifetime_spend + amount,
      subscription_spend = subscription_spend + case when timeline_kind = 'renewal' then amount else 0 end,
      ppv_purchases = ppv_purchases + case when timeline_kind = 'ppv_purchase' then amount else 0 end,
      tips = tips + case when timeline_kind = 'tip' then amount else 0 end,
      customs_purchased = customs_purchased + case when timeline_kind = 'custom_purchase' then amount else 0 end,
      purchase_count = purchase_count + 1,
      last_purchase_at = occurred,
      last_seen_at = greatest(coalesce(last_seen_at, occurred), occurred),
      last_event_id = evt.id
    where id = rel_id;

    insert into public.of_relationship_timeline (creator_id, subscriber_id, relationship_id, source_event_id, timeline_type, title, detail, actor, amount, occurred_at, metadata)
    values (evt.creator_id, subscriber_uuid, rel_id, evt.id, timeline_kind, 'Transaction created', transaction_kind, 'subscriber', amount, occurred, payload)
    on conflict do nothing;
  else
    insert into public.of_relationship_timeline (creator_id, subscriber_id, relationship_id, source_event_id, timeline_type, title, detail, actor, occurred_at, metadata)
    values (evt.creator_id, subscriber_uuid, rel_id, evt.id, 'sync', evt.event_type, 'Relationship event recorded.', 'system', occurred, payload)
    on conflict do nothing;
  end if;

  perform public.of_recalculate_relationship_scores(rel_id);

  select relationship_state, lifetime_spend into new_state, new_lifetime
  from public.of_subscriber_relationships
  where id = rel_id;

  if coalesce(old_lifetime, 0) < 100 and coalesce(new_lifetime, 0) >= 100 then
    insert into public.of_context_events (creator_id, subscriber_id, relationship_id, source_event_id, event_type, payload)
    values (evt.creator_id, subscriber_uuid, rel_id, evt.id, 'revenue_milestone', jsonb_build_object('milestone', 100, 'lifetime_spend', new_lifetime));
  end if;

  if coalesce(old_lifetime, 0) < 500 and coalesce(new_lifetime, 0) >= 500 then
    insert into public.of_context_events (creator_id, subscriber_id, relationship_id, source_event_id, event_type, payload)
    values (evt.creator_id, subscriber_uuid, rel_id, evt.id, 'revenue_milestone', jsonb_build_object('milestone', 500, 'lifetime_spend', new_lifetime));
  end if;

  if old_state is distinct from new_state then
    insert into public.of_relationship_timeline (creator_id, subscriber_id, relationship_id, source_event_id, timeline_type, title, detail, actor, occurred_at, metadata)
    values (
      evt.creator_id,
      subscriber_uuid,
      rel_id,
      evt.id,
      'state_change',
      'Relationship state changed',
      coalesce(old_state, 'unknown') || ' -> ' || new_state,
      'system',
      occurred,
      jsonb_build_object('previous_state', old_state, 'state', new_state)
    )
    on conflict do nothing;
  end if;

  return rel_id;
end;
$$;

create or replace function public.of_relationship_event_trigger()
returns trigger
language plpgsql
as $$
begin
  perform public.of_apply_relationship_event(new.id);
  return new;
end;
$$;

drop trigger if exists apply_of_relationship_event on public.of_events;
create trigger apply_of_relationship_event
after insert on public.of_events
for each row execute function public.of_relationship_event_trigger();

insert into public.of_subscriber_relationships (
  creator_id,
  subscriber_id,
  betterfans_subscriber_id,
  username,
  display_name,
  current_subscription_status,
  first_seen_at,
  last_seen_at,
  lifetime_spend
)
select
  subscriber.creator_id,
  subscriber.id,
  subscriber.betterfans_subscriber_id,
  subscriber.username,
  subscriber.display_name,
  coalesce(subscriber.status, subscriber.subscription_status),
  subscriber.created_at,
  coalesce(subscriber.last_seen_at, subscriber.last_sync_at),
  coalesce(subscriber.total_spend, 0)
from public.of_subscribers subscriber
on conflict (creator_id, subscriber_id) do nothing;

insert into public.of_relationship_summaries (creator_id, subscriber_id, relationship_id, operational_summary)
select creator_id, subscriber_id, id, 'No relationship summary yet.'
from public.of_subscriber_relationships
on conflict (relationship_id) do nothing;

do $$
declare
  rel record;
begin
  for rel in select id from public.of_subscriber_relationships loop
    perform public.of_recalculate_relationship_scores(rel.id);
  end loop;
end;
$$;
