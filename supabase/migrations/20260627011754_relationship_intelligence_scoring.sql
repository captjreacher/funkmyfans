alter table public.of_subscriber_relationships
add column if not exists revenue_opportunity_score integer not null default 0 check (revenue_opportunity_score between 0 and 100),
add column if not exists urgency_score integer not null default 0 check (urgency_score between 0 and 100),
add column if not exists ai_confidence_score integer not null default 0 check (ai_confidence_score between 0 and 100),
add column if not exists relationship_score_reason text,
add column if not exists revenue_opportunity_score_reason text,
add column if not exists urgency_score_reason text,
add column if not exists churn_risk_reason text,
add column if not exists vip_score_reason text,
add column if not exists engagement_score_reason text,
add column if not exists ai_confidence_score_reason text;

create index if not exists of_relationships_creator_intelligence_scores_idx
on public.of_subscriber_relationships (creator_id, urgency_score desc, revenue_opportunity_score desc, churn_risk desc, vip_score desc);

create or replace function public.of_recalculate_relationship_scores(p_relationship_id uuid)
returns void
language plpgsql
as $$
declare
  rel public.of_subscriber_relationships%rowtype;
  intel record;
  days_since_seen integer := 999;
  days_since_first_seen integer := 999;
  days_since_purchase integer := 999;
  open_tasks integer := 0;
  overdue_tasks integer := 0;
  active_subscription boolean := false;
  expired_subscription boolean := false;
  new_vip integer;
  new_engagement integer;
  new_churn integer;
  new_relationship integer;
  new_revenue integer;
  new_urgency integer;
  new_confidence integer;
  new_state text;
  old_churn integer;
  old_state text;
begin
  select * into rel from public.of_subscriber_relationships where id = p_relationship_id;
  if not found then
    return;
  end if;

  select * into intel
  from public.of_conversation_intelligence
  where relationship_id = rel.id
  order by updated_at desc
  limit 1;

  select count(*), count(*) filter (where due_at is not null and due_at < now())
  into open_tasks, overdue_tasks
  from public.of_tasks
  where creator_id = rel.creator_id
    and status in ('open', 'in_progress', 'waiting')
    and (
      (source_type = 'subscriber' and source_id = rel.id)
      or subscriber_id = rel.subscriber_id
    );

  if rel.last_seen_at is not null then
    days_since_seen := floor(extract(epoch from (now() - rel.last_seen_at)) / 86400)::integer;
  elsif rel.last_subscriber_message_at is not null then
    days_since_seen := floor(extract(epoch from (now() - rel.last_subscriber_message_at)) / 86400)::integer;
  end if;

  if rel.first_seen_at is not null then
    days_since_first_seen := floor(extract(epoch from (now() - rel.first_seen_at)) / 86400)::integer;
  end if;

  if rel.last_purchase_at is not null then
    days_since_purchase := floor(extract(epoch from (now() - rel.last_purchase_at)) / 86400)::integer;
  end if;

  active_subscription := lower(coalesce(rel.current_subscription_status, '')) not in ('', 'expired', 'cancelled', 'canceled', 'inactive');
  expired_subscription := lower(coalesce(rel.current_subscription_status, '')) in ('expired', 'cancelled', 'canceled', 'inactive');
  old_churn := rel.churn_risk;
  old_state := rel.relationship_state;

  new_engagement := public.of_clamp_score(
    least(45, rel.conversation_count * 7)
    + coalesce(intel.engagement_score, 0) * 0.35
    + case when rel.last_subscriber_message_at > now() - interval '7 days' then 18 else 0 end
    + case when rel.last_seen_at > now() - interval '3 days' then 12 else 0 end
    + case when rel.purchase_count > 0 then 8 else 0 end
    - case when days_since_seen > 30 then 18 when days_since_seen > 14 then 9 else 0 end
  );

  new_vip := public.of_clamp_score(
    (rel.lifetime_spend / 8)
    + (rel.purchase_count * 7)
    + (rel.ppv_purchases * 6)
    + (rel.tips / 8)
    + (rel.customs_purchased * 8)
    + (new_engagement * 0.22)
    + greatest(coalesce(intel.vip_potential, 0), coalesce(intel.whale_potential, 0)) * 0.25
  );

  new_revenue := public.of_clamp_score(
    case when active_subscription then 18 when expired_subscription then 6 else 10 end
    + case when rel.purchase_count = 0 then 24 else 0 end
    + case when rel.ppv_purchases = 0 then 18 else least(18, rel.ppv_purchases * 4) end
    + case when rel.customs_purchased = 0 and rel.conversation_count >= 2 then 12 else least(16, rel.customs_purchased * 6) end
    + coalesce(intel.likely_ppv_buyer, 0) * 0.28
    + coalesce(intel.custom_buyer, 0) * 0.22
    + coalesce(intel.tipper, 0) * 0.15
    + new_engagement * 0.20
    + new_vip * 0.12
    - case when expired_subscription then 10 else 0 end
  );

  new_churn := public.of_clamp_score(
    case when expired_subscription then 76 when active_subscription then 8 else 34 end
    + case when days_since_seen > 45 then 35 when days_since_seen > 21 then 24 when days_since_seen > 10 then 12 else 0 end
    + case when rel.automation_paused then 8 else 0 end
    + case when rel.human_takeover then 6 else 0 end
    + least(18, overdue_tasks * 8)
    + coalesce(intel.churn_probability, 0) * 0.25
    - new_engagement * 0.25
    - coalesce(intel.renewal_likelihood, 0) * 0.14
    - case when rel.last_purchase_at > now() - interval '14 days' then 10 else 0 end
  );

  new_urgency := public.of_clamp_score(
    overdue_tasks * 20
    + open_tasks * 6
    + rel.pending_actions * 8
    + rel.pending_approvals * 10
    + case when rel.relationship_state = 'new_subscriber' and rel.conversation_count = 0 then 26 else 0 end
    + case when expired_subscription then 18 else 0 end
    + case when active_subscription and days_since_first_seen <= 2 then 12 else 0 end
    + new_churn * 0.28
    + new_revenue * 0.18
    + new_vip * 0.12
    + case when rel.human_takeover then 10 else 0 end
  );

  new_confidence := public.of_clamp_score(
    coalesce(nullif(intel.confidence, 0), 42 + least(22, rel.conversation_count * 4) + case when rel.purchase_count > 0 then 8 else 0 end + case when rel.last_seen_at is not null then 6 else 0 end - case when rel.conversation_count = 0 then 10 else 0 end)
  );

  new_relationship := public.of_clamp_score(
    new_engagement * 0.34
    + new_vip * 0.20
    + new_revenue * 0.14
    + new_confidence * 0.12
    + (100 - new_churn) * 0.20
  );

  new_state := case
    when expired_subscription then 'expired'
    when new_churn >= 72 then 'at_risk'
    when new_vip >= 78 or rel.lifetime_spend >= 500 then 'vip'
    when days_since_first_seen <= 3 and rel.conversation_count = 0 then 'new_subscriber'
    when rel.conversation_count >= 4 or rel.lifetime_spend > 0 then 'engaged'
    when active_subscription then 'welcomed'
    else 'prospect'
  end;

  update public.of_subscriber_relationships
  set
    vip_score = new_vip,
    engagement_score = new_engagement,
    churn_risk = new_churn,
    relationship_score = new_relationship,
    revenue_opportunity_score = new_revenue,
    urgency_score = new_urgency,
    ai_confidence_score = new_confidence,
    relationship_state = new_state,
    relationship_stage = replace(new_state, '_', ' '),
    average_order_value = case when purchase_count > 0 then round(lifetime_spend / purchase_count, 2) else 0 end,
    revenue_trend = case
      when lifetime_spend = 0 then 'unknown'
      when days_since_purchase <= 14 and lifetime_spend >= 500 then 'rising'
      when days_since_purchase <= 30 then 'steady'
      when days_since_purchase <= 90 then 'cooling'
      else 'declining'
    end,
    recommended_next_action = case
      when new_urgency >= 80 or new_churn >= 75 then 'Prioritise retention outreach'
      when new_state = 'new_subscriber' then 'Send welcome message'
      when new_vip >= 75 then 'Review VIP upsell or personal thank-you'
      when new_revenue >= 70 then 'Offer a relevant PPV or custom content prompt'
      when new_engagement >= 65 then 'Continue active conversation'
      else 'Monitor relationship'
    end,
    relationship_score_reason = case
      when rel.conversation_count = 0 and rel.lifetime_spend = 0 and active_subscription then 'New subscriber with no conversation history yet.'
      when expired_subscription then 'Relationship is constrained by expired subscription status.'
      when new_churn >= 70 then 'Relationship score is held back by elevated churn risk.'
      when new_relationship >= 75 then 'Strong engagement and value signals indicate a healthy relationship.'
      else 'Relationship score reflects current engagement, value, and churn signals.'
    end,
    revenue_opportunity_score_reason = case
      when active_subscription and rel.purchase_count = 0 then 'Active subscriber with no PPV purchases yet.'
      when coalesce(intel.likely_ppv_buyer, 0) >= 70 then 'Conversation intelligence shows a strong PPV buying signal.'
      when rel.ppv_purchases = 0 and rel.customs_purchased = 0 then 'Subscriber has not purchased PPV or custom content yet.'
      else 'Revenue opportunity is based on current spend, engagement, and buyer signals.'
    end,
    urgency_score_reason = case
      when overdue_tasks > 0 then overdue_tasks || ' overdue task' || case when overdue_tasks = 1 then '' else 's' end || ' need attention.'
      when rel.relationship_state = 'new_subscriber' and active_subscription and rel.conversation_count = 0 then 'Welcome message is overdue and subscriber is active.'
      when rel.pending_approvals > 0 then rel.pending_approvals || ' pending approval' || case when rel.pending_approvals = 1 then '' else 's' end || ' require operator review.'
      when new_churn >= 70 then 'High churn risk makes this subscriber time-sensitive.'
      else 'No immediate blocking urgency detected.'
    end,
    churn_risk_reason = case
      when expired_subscription then 'Subscription is expired or inactive.'
      when days_since_seen > 30 then 'Subscriber has not been seen in over 30 days.'
      when overdue_tasks > 0 then 'Overdue follow-up increases churn risk.'
      when new_engagement >= 65 then 'Recent engagement is keeping churn risk lower.'
      else 'Churn risk is moderated by current activity signals.'
    end,
    vip_score_reason = case
      when rel.lifetime_spend >= 500 then 'High lifetime spend marks this subscriber as VIP.'
      when greatest(coalesce(intel.vip_potential, 0), coalesce(intel.whale_potential, 0)) >= 70 then 'Conversation intelligence indicates high VIP potential.'
      when rel.purchase_count >= 5 then 'Repeat purchases indicate VIP potential.'
      else 'VIP score is limited by current spend and purchase history.'
    end,
    engagement_score_reason = case
      when rel.conversation_count = 0 then 'No conversation history has been recorded yet.'
      when days_since_seen <= 7 and rel.conversation_count >= 3 then 'Recent repeated conversation activity is strong.'
      when days_since_seen > 30 then 'Engagement is cooling because recent activity is stale.'
      else 'Engagement is based on available conversation and activity signals.'
    end,
    ai_confidence_score_reason = case
      when intel.id is not null then 'Conversation intelligence is available for this subscriber.'
      when rel.conversation_count = 0 then 'Low confidence because there is little relationship history.'
      else 'Confidence is deterministic and based on partial subscriber signals.'
    end
  where id = p_relationship_id;

  if old_state is distinct from new_state then
    insert into public.of_context_events (creator_id, subscriber_id, relationship_id, event_type, payload)
    values (rel.creator_id, rel.subscriber_id, rel.id, 'subscriber_reactivated', jsonb_build_object('previous_state', old_state, 'state', new_state));
  end if;

  if abs(coalesce(old_churn, 0) - new_churn) >= 20 then
    insert into public.of_context_events (creator_id, subscriber_id, relationship_id, event_type, payload)
    values (rel.creator_id, rel.subscriber_id, rel.id, 'churn_risk_changed', jsonb_build_object('previous_churn_risk', old_churn, 'churn_risk', new_churn));
  end if;

  if new_vip >= 75 and coalesce(rel.vip_score, 0) < 75 then
    insert into public.of_context_events (creator_id, subscriber_id, relationship_id, event_type, payload)
    values (rel.creator_id, rel.subscriber_id, rel.id, 'vip_detected', jsonb_build_object('vip_score', new_vip, 'lifetime_spend', rel.lifetime_spend));
  end if;
end;
$$;

do $$
declare
  rel record;
begin
  for rel in select id from public.of_subscriber_relationships loop
    perform public.of_recalculate_relationship_scores(rel.id);
  end loop;
end;
$$;

with scored_tasks as (
  select
    task.id,
    public.of_clamp_score(
      case when task.status = 'open' then 14 when task.status = 'in_progress' then 18 when task.status = 'waiting' then 8 else 0 end
      + case when task.due_at is not null and task.due_at < now() then 22 when task.due_at::date = now()::date then 12 else 0 end
      + case when task.task_type ilike '%welcome%' or task.rule_name ilike '%welcome%' then 18 else 0 end
      + case when task.task_type ilike '%renewal%' or task.rule_name ilike '%renewal%' then 22 else 0 end
      + case when task.task_type ilike '%churn%' or task.reason ilike '%at risk%' or task.task_type ilike '%expired%' then 24 else 0 end
      + case when task.task_type ilike '%vip%' or task.reason ilike '%vip%' then 24 else 0 end
      + case when task.task_type ilike '%ppv%' or task.task_type ilike '%purchase%' or task.task_type ilike '%transaction%' or task.recommended_action ilike '%offer%' then 24 else 0 end
      + relationship.urgency_score * 0.24
      + relationship.revenue_opportunity_score * 0.18
      + relationship.vip_score * 0.14
      + relationship.churn_risk * 0.20
    ) as new_score,
    concat_ws(
      ', ',
      case when task.due_at is not null and task.due_at < now() then 'Overdue' end,
      case when relationship.urgency_score >= 70 then 'Relationship urgency high' end,
      case when relationship.revenue_opportunity_score >= 70 then 'Revenue opportunity high' end,
      case when relationship.vip_score >= 70 then 'VIP potential high' end,
      case when relationship.churn_risk >= 70 then 'Churn risk high' end,
      case when task.task_type ilike '%welcome%' or task.rule_name ilike '%welcome%' then 'Welcome outstanding' end
    ) as reason
  from public.of_tasks task
  join public.of_subscriber_relationships relationship
    on task.creator_id = relationship.creator_id
   and (
    (task.source_type = 'subscriber' and task.source_id = relationship.id)
    or task.subscriber_id = relationship.subscriber_id
   )
  where task.status in ('open', 'in_progress', 'waiting')
    and (task.priority_score = 75 or task.priority_reason = 'Migrated from static priority high.')
)
update public.of_tasks task
set
  priority_score = scored_tasks.new_score,
  priority = case
    when scored_tasks.new_score >= 85 then 'urgent'
    when scored_tasks.new_score >= 65 then 'high'
    when scored_tasks.new_score >= 40 then 'medium'
    else 'low'
  end,
  priority_reason = coalesce(nullif(scored_tasks.reason, ''), 'Priority recalculated from relationship intelligence.')
from scored_tasks
where task.id = scored_tasks.id;
