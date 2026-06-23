import type { OfChat, OfEvent, OfSubscriber, TaskPriority, TaskStatus } from "@of-pilot/of-types";
import { summarizeEventType } from "@of-pilot/of-types";

export interface TaskRuleConfig {
  unreadChatThresholdHours: number;
  renewalWindowDays: number;
}

export interface TaskRuleInput {
  chats: OfChat[];
  subscribers: OfSubscriber[];
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
  status: Extract<TaskStatus, "open">;
  title: string;
  description: string;
  due_at: string | null;
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
      drafts.push({
        source_type: "chat",
        source_id: chat.id,
        task_type: "respond_to_priority_fan",
        rule_name: "respond_to_priority_fan",
        rule_version: ruleVersion,
        priority: "high",
        status: "open",
        title: `Respond to priority fan ${fan}`,
        description: "Chat is marked priority and has unread activity.",
        due_at: addHours(now, 4).toISOString()
      });
    }

    if (chat.unread && isOlderThan(chat.last_activity_at ?? chat.last_message_at, now, config.unreadChatThresholdHours)) {
      drafts.push({
        source_type: "chat",
        source_id: chat.id,
        task_type: "follow_up_unread_chat",
        rule_name: "follow_up_unread_chat",
        rule_version: ruleVersion,
        priority: "medium",
        status: "open",
        title: `Follow up unread chat with ${fan}`,
        description: `Unread chat activity is older than ${config.unreadChatThresholdHours} hours.`,
        due_at: addHours(now, 12).toISOString()
      });
    }
  }

  return drafts;
}

function generateSubscriberTasks(subscribers: OfSubscriber[], now: Date, config: TaskRuleConfig): TaskRuleDraft[] {
  const drafts: TaskRuleDraft[] = [];
  const renewalWindowEnd = addDays(now, config.renewalWindowDays);

  for (const subscriber of subscribers) {
    const fan = subscriber.username || subscriber.display_name || subscriber.betterfans_subscriber_id;
    const status = (subscriber.status ?? subscriber.subscription_status ?? "").toLowerCase();
    const renewalDate = parseDate(subscriber.renewal_date ?? subscriber.renews_at);

    if (status.includes("active") && renewalDate && renewalDate >= now && renewalDate <= renewalWindowEnd) {
      drafts.push({
        source_type: "subscriber",
        source_id: subscriber.id,
        task_type: "renew_expiring_subscriber",
        rule_name: "renew_expiring_subscriber",
        rule_version: ruleVersion,
        priority: "high",
        status: "open",
        title: `Renew expiring subscriber ${fan}`,
        description: `Subscriber renewal is due by ${renewalDate.toISOString().slice(0, 10)}.`,
        due_at: renewalDate.toISOString()
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
        status: "open",
        title: `Review expired subscriber ${fan}`,
        description: "Subscriber status is expired and should be reviewed by an operator.",
        due_at: addDays(now, 2).toISOString()
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
        status: "open",
        title: "Review new transaction",
        description: summarizeEventType(event.event_type),
        due_at: addHours(now, 8).toISOString()
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
        status: "open",
        title: "Respond to new chat message",
        description: summarizeEventType(event.event_type),
        due_at: addHours(now, 12).toISOString()
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
