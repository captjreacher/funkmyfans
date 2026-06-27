export type CreatorStatus = "connected" | "attention" | "paused" | "disconnected";
export type CreatorOnboardingStatus = "connected" | "syncing" | "ready" | "needs_attention";
export type PlatformProvider = "betterfans" | "onlyfans" | "fansly" | "other";

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "open" | "in_progress" | "waiting" | "completed" | "cancelled" | "ignored" | "archived";
export type TaskSource = "sync" | "event" | "operator" | "rules_engine";
export type TaskTimelineEventType =
  | "task_created"
  | "viewed"
  | "assigned"
  | "status_changed"
  | "ai_suggestion_generated"
  | "completed"
  | "cancelled"
  | "ignored"
  | "reopened"
  | "note_added";

export type RecommendationStatus = "new" | "accepted" | "dismissed" | "archived";
export type MessageScriptStatus = "active" | "inactive";
export type MessageScriptActionMode = "task_only" | "draft_for_approval" | "auto_send";
export type MessageScriptStepType = "message" | "follow_up" | "question" | "branch" | "end";
export type AutomationRunStatus = "running" | "completed" | "failed" | "skipped";
export type OutboundMessageStatus = "pending_approval" | "queued" | "sending" | "sent" | "failed" | "rejected";
export type OutboundApprovalStatus = "not_required" | "pending" | "approved" | "rejected";
export type RelationshipState = "prospect" | "new_subscriber" | "welcomed" | "engaged" | "vip" | "cooling" | "at_risk" | "expired" | "reactivated";
export type RevenueTrend = "unknown" | "new" | "rising" | "steady" | "cooling" | "declining";
export type RelationshipTimelineType =
  | "subscription"
  | "renewal"
  | "ppv_purchase"
  | "tip"
  | "custom_purchase"
  | "message"
  | "summary_refreshed"
  | "intent_changed"
  | "sentiment_changed"
  | "vip_promoted"
  | "churn_warning"
  | "buying_signal_detected"
  | "ai_action"
  | "operator_action"
  | "automation"
  | "state_change"
  | "sync"
  | "context_event";
export type ContextEventType =
  | "vip_detected"
  | "churn_risk_changed"
  | "revenue_milestone"
  | "coaching_opportunity"
  | "subscriber_reactivated"
  | "ai_relationship_summary_updated";
export type ConversationSentiment = "positive" | "neutral" | "negative" | "excited" | "hesitant" | "frustrated" | "high_engagement" | "cold";
export type ConversationIntent =
  | "greeting"
  | "flirting"
  | "buying_signal"
  | "ppv_interest"
  | "custom_request"
  | "sexting"
  | "casual_chat"
  | "support"
  | "complaint"
  | "price_objection"
  | "subscription_question"
  | "goodbye";

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

export interface OfSubscriberRelationship {
  id: string;
  creator_id: string;
  subscriber_id: string;
  betterfans_subscriber_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  current_subscription_status: string | null;
  subscription_tier: string | null;
  first_seen_at: string;
  last_seen_at: string | null;
  lifetime_spend: number;
  subscription_spend: number;
  ppv_purchases: number;
  tips: number;
  customs_purchased: number;
  purchase_count: number;
  average_order_value: number;
  last_purchase_at: string | null;
  revenue_trend: RevenueTrend;
  relationship_state: RelationshipState;
  relationship_stage: string;
  relationship_score: number;
  revenue_opportunity_score: number;
  urgency_score: number;
  vip_score: number;
  churn_risk: number;
  engagement_score: number;
  ai_confidence_score: number;
  relationship_score_reason: string | null;
  revenue_opportunity_score_reason: string | null;
  urgency_score_reason: string | null;
  churn_risk_reason: string | null;
  vip_score_reason: string | null;
  engagement_score_reason: string | null;
  ai_confidence_score_reason: string | null;
  conversation_count: number;
  last_creator_response_at: string | null;
  last_subscriber_message_at: string | null;
  average_reply_delay_seconds: number | null;
  active_script_id: string | null;
  current_workflow: string | null;
  pending_actions: number;
  pending_approvals: number;
  automation_paused: boolean;
  human_takeover: boolean;
  auto_send_enabled: boolean;
  recommended_next_action: string | null;
  last_event_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  of_relationship_summaries?: OfRelationshipSummary | OfRelationshipSummary[] | null;
  of_conversation_intelligence?: OfConversationIntelligence | OfConversationIntelligence[] | null;
}

export interface OfRelationshipSummary {
  id: string;
  creator_id: string;
  subscriber_id: string;
  relationship_id: string;
  operational_summary: string;
  personality: string | null;
  interests: unknown[];
  likes: unknown[];
  dislikes: unknown[];
  requests: unknown[];
  kinks: unknown[];
  conversation_tone: string | null;
  current_topics: unknown[];
  important_reminders: unknown[];
  summary_version: number;
  model: string | null;
  source_event_id: string | null;
  refreshed_at: string;
  created_at: string;
  updated_at: string;
}

export interface OfMessageClassification {
  id: string;
  creator_id: string;
  subscriber_id: string;
  relationship_id: string;
  source_event_id: string | null;
  message_text: string | null;
  primary_intent: ConversationIntent;
  confidence: number;
  evidence: Array<{ label?: string; value?: string; [key: string]: unknown }>;
  classified_by: string;
  classified_at: string;
  created_at: string;
}

export interface OfConversationSummaryVersion {
  id: string;
  creator_id: string;
  subscriber_id: string;
  relationship_id: string;
  rolling_summary: string;
  summary_version: number;
  provider: string;
  source_event_id: string | null;
  created_at: string;
}

export interface OfConversationIntelligence {
  id: string;
  creator_id: string;
  subscriber_id: string;
  relationship_id: string;
  rolling_summary: string;
  last_summary_at: string | null;
  conversation_sentiment: ConversationSentiment;
  conversation_stage: string;
  relationship_temperature: string;
  engagement_trend: string;
  last_meaningful_message_at: string | null;
  unresolved_topics: unknown[];
  promises_made: unknown[];
  important_facts: unknown[];
  current_intent: ConversationIntent | null;
  current_intent_confidence: number | null;
  current_intent_evidence: Array<{ label?: string; value?: string; [key: string]: unknown }>;
  sentiment_score: number;
  engagement_score: number;
  likely_ppv_buyer: number;
  custom_buyer: number;
  tipper: number;
  renewal_likelihood: number;
  churn_probability: number;
  vip_potential: number;
  whale_potential: number;
  ai_briefing: string;
  recommended_next_action: string | null;
  suggested_script: string | null;
  confidence: number;
  provider: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  classifications?: OfMessageClassification[];
  summary_versions?: OfConversationSummaryVersion[];
}

export interface OfRelationshipTimelineItem {
  id: string;
  creator_id: string;
  subscriber_id: string | null;
  relationship_id: string | null;
  source_event_id: string | null;
  timeline_type: RelationshipTimelineType;
  title: string;
  detail: string | null;
  actor: "subscriber" | "creator" | "operator" | "automation" | "ai" | "system";
  amount: number | null;
  occurred_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OfContextEvent {
  id: string;
  creator_id: string;
  subscriber_id: string | null;
  relationship_id: string | null;
  source_event_id: string | null;
  event_type: ContextEventType;
  payload: Record<string, unknown>;
  delivery_status: "pending" | "delivered" | "failed" | "skipped";
  emitted_at: string;
  delivered_at: string | null;
  error_message: string | null;
}

export interface SubscriberWorkspaceTimelineItem {
  id: string;
  source: "relationship" | "task" | "event" | "sync";
  type: string;
  title: string;
  detail: string | null;
  actor: string;
  occurred_at: string;
  metadata?: Record<string, unknown>;
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
  priority_score: number;
  priority_reason: string | null;
  status: TaskStatus;
  title: string;
  description: string | null;
  reason: string | null;
  evidence: Array<{ label?: string; value?: string; [key: string]: unknown }>;
  confidence: number;
  recommended_action: string | null;
  suggested_action: string | null;
  suggested_script: string | null;
  ai_suggestion: {
    suggested_reply?: string;
    suggested_script?: string;
    confidence?: number;
    expected_outcome?: string;
    estimated_conversion?: string | number;
    [key: string]: unknown;
  };
  source?: TaskSource;
  due_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  completed_by: string | null;
  cancelled_by: string | null;
  ignore_reason: string | null;
  assigned_to: string | null;
  viewed_at: string | null;
  archived_at: string | null;
  execution_count: number;
  last_triggered_at: string | null;
  cooldown_until: string | null;
  next_eligible_at: string | null;
  of_task_timeline?: OfTaskTimelineItem[];
  of_creators?: Pick<OfCreator, "username" | "display_name"> | null;
}

export interface OfTaskTimelineItem {
  id: string;
  task_id: string;
  creator_id: string;
  event_type: TaskTimelineEventType;
  actor: string;
  from_status: TaskStatus | string | null;
  to_status: TaskStatus | string | null;
  title: string;
  detail: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
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
