import type { OfSubscriberRelationship, OfTask, TaskPriority } from "@funkmyfans/of-types";

export interface CalculatedTaskPriority {
  score: number;
  priority: TaskPriority;
  reason: string;
  calculated: boolean;
}

const migratedPriorityReason = "Migrated from static priority high.";

export function getDisplayTaskPriority(task: OfTask, relationship?: OfSubscriberRelationship | null): CalculatedTaskPriority {
  if (task.priority_score == null || task.priority_reason === migratedPriorityReason) {
    return calculateTaskPriority(task, relationship);
  }

  return {
    score: clampScore(task.priority_score),
    priority: priorityFromScore(task.priority_score),
    reason: task.priority_reason ?? "Stored priority score.",
    calculated: false
  };
}

export function calculateTaskPriority(task: OfTask, relationship?: OfSubscriberRelationship | null): CalculatedTaskPriority {
  let score = 0;
  const reasons: string[] = [];
  const now = new Date();

  if (task.status === "open") add(20, "Open task");
  if (task.status === "in_progress") add(30, "In progress");
  if (task.status === "waiting") add(10, "Waiting on follow-up");

  if (task.due_at) {
    const dueAt = new Date(task.due_at);
    if (dueAt.getTime() < now.getTime() && isActiveTask(task.status)) add(25, "Overdue");
    else if (isSameDay(dueAt, now)) add(15, "Due today");
  }

  const searchableTask = [task.task_type, task.rule_name, task.title, task.reason, task.description, task.recommended_action, task.suggested_action]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (searchableTask.includes("send_welcome_message") || searchableTask.includes("welcome")) add(25, "Welcome outstanding");
  if (searchableTask.includes("renewal")) add(30, "Renewal opportunity");
  if (searchableTask.includes("churn") || searchableTask.includes("at risk")) add(35, "Churn risk");
  if (searchableTask.includes("vip")) add(40, "VIP follow-up");
  if (searchableTask.includes("ppv") || searchableTask.includes("purchase") || searchableTask.includes("offer")) add(35, "PPV opportunity");
  if (searchableTask.includes("manual")) add(15, "Manual task");

  if (relationship) {
    const subscription = (relationship.current_subscription_status ?? "").toLowerCase();
    if (relationship.relationship_state === "new_subscriber") add(20, "New subscriber");
    if (subscription.includes("active")) add(10, "Active subscriber");
    if (relationship.relationship_state === "expired" || subscription.includes("expired")) add(15, "Expired subscriber");
    if (relationship.lifetime_spend > 100) add(20, "Lifetime spend over $100");
    else if (relationship.lifetime_spend > 0) add(10, "Has lifetime spend");
    if (relationship.vip_score > 50) add(20, "VIP score over 50");
    if (relationship.churn_risk > 50) add(25, "Churn risk over 50");
    if (relationship.engagement_score > 50) add(10, "Engagement score over 50");
  }

  const cappedScore = clampScore(score);
  return {
    score: cappedScore,
    priority: priorityFromScore(cappedScore),
    reason: summarizeReasons(reasons),
    calculated: true
  };

  function add(points: number, reason: string) {
    score += points;
    reasons.push(reason);
  }
}

export function priorityFromScore(score: number): TaskPriority {
  if (score >= 85) return "urgent";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function summarizeReasons(reasons: string[]) {
  const uniqueReasons = Array.from(new Set(reasons));
  if (!uniqueReasons.length) return "No high-priority signals detected.";
  return `${uniqueReasons.slice(0, 4).join(", ")}.`;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isActiveTask(status: string) {
  return status === "open" || status === "in_progress" || status === "waiting";
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}
