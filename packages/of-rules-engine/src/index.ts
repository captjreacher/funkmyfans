import type { OfChat, OfEvent, OfSubscriberRelationship, TaskPriority, TaskStatus } from "@funkmyfans/of-types";
import { summarizeEventType } from "@funkmyfans/of-types";

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

const defaultConfig: TaskRuleConfig = {
  unreadChatThresholdHours: 24,
  renewalWindowDays: 7
};

const ruleVersion = "2026-06-22";

export function generateTaskDrafts(input: TaskRuleInput): TaskRuleDraft[] {
  const now = input.now ?? new Date();
  const config = { ...defaultConfig, ...input.config };
  return [
    ...generateChatTasks(input.chats, now, config),
    ...generateSubscriberTasks(input.subscribers, now, config),
    ...generateEventTasks(input.events, now)
  ];
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

function formatEvidenceDate(value: string | null | undefined) {
  return value ?? "unknown";
}

function money(value: number | null | undefined) {
  return `$${Number(value ?? 0).toLocaleString()}`;
}
