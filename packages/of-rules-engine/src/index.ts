import type { OfChat, OfEvent, OfSubscriberRelationship, TaskPriority, TaskStatus } from "@funkmyfans/of-types";
import { summarizeEventType } from "@funkmyfans/of-types";
export * from "./subscriberAgencyIntelligence";

export interface TaskRuleConfig {
  unreadChatThresholdHours: number;
  renewalWindowDays: number;
}

export interface TaskRuleInput {
  chats: OfChat[];
  subscribers: OfSubscriberRelationship[];
  events: OfEvent[];
  now?: Date;
  config?: Partial<TaskRuleConfig>;
}

export interface TaskRuleDraft {
  source_type: "chat" | "subscriber" | "event";
  source_id: string;
  task_type: string;
  rule_name: string;
  rule_version: string;
  priority: TaskPriority;
  priority_score: number;
  priority_reason: string;
  status: Extract<TaskStatus, "open">;
  title: string;
  description: string;
  reason: string;
  evidence: Array<{ label: string; value: string }>;
  confidence: number;
  recommended_action: string;
  suggested_action: string;
  suggested_script: string | null;
  ai_suggestion: Record<string, unknown>;
  due_at: string | null;
  cooldown_hours: number;
}

export interface RelationshipIntelligenceInput {
  relationship: Partial<OfSubscriberRelationship> & Record<string, unknown>;
  tasks?: Array<Record<string, unknown>>;
  events?: Array<Record<string, unknown>>;
  intelligence?: Record<string, unknown> | null;
  now?: Date;
}

export interface RelationshipIntelligenceScores {
  relationship_score: number;
  revenue_opportunity_score: number;
  urgency_score: number;
  churn_risk: number;
  vip_score: number;
  engagement_score: number;
  ai_confidence_score: number;
  relationship_score_reason: string;
  revenue_opportunity_score_reason: string;
  urgency_score_reason: string;
  churn_risk_reason: string;
  vip_score_reason: string;
  engagement_score_reason: string;
  ai_confidence_score_reason: string;
  recommended_next_action: string;
  relationship_state: OfSubscriberRelationship["relationship_state"];
  relationship_stage: string;
  revenue_trend: OfSubscriberRelationship["revenue_trend"];
  average_order_value: number;
}

export interface TaskPriorityInput {
  status?: unknown;
  due_at?: unknown;
  task_type?: unknown;
  rule_name?: unknown;
  title?: unknown;
  reason?: unknown;
  description?: unknown;
  recommended_action?: unknown;
  suggested_action?: unknown;
  priority_score?: unknown;
  priority_reason?: unknown;
}

export interface CalculatedTaskPriority {
  score: number;
  priority: TaskPriority;
  reason: string;
  calculated: boolean;
}

const defaultConfig: TaskRuleConfig = {
  unreadChatThresholdHours: 24,
  renewalWindowDays: 7
};

const ruleVersion = "2026-06-22";
const migratedPriorityReason = "Migrated from static priority high.";

export function generateTaskDrafts(input: TaskRuleInput): TaskRuleDraft[] {
  const now = input.now ?? new Date();
  const config = { ...defaultConfig, ...input.config };
  return [
    ...generateChatTasks(input.chats, now, config),
    ...generateSubscriberTasks(input.subscribers, now, config),
    ...generateEventTasks(input.events, now)
  ];
}

export function calculateRelationshipIntelligence(input: RelationshipIntelligenceInput): RelationshipIntelligenceScores {
  const relationship = input.relationship;
  const tasks = input.tasks ?? [];
  const events = input.events ?? [];
  const intelligence = input.intelligence ?? firstRelatedRecord(relationship.of_conversation_intelligence);
  const now = input.now ?? new Date();
  const status = stringValue(relationship.current_subscription_status).toLowerCase();
  const relationshipState = stringValue(relationship.relationship_state).toLowerCase();
  const lifetimeSpend = numberValue(relationship.lifetime_spend);
  const purchaseCount = numberValue(relationship.purchase_count);
  const ppvPurchases = numberValue(relationship.ppv_purchases);
  const tips = numberValue(relationship.tips);
  const customsPurchased = numberValue(relationship.customs_purchased);
  const conversationCount = numberValue(relationship.conversation_count);
  const pendingActions = numberValue(relationship.pending_actions);
  const pendingApprovals = numberValue(relationship.pending_approvals);
  const activeTasks = tasks.filter((task) => isActiveTaskStatus(stringValue(task.status)));
  const overdueTasks = activeTasks.filter((task) => isOverdue(task.due_at, now));
  const daysSinceFirstSeen = ageDays(relationship.first_seen_at as string | null | undefined, now);
  const daysSinceSeen = ageDays((relationship.last_seen_at ?? relationship.last_subscriber_message_at) as string | null | undefined, now);
  const daysSincePurchase = ageDays(relationship.last_purchase_at as string | null | undefined, now);
  const active = isActiveSubscription(status);
  const expired = isExpiredSubscription(status) || relationshipState === "expired";
  const hasConversation = conversationCount > 0;
  const conversationEngagement = numberValue(intelligence?.engagement_score);
  const sentimentScore = numberValue(intelligence?.sentiment_score, 50);
  const likelyPpvBuyer = numberValue(intelligence?.likely_ppv_buyer);
  const customBuyer = numberValue(intelligence?.custom_buyer);
  const tipper = numberValue(intelligence?.tipper);
  const renewalLikelihood = numberValue(intelligence?.renewal_likelihood);
  const intelligenceChurn = numberValue(intelligence?.churn_probability);
  const intelligenceVip = Math.max(numberValue(intelligence?.vip_potential), numberValue(intelligence?.whale_potential));
  const intelligenceConfidence = numberValue(intelligence?.confidence);

  const engagementScore = clampScore(
    Math.min(45, conversationCount * 7) +
      (conversationEngagement ? conversationEngagement * 0.35 : 0) +
      (lastWithinDays(relationship.last_subscriber_message_at, now, 7) ? 18 : 0) +
      (lastWithinDays(relationship.last_seen_at, now, 3) ? 12 : 0) +
      (purchaseCount > 0 ? 8 : 0) -
      (daysSinceSeen > 30 ? 18 : daysSinceSeen > 14 ? 9 : 0)
  );

  const vipScore = clampScore(
    lifetimeSpend / 8 +
      purchaseCount * 7 +
      ppvPurchases * 6 +
      tips / 8 +
      customsPurchased * 8 +
      engagementScore * 0.22 +
      intelligenceVip * 0.25
  );

  const revenueOpportunityScore = clampScore(
    (active ? 18 : expired ? 6 : 10) +
      (purchaseCount === 0 ? 24 : 0) +
      (ppvPurchases === 0 ? 18 : Math.min(18, ppvPurchases * 4)) +
      (customsPurchased === 0 && conversationCount >= 2 ? 12 : Math.min(16, customsPurchased * 6)) +
      likelyPpvBuyer * 0.28 +
      customBuyer * 0.22 +
      tipper * 0.15 +
      engagementScore * 0.2 +
      vipScore * 0.12 -
      (expired ? 10 : 0)
  );

  const churnRisk = clampScore(
    (expired ? 76 : active ? 8 : 34) +
      (daysSinceSeen > 45 ? 35 : daysSinceSeen > 21 ? 24 : daysSinceSeen > 10 ? 12 : 0) +
      (relationship.automation_paused ? 8 : 0) +
      (relationship.human_takeover ? 6 : 0) +
      (overdueTasks.length ? Math.min(18, overdueTasks.length * 8) : 0) +
      intelligenceChurn * 0.25 -
      engagementScore * 0.25 -
      renewalLikelihood * 0.14 -
      (lastWithinDays(relationship.last_purchase_at, now, 14) ? 10 : 0)
  );

  const urgencyScore = clampScore(
    overdueTasks.length * 20 +
      activeTasks.length * 6 +
      pendingActions * 8 +
      pendingApprovals * 10 +
      (relationshipState === "new_subscriber" && !hasConversation ? 26 : 0) +
      (expired ? 18 : 0) +
      (active && daysSinceFirstSeen <= 2 ? 12 : 0) +
      churnRisk * 0.28 +
      revenueOpportunityScore * 0.18 +
      vipScore * 0.12 +
      (relationship.human_takeover ? 10 : 0)
  );

  const aiConfidenceScore = clampScore(
    intelligenceConfidence ||
      42 +
        Math.min(22, conversationCount * 4) +
        Math.min(18, events.length * 3) +
        (purchaseCount > 0 ? 8 : 0) +
        (relationship.last_seen_at ? 6 : 0) -
        (!hasConversation ? 10 : 0)
  );

  const relationshipScore = clampScore(
    engagementScore * 0.34 +
      vipScore * 0.2 +
      revenueOpportunityScore * 0.14 +
      aiConfidenceScore * 0.12 +
      (100 - churnRisk) * 0.2
  );

  const nextState = relationshipStateFor({ active, expired, lifetimeSpend, conversationCount, churnRisk, vipScore, daysSinceFirstSeen });
  const revenueTrend = revenueTrendFor(lifetimeSpend, daysSincePurchase);

  return {
    relationship_score: relationshipScore,
    revenue_opportunity_score: revenueOpportunityScore,
    urgency_score: urgencyScore,
    churn_risk: churnRisk,
    vip_score: vipScore,
    engagement_score: engagementScore,
    ai_confidence_score: aiConfidenceScore,
    relationship_score_reason: relationshipReason({ relationshipScore, active, expired, hasConversation, lifetimeSpend, churnRisk, engagementScore }),
    revenue_opportunity_score_reason: revenueReason({ active, purchaseCount, ppvPurchases, customsPurchased, likelyPpvBuyer, revenueOpportunityScore }),
    urgency_score_reason: urgencyReason({ overdueTasks: overdueTasks.length, activeTasks: activeTasks.length, pendingActions, pendingApprovals, relationshipState, hasConversation, active, churnRisk, urgencyScore }),
    churn_risk_reason: churnReason({ expired, daysSinceSeen, churnRisk, engagementScore, overdueTasks: overdueTasks.length }),
    vip_score_reason: vipReason({ lifetimeSpend, purchaseCount, vipScore, intelligenceVip }),
    engagement_score_reason: engagementReason({ conversationCount, daysSinceSeen, engagementScore, hasConversation }),
    ai_confidence_score_reason: aiConfidenceReason({ aiConfidenceScore, hasIntelligence: Boolean(intelligence), conversationCount, events: events.length }),
    recommended_next_action: recommendedActionFor({ urgencyScore, churnRisk, vipScore, revenueOpportunityScore, engagementScore, nextState }),
    relationship_state: nextState,
    relationship_stage: nextState.replaceAll("_", " "),
    revenue_trend: revenueTrend,
    average_order_value: purchaseCount > 0 ? roundMoney(lifetimeSpend / purchaseCount) : 0
  };
}

export function getDisplayTaskPriority(task: TaskPriorityInput, relationship?: Partial<OfSubscriberRelationship> | null): CalculatedTaskPriority {
  if (task.priority_score == null || task.priority_reason === migratedPriorityReason) {
    return calculateTaskPriority(task, relationship);
  }

  const score = clampScore(numberValue(task.priority_score));
  return {
    score,
    priority: priorityFromScore(score),
    reason: typeof task.priority_reason === "string" && task.priority_reason.trim() ? task.priority_reason : "Stored priority score.",
    calculated: false
  };
}

export function calculateTaskPriority(task: TaskPriorityInput, relationship?: Partial<OfSubscriberRelationship> | null): CalculatedTaskPriority {
  let score = 0;
  const reasons: string[] = [];
  const now = new Date();
  const status = stringValue(task.status);
  const dueAt = typeof task.due_at === "string" && task.due_at ? new Date(task.due_at) : null;

  if (status === "open") add(14, "Open task");
  if (status === "in_progress") add(18, "In progress");
  if (status === "waiting") add(8, "Waiting on follow-up");
  if (dueAt && dueAt.getTime() < now.getTime() && isActiveTaskStatus(status)) add(22, "Overdue");
  else if (dueAt && isSameDay(dueAt, now)) add(12, "Due today");

  const searchableTask = [
    task.task_type,
    task.rule_name,
    task.title,
    task.reason,
    task.description,
    task.recommended_action,
    task.suggested_action
  ].filter(Boolean).join(" ").toLowerCase();

  if (searchableTask.includes("send_welcome_message") || searchableTask.includes("welcome")) add(18, "Welcome outstanding");
  if (searchableTask.includes("renewal")) add(22, "Renewal opportunity");
  if (searchableTask.includes("churn") || searchableTask.includes("at risk") || searchableTask.includes("expired")) add(24, "Churn risk");
  if (searchableTask.includes("vip")) add(24, "VIP follow-up");
  if (searchableTask.includes("ppv") || searchableTask.includes("purchase") || searchableTask.includes("offer") || searchableTask.includes("transaction")) add(24, "Revenue opportunity");
  if (searchableTask.includes("manual")) add(10, "Manual task");
  if (searchableTask.includes("automation")) add(12, "Automation needs review");

  if (relationship) {
    const relUrgency = numberValue(relationship.urgency_score);
    const relRevenue = numberValue(relationship.revenue_opportunity_score);
    const relVip = numberValue(relationship.vip_score);
    const relChurn = numberValue(relationship.churn_risk);
    const relEngagement = numberValue(relationship.engagement_score);
    const subscription = stringValue(relationship.current_subscription_status).toLowerCase();

    add(relUrgency * 0.24, relUrgency >= 70 ? "Relationship urgency high" : "Relationship urgency signal");
    add(relRevenue * 0.18, relRevenue >= 70 ? "Revenue opportunity high" : "Revenue opportunity signal");
    add(relVip * 0.14, relVip >= 70 ? "VIP potential high" : "VIP signal");
    add(relChurn * 0.2, relChurn >= 70 ? "Churn risk high" : "Churn risk signal");
    if (relationship.relationship_state === "new_subscriber") add(10, "New subscriber");
    if (subscription.includes("active")) add(6, "Active subscriber");
    if (relationship.relationship_state === "expired" || subscription.includes("expired")) add(8, "Expired subscriber");
    if (relEngagement >= 70) add(6, "Strong engagement");
  }

  const cappedScore = clampScore(score);
  const uniqueReasons = Array.from(new Set(reasons.filter(Boolean)));
  return {
    score: cappedScore,
    priority: priorityFromScore(cappedScore),
    reason: uniqueReasons.length ? `${uniqueReasons.slice(0, 5).join(", ")}.` : "No high-priority signals detected.",
    calculated: true
  };

  function add(points: number, reason: string) {
    if (!Number.isFinite(points) || points <= 0) return;
    score += points;
    reasons.push(reason);
  }
}

function generateChatTasks(chats: OfChat[], now: Date, config: TaskRuleConfig): TaskRuleDraft[] {
  const drafts: TaskRuleDraft[] = [];

  for (const chat of chats) {
    const fan = chat.fan_username || chat.fan_display_name || chat.platform_user_id || chat.platform_chat_id;

    if (chat.priority && chat.unread) {
      const hoursWaiting = ageHours(chat.last_activity_at ?? chat.last_message_at, now);
      drafts.push({
        source_type: "chat",
        source_id: chat.id,
        task_type: "respond_to_priority_fan",
        rule_name: "respond_to_priority_fan",
        rule_version: ruleVersion,
        priority: "high",
        priority_score: clampScore(78 + Math.min(15, hoursWaiting)),
        priority_reason: "Priority chat has unread activity and should be handled quickly.",
        status: "open",
        title: `Respond to priority fan ${fan}`,
        description: "Chat is marked priority and has unread activity.",
        reason: "Priority chat is unread.",
        evidence: [
          { label: "Priority chat", value: "yes" },
          { label: "Unread", value: chat.unread_count ? `${chat.unread_count} unread` : "yes" },
          { label: "Last activity", value: formatEvidenceDate(chat.last_activity_at ?? chat.last_message_at) }
        ],
        confidence: 94,
        recommended_action: "Open the chat and respond before the priority SLA is missed.",
        suggested_action: "open_chat",
        suggested_script: null,
        ai_suggestion: {
          expected_outcome: "Faster response time for a high-value conversation.",
          confidence: 82
        },
        due_at: addHours(now, 4).toISOString(),
        cooldown_hours: 12
      });
    }

    if (chat.unread && isOlderThan(chat.last_activity_at ?? chat.last_message_at, now, config.unreadChatThresholdHours)) {
      const hoursWaiting = ageHours(chat.last_activity_at ?? chat.last_message_at, now);
      drafts.push({
        source_type: "chat",
        source_id: chat.id,
        task_type: "follow_up_unread_chat",
        rule_name: "follow_up_unread_chat",
        rule_version: ruleVersion,
        priority: "medium",
        priority_score: clampScore(52 + Math.min(25, hoursWaiting - config.unreadChatThresholdHours)),
        priority_reason: `Unread chat is older than ${config.unreadChatThresholdHours} hours.`,
        status: "open",
        title: `Follow up unread chat with ${fan}`,
        description: `Unread chat activity is older than ${config.unreadChatThresholdHours} hours.`,
        reason: `Subscriber has waited more than ${config.unreadChatThresholdHours} hours for a response.`,
        evidence: [
          { label: "Unread", value: chat.unread_count ? `${chat.unread_count} unread` : "yes" },
          { label: "Hours waiting", value: String(Math.round(hoursWaiting)) },
          { label: "Last activity", value: formatEvidenceDate(chat.last_activity_at ?? chat.last_message_at) }
        ],
        confidence: 88,
        recommended_action: "Open chat and send a concise reply.",
        suggested_action: "open_chat",
        suggested_script: null,
        ai_suggestion: {
          expected_outcome: "Recover conversation momentum.",
          confidence: 76
        },
        due_at: addHours(now, 12).toISOString(),
        cooldown_hours: 24
      });
    }
  }

  return drafts;
}

function generateSubscriberTasks(subscribers: OfSubscriberRelationship[], now: Date, config: TaskRuleConfig): TaskRuleDraft[] {
  const drafts: TaskRuleDraft[] = [];
  const renewalWindowEnd = addDays(now, config.renewalWindowDays);

  for (const subscriber of subscribers) {
    const fan = subscriber.username || subscriber.display_name || subscriber.betterfans_subscriber_id;
    const status = (subscriber.current_subscription_status ?? "").toLowerCase();
    const relationshipState = (subscriber.relationship_state ?? "").toLowerCase();
    const recommendedNextAction = (subscriber.recommended_next_action ?? "").toLowerCase();

    if (
      relationshipState.includes("new_subscriber") ||
      relationshipState.includes("new subscriber") ||
      recommendedNextAction.includes("welcome")
    ) {
      const score = clampScore(72 + Math.min(20, subscriber.vip_score / 5) + (subscriber.churn_risk > 50 ? 8 : 0));
      drafts.push({
        source_type: "subscriber",
        source_id: subscriber.id,
        task_type: "send_welcome_message",
        rule_name: "send_welcome_message",
        rule_version: ruleVersion,
        priority: "high",
        priority_score: score,
        priority_reason: "New subscriber relationship requires a welcome touchpoint.",
        status: "open",
        title: `Send welcome message to ${fan}`,
        description: subscriber.recommended_next_action ?? "New subscriber should receive a welcome message.",
        reason: "Subscriber is in the new subscriber relationship state and no welcome task has been completed from this rule.",
        evidence: [
          { label: "Relationship state", value: subscriber.relationship_state.replaceAll("_", " ") },
          { label: "Recommended next action", value: subscriber.recommended_next_action ?? "Send welcome message" },
          { label: "First seen", value: formatEvidenceDate(subscriber.first_seen_at) },
          { label: "Lifetime spend", value: money(subscriber.lifetime_spend) }
        ],
        confidence: 96,
        recommended_action: "Send Welcome Script A as a draft for approval.",
        suggested_action: "send_welcome",
        suggested_script: "New Subscriber Welcome",
        ai_suggestion: {
          suggested_script: "New Subscriber Welcome",
          confidence: 86,
          expected_outcome: "Increase first-day engagement.",
          estimated_conversion: "medium"
        },
        due_at: addHours(now, 2).toISOString(),
        cooldown_hours: 0
      });
    }

    if (status.includes("expired")) {
      drafts.push({
        source_type: "subscriber",
        source_id: subscriber.id,
        task_type: "review_expired_subscriber",
        rule_name: "review_expired_subscriber",
        rule_version: ruleVersion,
        priority: "medium",
        priority_score: clampScore(48 + Math.min(30, subscriber.lifetime_spend / 20) + Math.min(15, subscriber.churn_risk / 5)),
        priority_reason: "Expired subscriber may be recoverable based on relationship value and risk.",
        status: "open",
        title: `Review expired subscriber ${fan}`,
        description: "Subscriber status is expired and should be reviewed by an operator.",
        reason: "Subscriber is expired and should be considered for win-back.",
        evidence: [
          { label: "Subscription status", value: subscriber.current_subscription_status ?? "expired" },
          { label: "Churn risk", value: `${subscriber.churn_risk}%` },
          { label: "Lifetime spend", value: money(subscriber.lifetime_spend) }
        ],
        confidence: 82,
        recommended_action: "Review relationship summary and decide whether to send a win-back offer.",
        suggested_action: "offer_winback",
        suggested_script: "Returning Subscriber Re-engagement",
        ai_suggestion: {
          suggested_script: "Returning Subscriber Re-engagement",
          confidence: 72,
          expected_outcome: "Potential reactivation.",
          estimated_conversion: "low-medium"
        },
        due_at: addDays(now, 2).toISOString(),
        cooldown_hours: 336
      });
    }
  }

  return drafts;
}

function generateEventTasks(events: OfEvent[], now: Date): TaskRuleDraft[] {
  const drafts: TaskRuleDraft[] = [];

  for (const event of events) {
    if (event.event_type === "transaction_created") {
      drafts.push({
        source_type: "event",
        source_id: event.id,
        task_type: "review_new_transaction",
        rule_name: "review_new_transaction",
        rule_version: ruleVersion,
        priority: "high",
        priority_score: 74,
        priority_reason: "New revenue event may require fulfilment or follow-up.",
        status: "open",
        title: "Review new transaction",
        description: summarizeEventType(event.event_type),
        reason: "A transaction event was received and may need operator follow-up.",
        evidence: [
          { label: "Event", value: summarizeEventType(event.event_type) },
          { label: "Received", value: formatEvidenceDate(event.received_at ?? event.created_at) }
        ],
        confidence: 90,
        recommended_action: "Review transaction details and send fulfilment or thank-you if needed.",
        suggested_action: "review_purchase",
        suggested_script: "Tip Received Thank You",
        ai_suggestion: {
          suggested_script: "Tip Received Thank You",
          confidence: 78,
          expected_outcome: "Reinforce purchase behaviour.",
          estimated_conversion: "medium"
        },
        due_at: addHours(now, 8).toISOString(),
        cooldown_hours: 0
      });
    }

    if (event.event_type === "chat_message") {
      drafts.push({
        source_type: "event",
        source_id: event.id,
        task_type: "respond_to_new_chat_message",
        rule_name: "respond_to_new_chat_message",
        rule_version: ruleVersion,
        priority: "medium",
        priority_score: 58,
        priority_reason: "Incoming chat message should be reviewed for response quality.",
        status: "open",
        title: "Respond to new chat message",
        description: summarizeEventType(event.event_type),
        reason: "A chat message event was received.",
        evidence: [
          { label: "Event", value: summarizeEventType(event.event_type) },
          { label: "Received", value: formatEvidenceDate(event.received_at ?? event.created_at) }
        ],
        confidence: 84,
        recommended_action: "Open chat and respond if the subscriber is waiting.",
        suggested_action: "open_chat",
        suggested_script: null,
        ai_suggestion: {
          expected_outcome: "Maintain response SLA.",
          confidence: 74
        },
        due_at: addHours(now, 12).toISOString(),
        cooldown_hours: 12
      });
    }
  }

  return drafts;
}

function isOlderThan(value: string | null | undefined, now: Date, hours: number) {
  const date = parseDate(value);
  return date ? now.getTime() - date.getTime() >= hours * 60 * 60 * 1000 : false;
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return addHours(date, days * 24);
}

function ageHours(value: string | null | undefined, now: Date) {
  const date = parseDate(value);
  return date ? Math.max(0, (now.getTime() - date.getTime()) / (60 * 60 * 1000)) : 0;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function priorityFromScore(score: number): TaskPriority {
  if (score >= 85) return "urgent";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function isActiveTaskStatus(status: string) {
  return status === "open" || status === "in_progress" || status === "waiting";
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function formatEvidenceDate(value: string | null | undefined) {
  return value ?? "unknown";
}

function money(value: number | null | undefined) {
  return `$${Number(value ?? 0).toLocaleString()}`;
}

function firstRelatedRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return isRecord(value[0]) ? value[0] : null;
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : fallback;
  return Number.isFinite(number) ? number : fallback;
}

function ageDays(value: string | null | undefined, now: Date) {
  const date = parseDate(value);
  if (!date) return 999;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
}

function lastWithinDays(value: unknown, now: Date, days: number) {
  if (typeof value !== "string") return false;
  const date = parseDate(value);
  return date ? now.getTime() - date.getTime() <= days * 86_400_000 : false;
}

function isOverdue(value: unknown, now: Date) {
  if (typeof value !== "string" || !value) return false;
  const date = parseDate(value);
  return date ? date.getTime() < now.getTime() : false;
}

function isActiveSubscription(status: string) {
  return Boolean(status) && !isExpiredSubscription(status);
}

function isExpiredSubscription(status: string) {
  return ["expired", "cancelled", "canceled", "inactive"].some((term) => status.includes(term));
}

function relationshipStateFor(input: {
  active: boolean;
  expired: boolean;
  lifetimeSpend: number;
  conversationCount: number;
  churnRisk: number;
  vipScore: number;
  daysSinceFirstSeen: number;
}): OfSubscriberRelationship["relationship_state"] {
  if (input.expired) return "expired";
  if (input.churnRisk >= 72) return "at_risk";
  if (input.vipScore >= 78 || input.lifetimeSpend >= 500) return "vip";
  if (input.daysSinceFirstSeen <= 3 && input.conversationCount === 0) return "new_subscriber";
  if (input.conversationCount >= 4 || input.lifetimeSpend > 0) return "engaged";
  if (input.active) return "welcomed";
  return "prospect";
}

function revenueTrendFor(lifetimeSpend: number, daysSincePurchase: number): OfSubscriberRelationship["revenue_trend"] {
  if (lifetimeSpend <= 0) return "unknown";
  if (daysSincePurchase <= 14 && lifetimeSpend >= 500) return "rising";
  if (daysSincePurchase <= 30) return "steady";
  if (daysSincePurchase <= 90) return "cooling";
  return "declining";
}

function relationshipReason(input: { relationshipScore: number; active: boolean; expired: boolean; hasConversation: boolean; lifetimeSpend: number; churnRisk: number; engagementScore: number }) {
  if (!input.hasConversation && input.lifetimeSpend === 0) return input.active ? "New subscriber with no conversation history yet." : "Subscriber has limited relationship history so far.";
  if (input.expired) return "Relationship is constrained by expired subscription status.";
  if (input.churnRisk >= 70) return "Relationship score is held back by elevated churn risk.";
  if (input.relationshipScore >= 75) return "Strong engagement and value signals indicate a healthy relationship.";
  if (input.engagementScore >= 60) return "Active engagement is improving the relationship score.";
  return "Relationship score reflects modest engagement and value signals.";
}

function revenueReason(input: { active: boolean; purchaseCount: number; ppvPurchases: number; customsPurchased: number; likelyPpvBuyer: number; revenueOpportunityScore: number }) {
  if (input.active && input.purchaseCount === 0) return "Active subscriber with no PPV purchases yet.";
  if (input.likelyPpvBuyer >= 70) return "Conversation intelligence shows a strong PPV buying signal.";
  if (input.ppvPurchases === 0 && input.customsPurchased === 0) return "Subscriber has not purchased PPV or custom content yet.";
  if (input.revenueOpportunityScore >= 70) return "Recent engagement and purchase patterns suggest an upsell opportunity.";
  return "Revenue opportunity is based on current spend, engagement, and buyer signals.";
}

function urgencyReason(input: { overdueTasks: number; activeTasks: number; pendingActions: number; pendingApprovals: number; relationshipState: string; hasConversation: boolean; active: boolean; churnRisk: number; urgencyScore: number }) {
  if (input.overdueTasks > 0) return `${input.overdueTasks} overdue task${input.overdueTasks === 1 ? "" : "s"} need attention.`;
  if (input.relationshipState === "new_subscriber" && input.active && !input.hasConversation) return "Welcome message is overdue and subscriber is active.";
  if (input.pendingApprovals > 0) return `${input.pendingApprovals} pending approval${input.pendingApprovals === 1 ? "" : "s"} require operator review.`;
  if (input.pendingActions > 0) return `${input.pendingActions} pending action${input.pendingActions === 1 ? "" : "s"} are waiting.`;
  if (input.churnRisk >= 70) return "High churn risk makes this subscriber time-sensitive.";
  if (input.activeTasks > 0) return "Open subscriber tasks are waiting in the queue.";
  return input.urgencyScore >= 60 ? "Multiple relationship signals make this subscriber urgent." : "No immediate blocking urgency detected.";
}

function churnReason(input: { expired: boolean; daysSinceSeen: number; churnRisk: number; engagementScore: number; overdueTasks: number }) {
  if (input.expired) return "Subscription is expired or inactive.";
  if (input.daysSinceSeen > 30) return "Subscriber has not been seen in over 30 days.";
  if (input.overdueTasks > 0) return "Overdue follow-up increases churn risk.";
  if (input.engagementScore >= 65) return "Recent engagement is keeping churn risk lower.";
  if (input.churnRisk >= 60) return "Low recent engagement is increasing churn risk.";
  return "Churn risk is moderated by current activity signals.";
}

function vipReason(input: { lifetimeSpend: number; purchaseCount: number; vipScore: number; intelligenceVip: number }) {
  if (input.lifetimeSpend >= 500) return "High lifetime spend marks this subscriber as VIP.";
  if (input.intelligenceVip >= 70) return "Conversation intelligence indicates high VIP potential.";
  if (input.purchaseCount >= 5) return "Repeat purchases indicate VIP potential.";
  if (input.vipScore >= 60) return "Spend and engagement signals suggest developing VIP potential.";
  return "VIP score is limited by current spend and purchase history.";
}

function engagementReason(input: { conversationCount: number; daysSinceSeen: number; engagementScore: number; hasConversation: boolean }) {
  if (!input.hasConversation) return "No conversation history has been recorded yet.";
  if (input.daysSinceSeen <= 7 && input.conversationCount >= 3) return "Recent repeated conversation activity is strong.";
  if (input.daysSinceSeen > 30) return "Engagement is cooling because recent activity is stale.";
  if (input.engagementScore >= 60) return "Subscriber has meaningful recent engagement.";
  return "Engagement is based on available conversation and activity signals.";
}

function aiConfidenceReason(input: { aiConfidenceScore: number; hasIntelligence: boolean; conversationCount: number; events: number }) {
  if (input.hasIntelligence) return "Conversation intelligence is available for this subscriber.";
  if (input.conversationCount === 0 && input.events === 0) return "Low confidence because there is little relationship history.";
  if (input.aiConfidenceScore >= 70) return "Confidence is supported by multiple relationship events.";
  return "Confidence is deterministic and based on partial subscriber signals.";
}

function recommendedActionFor(input: {
  urgencyScore: number;
  churnRisk: number;
  vipScore: number;
  revenueOpportunityScore: number;
  engagementScore: number;
  nextState: OfSubscriberRelationship["relationship_state"];
}) {
  if (input.urgencyScore >= 80 || input.churnRisk >= 75) return "Prioritise retention outreach.";
  if (input.nextState === "new_subscriber") return "Send welcome message.";
  if (input.vipScore >= 75) return "Review VIP upsell or personal thank-you.";
  if (input.revenueOpportunityScore >= 70) return "Offer a relevant PPV or custom content prompt.";
  if (input.engagementScore >= 65) return "Continue active conversation.";
  return "Monitor relationship.";
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
