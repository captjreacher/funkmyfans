export type CreatorStatus = "connected" | "attention" | "paused" | "disconnected";
export type CreatorOnboardingStatus = "connected" | "syncing" | "ready" | "needs_attention";
export type PlatformProvider = "betterfans" | "onlyfans" | "fansly" | "other";

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "open" | "in_progress" | "done" | "dismissed";
export type TaskSource = "sync" | "event" | "operator" | "rules_engine";

export type RecommendationStatus = "new" | "accepted" | "dismissed" | "archived";
export type MessageScriptStatus = "active" | "inactive";
export type MessageScriptActionMode = "task_only" | "draft_for_approval" | "auto_send";
export type MessageScriptStepType = "message" | "follow_up" | "question" | "branch" | "end";
export type AutomationRunStatus = "running" | "completed" | "failed" | "skipped";
export type OutboundMessageStatus = "pending_approval" | "queued" | "sending" | "sent" | "failed" | "rejected";
export type OutboundApprovalStatus = "not_required" | "pending" | "approved" | "rejected";

export interface OfCreator {
  id: string;
  platform_provider: PlatformProvider;
  betterfans_account_id: string | null;
  username: string;
  display_name: string | null;
  bio?: string | null;
  location?: string | null;
  status: CreatorStatus;
  onboarding_status: CreatorOnboardingStatus;
  connected_at: string;
  last_sync_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfCreatorSnapshot {
  id: string;
  creator_id: string;
  snapshot_date: string;
  subscribers_count: number;
  active_subscribers: number;
  expired_subscribers: number;
  revenue: number;
  chat_count: number;
  priority_chat_count: number;
  posts_count: number;
  created_at: string;
  updated_at: string;
}

export interface OfSubscriber {
  id: string;
  creator_id: string;
  betterfans_subscriber_id: string;
  platform_subscriber_id: string;
  username: string | null;
  display_name: string | null;
  status: string | null;
  subscription_status: string | null;
  renewal_date: string | null;
  renews_at: string | null;
  expires_at: string | null;
  total_spend: number | null;
  last_seen_at: string | null;
  raw_payload: Record<string, unknown>;
  last_sync_at: string;
}

export interface OfChat {
  id: string;
  creator_id: string;
  platform_chat_id: string;
  platform_user_id: string | null;
  fan_username: string | null;
  fan_display_name: string | null;
  last_activity_at: string | null;
  last_message_at: string | null;
  unread: boolean;
  unread_count: number;
  priority: boolean;
  raw_payload: Record<string, unknown>;
  last_sync_at: string;
}

export type SyncType = "profile" | "stats" | "subscribers" | "chats" | "all";
export type SyncRunStatus = "running" | "success" | "failed";

export interface OfSyncRun {
  id: string;
  creator_id: string;
  sync_type: SyncType;
  status: SyncRunStatus;
  started_at: string;
  completed_at: string | null;
  records_processed: number;
  error_message: string | null;
}

export interface OfEvent {
  id: string;
  creator_id: string;
  provider: string;
  provider_event_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  received_at: string;
  processed_at: string | null;
  processing_status: "received" | "processed" | "failed";
  processing_error: string | null;
  created_at: string;
  of_creators?: Pick<OfCreator, "username" | "display_name"> | null;
}

export interface OfTask {
  id: string;
  creator_id: string;
  source_type: string;
  source_id: string | null;
  source_event_id?: string | null;
  subscriber_id?: string | null;
  chat_id?: string | null;
  task_type: string;
  rule_name: string;
  rule_version: string;
  priority: TaskPriority;
  status: TaskStatus;
  title: string;
  description: string | null;
  source?: TaskSource;
  due_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  of_creators?: Pick<OfCreator, "username" | "display_name"> | null;
}

export interface OfRecommendation {
  id: string;
  creator_id: string;
  recommendation_type: string;
  priority: TaskPriority;
  title: string;
  rationale: string;
  source_data: Record<string, unknown>;
  status: RecommendationStatus;
  created_at: string;
  updated_at: string;
}

export interface OfMessageScript {
  id: string;
  creator_id: string;
  name: string;
  trigger_event_type: string;
  status: MessageScriptStatus;
  action_mode: MessageScriptActionMode;
  auto_send_enabled: boolean;
  requires_approval: boolean;
  cooldown_hours: number;
  max_sends_per_fan: number;
  created_at: string;
  updated_at: string;
  steps?: OfMessageScriptStep[];
}

export interface OfMessageScriptStep {
  id: string;
  script_id: string;
  step_order: number;
  step_type: MessageScriptStepType;
  message_body: string | null;
  delay_minutes: number | null;
  condition_key: string | null;
  condition_value: string | null;
  next_step_id: string | null;
  fallback_step_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfAutomationRun {
  id: string;
  creator_id: string;
  script_id: string;
  fan_id: string;
  source_event_id: string | null;
  action_mode: MessageScriptActionMode;
  status: AutomationRunStatus;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  of_message_scripts?: Pick<OfMessageScript, "name" | "trigger_event_type"> | null;
  of_creators?: Pick<OfCreator, "username" | "display_name"> | null;
}

export interface OfOutboundMessage {
  id: string;
  creator_id: string;
  fan_id: string;
  script_id: string | null;
  automation_run_id: string | null;
  source_event_id: string | null;
  provider_message_id: string | null;
  generated_text: string | null;
  message_body: string;
  draft_text: string | null;
  final_text: string | null;
  status: OutboundMessageStatus;
  approval_status: OutboundApprovalStatus;
  approved_by: string | null;
  sent_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  error_message: string | null;
  created_at: string;
  of_message_scripts?: Pick<OfMessageScript, "name"> | null;
  of_creators?: Pick<OfCreator, "username" | "display_name"> | null;
}

export interface MessageScriptTemplate {
  name: string;
  triggerEventType: string;
  autoSendEnabled: boolean;
  requiresApproval: boolean;
  actionMode?: MessageScriptActionMode;
  cooldownHours: number;
  maxSendsPerFan: number;
  steps: ScriptStepTemplate[];
}

export interface ScriptStepTemplate {
  id?: string;
  order: number;
  type: MessageScriptStepType;
  body?: string;
  delayMinutes?: number;
  condition?: {
    key: string;
    value: string;
  };
  nextStepId?: string;
  fallbackStepId?: string;
}

export interface CreatorOperationalData {
  creator: Partial<OfCreator> & { betterfans_account_id: string; username: string };
  snapshot: Omit<Partial<OfCreatorSnapshot>, "creator_id">;
  subscribers: Array<Partial<OfSubscriber> & { betterfans_subscriber_id?: string; platform_subscriber_id: string }>;
  chats: Array<Partial<OfChat> & { platform_chat_id: string }>;
  raw: {
    profile?: unknown;
    stats?: unknown;
    subscribers?: unknown;
    chats?: unknown;
  };
}

export function summarizeEventType(eventType: string): string {
  if (eventType === "chat_message") return "New chat message received";
  if (eventType === "subscriber_created") return "New subscriber";
  if (eventType === "subscriber_expired") return "Subscriber expired";
  if (eventType === "transaction_created") return "Transaction received";
  return "BetterFans event received";
}
