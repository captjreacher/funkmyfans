export type CreatorStatus = "pending" | "connected" | "attention" | "paused" | "disconnected";
export type CreatorOnboardingStatus = "draft" | "pending" | "connected" | "syncing" | "ready" | "needs_attention";
// COMPOSE-3 adds "instagram" so an Instagram-originated creator/account can be
// represented as a platform provider (mirrored by the of_creators
// platform_provider CHECK constraint migration). Additive: existing providers
// and rows are unaffected.
export type PlatformProvider = "betterfans" | "onlyfans" | "fansly" | "other" | "instagram";

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
export type MessageScriptStepType = "message" | "follow_up" | "question" | "branch" | "wait" | "set_variable" | "end";
export type ScriptBuilderStepKind = "send_message" | "wait" | "ask_question" | "branch" | "set_variable" | "end_conversation";
export type ScriptExecutionMode = "immediate" | "delay" | "schedule" | "manual_only";
export type ScriptAiMode = "disabled" | "draft_only" | "requires_approval" | "auto_send";
export type ScriptApprovalMode = "always_approve" | "auto_approve_below_threshold" | "never_approve";
export type ScriptMessageGenerationMode = "template" | "ai_generated";
export type ScriptMediaKind = "image" | "video" | "audio" | "gallery";
export type AutomationRunStatus = "running" | "completed" | "failed" | "skipped";
export type OutboundMessageStatus = "pending_approval" | "queued" | "sending" | "sent" | "failed" | "rejected";
export type OutboundApprovalStatus = "not_required" | "pending" | "approved" | "rejected";
export type ConversationRuntimeStatus = "running" | "waiting_delay" | "waiting_reply" | "waiting_approval" | "completed" | "cancelled" | "failed";
export type ConversationLifecycleState = "new" | "open" | "waiting" | "escalated" | "completed" | "archived";
export type ConversationParticipantRole = "creator" | "subscriber" | "operator" | "system";
export type AutomationExecutionMode = "production" | "simulation";
export type AutomationSimulationStatus = "draft" | "running" | "paused" | "completed" | "cancelled" | "failed";
export type RevenueJourneyStatus = "draft" | "active" | "paused" | "archived";
export type AutomationRegistryKind =
  | "event_type"
  | "conversation_classification"
  | "routing_destination"
  | "playbook_goal"
  | "playbook_style"
  | "queue_state";
export type ConversationClassificationType =
  | "unknown_lead"
  | "existing_subscriber"
  | "existing_conversation"
  | "automation_response"
  | "priority_customer"
  | "vip"
  | "spam"
  | "creator_only"
  | "agency_only"
  | "shared_conversation";
export type RoutingDestinationType = "general_queue" | "automation_queue" | "review_queue" | "creator_queue" | "agency_queue" | "shared_queue" | "escalation_queue";
export type PlaybookGoalType =
  | "welcome_new_subscriber"
  | "build_relationship"
  | "high_spender_follow_up"
  | "upsell_custom_content"
  | "recover_expired_subscriber"
  | "re_engage_quiet_fan"
  | "warning_stand_down"
  | "manual_campaign";
export type PlaybookStyleType =
  | "friendly"
  | "flirty"
  | "direct_sales"
  | "vip"
  | "relationship_builder"
  | "authority"
  | "warning"
  | "soft_reactivation";
export type QueueStateType =
  | "unassigned"
  | "assigned_creator"
  | "assigned_agency"
  | "shared"
  | "waiting_customer"
  | "waiting_creator"
  | "waiting_agency"
  | "waiting_ai_approval"
  | "completed"
  | "archived";
export type OpeningPosture = "standard" | "familiar" | "warm";
export interface RelationshipContextProjection {
  identity_status: string | null;
  identity_confidence: number | null;
  downstream_usability: string | null;
  known_sources: string[];
  relationship_posture: string | null;
  relationship_signals: string[];
  commercial_signal_summary: string | null;
  warnings: string[];
}
export type RelationshipState = "prospect" | "new_subscriber" | "welcomed" | "engaged" | "vip" | "cooling" | "at_risk" | "expired" | "reactivated";
export type SubscriberPersonaKey =
  | "new_fan"
  | "warm_buyer"
  | "vip"
  | "collector"
  | "conversational"
  | "drifting_away"
  | "dormant";
export type CommercialOpportunityKey =
  | "welcome"
  | "upsell_ppv"
  | "offer_custom"
  | "retention"
  | "renewal"
  | "vip_outreach"
  | "human_conversation"
  | "no_action";
export type JourneyStage =
  | "New"
  | "Welcomed"
  | "Engaged"
  | "Purchasing"
  | "Growing"
  | "VIP"
  | "At Risk"
  | "Recovering"
  | "Dormant";
export type BriefingProviderId = "deterministic-v1" | "heuristic-v2" | "llm-openai" | "llm-anthropic" | "llm-local";
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
  | "persona_change"
  | "journey_transition"
  | "opportunity_change"
  | "briefing_generated"
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
  metadata: Record<string, unknown>;
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

export interface OfAutomationRegistryEntry {
  id: string;
  kind: AutomationRegistryKind;
  registry_key: string;
  label: string;
  description: string | null;
  category: string | null;
  premium: boolean;
  is_default: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AutomationRegistryWorkspaceData {
  eventTypes: OfAutomationRegistryEntry[];
  classifications: OfAutomationRegistryEntry[];
  routingDestinations: OfAutomationRegistryEntry[];
  playbookGoals: OfAutomationRegistryEntry[];
  playbookStyles: OfAutomationRegistryEntry[];
  queueStates: OfAutomationRegistryEntry[];
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
  relationship_stage: JourneyStage | string;
  journey_stage: JourneyStage | string;
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
  persona_key: SubscriberPersonaKey | string;
  persona_name: string;
  persona_emoji: string;
  persona_color: string;
  persona_description: string;
  persona_strategy: string;
  persona_confidence: number;
  persona_reason: string | null;
  opportunity_classification: CommercialOpportunityKey | string;
  opportunity_reason: string | null;
  operator_briefing: string | null;
  operator_briefing_provider: BriefingProviderId | string | null;
  journey_stage_reason: string | null;
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

export interface SubscriberPersona {
  key: SubscriberPersonaKey;
  name: string;
  emoji: string;
  color: string;
  description: string;
  recommended_strategy: string;
  confidence: number;
  reason: string;
}

export interface CommercialOpportunity {
  key: CommercialOpportunityKey;
  name: string;
  emoji: string;
  color: string;
  description: string;
  recommended_action: string;
  confidence: number;
  reason: string;
  expected_outcome: string;
}

export interface OperatorBriefing {
  provider: BriefingProviderId;
  headline: string;
  summary: string;
  recommended_next_action: string;
  expected_outcome: string;
  estimated_revenue_opportunity: string;
  reason: string;
}

export interface DailyFocusQueueCard {
  key: string;
  title: string;
  emoji: string;
  color: string;
  count: number;
  description: string;
  filter: Record<string, string>;
  reason: string;
}

export interface MorningBrief {
  headline: string;
  summary: string;
  highest_priority_subscriber: string;
  highest_priority_reason: string;
  missed_revenue: number;
  overdue_welcome_conversations: number;
  provider: BriefingProviderId;
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
  execution_mode: AutomationExecutionMode;
  simulation_run_id?: string | null;
  metadata?: Record<string, unknown>;
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

export type QueueOperationalStatus = "active" | "paused" | "archived";
export type QueueItemLifecycleStatus = "visible" | "claimed" | "assigned" | "moved" | "resolved";

export interface Queue {
  id: string;
  creator_id: string;
  name: string;
  label: string;
  description: string | null;
  operational_status: QueueOperationalStatus;
  visibility_state: "visible" | "hidden";
  priority: TaskPriority;
  assigned_operator_id: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface QueueItem {
  id: string;
  queue_id: string;
  conversation_id: string | null;
  opportunity_id: string | null;
  assigned_operator_id: string | null;
  priority: TaskPriority;
  status: QueueItemLifecycleStatus;
  created_at: string;
  updated_at: string;
  moved_at: string | null;
  resolved_at: string | null;
  metadata: Record<string, unknown>;
}

export type ConversationOpportunityStatus = "detected" | "queued" | "resolved" | "cancelled";

export interface ConversationOpportunity {
  id: string;
  creator_id: string;
  conversation_instance_id: string;
  queue_id: string | null;
  queue_item_id: string | null;
  source_event_id: string | null;
  source_step_id: string | null;
  route_key: string;
  opportunity_classification: string;
  category: string;
  title: string;
  summary: string;
  status: ConversationOpportunityStatus;
  priority: TaskPriority;
  queue_handoff: boolean;
  recommended_next_objective: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  metadata: Record<string, unknown>;
}

export interface ConversationOpportunitySummary extends ConversationOpportunity {}

export interface QueueWorkspaceViewModel {
  selected_creator: Pick<OfCreator, "id" | "username" | "display_name"> | null;
  summary: QueueWorkspaceSummary;
  queues: QueueWorkspaceQueueSummary[];
  items: QueueWorkspaceItemSummary[];
  selected_queue_id: string | null;
  selected_item_id: string | null;
  selected_item_context: QueueWorkspaceItemContext | null;
}

export interface QueueWorkspaceSummary {
  total_queues: number;
  total_items: number;
  visible_items: number;
  claimed_items: number;
  assigned_items: number;
  moved_items: number;
  resolved_items: number;
  overdue_items: number;
}

export interface QueueWorkspaceQueueSummary extends Queue {
  item_count: number;
  active_item_count: number;
  resolved_item_count: number;
}

export interface QueueWorkspaceConversationSummary {
  id: string | null;
  subscriber_id: string | null;
  relationship_id: string | null;
  lifecycle_state: ConversationLifecycleState | null;
  status: ConversationRuntimeStatus | null;
  execution_mode: AutomationExecutionMode | null;
  script_name: string | null;
  creator: Pick<OfCreator, "id" | "username" | "display_name"> | null;
  updated_at: string | null;
}

export interface QueueWorkspaceSubscriberSummary {
  id: string | null;
  display_name: string | null;
  username: string | null;
  relationship_state: string | null;
  subscription_status: string | null;
  lifetime_spend: number | null;
  urgency_score: number | null;
}

export interface QueueWorkspaceRecentEvent {
  id: string;
  event_type: string;
  title: string;
  detail: string | null;
  occurred_at: string;
}

export interface QueueWorkspaceItemSummary extends QueueItem {
  title: string;
  queue_name: string;
  queue_label: string;
  assignment_label: string | null;
  priority_score: number;
  priority_reason: string | null;
  status_label: string;
  conversation: QueueWorkspaceConversationSummary | null;
  subscriber: QueueWorkspaceSubscriberSummary | null;
  opportunity: ConversationOpportunitySummary | null;
}

export interface QueueWorkspaceItemContext {
  conversation: QueueWorkspaceConversationSummary | null;
  subscriber: QueueWorkspaceSubscriberSummary | null;
  opportunity: ConversationOpportunitySummary | null;
  recent_events: QueueWorkspaceRecentEvent[];
}

export interface ConversationWorkspaceAttachment {
  id: string;
  name: string;
  kind: string;
  url: string | null;
  created_at: string | null;
  metadata: Record<string, unknown>;
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
  description?: string | null;
  trigger_event_type: string;
  status: MessageScriptStatus;
  action_mode: MessageScriptActionMode;
  auto_send_enabled: boolean;
  requires_approval: boolean;
  cooldown_hours: number;
  max_sends_per_fan: number;
  folder_name?: string | null;
  category?: string | null;
  tags?: string[];
  version_number?: number;
  source_script_id?: string | null;
  builder_config?: ScriptBuilderConfig;
  created_at: string;
  updated_at: string;
  of_creators?: Pick<OfCreator, "id" | "username" | "display_name"> | null;
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
  metadata?: ScriptBuilderStepMetadata;
  created_at: string;
  updated_at: string;
}

export interface ScriptBuilderVariable {
  key: string;
  label?: string;
  defaultValue?: string;
  description?: string;
}

export interface ScriptBuilderCondition {
  source: "variable" | "event" | "relationship" | "subscriber";
  key: string;
  operator: "equals" | "not_equals" | "contains" | "not_contains" | "exists" | "not_exists" | "gt" | "gte" | "lt" | "lte" | "within_days";
  value?: string;
}

export interface ScriptWorkspaceExecutionConfig {
  mode: ScriptExecutionMode;
  delayMinutes?: number;
  scheduleLabel?: string;
}

export interface ScriptWorkspaceAiConfig {
  mode: ScriptAiMode;
}

export interface ScriptWorkspaceApprovalConfig {
  mode: ScriptApprovalMode;
  threshold?: number;
}

export interface ScriptWorkspaceConfig {
  templateKey?: string;
  styleKey?: string;
  archetypeKey?: string;
  archetypeSource?: string;
  templateVersion?: string;
  archivedAt?: string | null;
  execution?: ScriptWorkspaceExecutionConfig;
  ai?: ScriptWorkspaceAiConfig;
  approval?: ScriptWorkspaceApprovalConfig;
  conditions?: ScriptBuilderCondition[];
  visualBuilder?: ScriptVisualBuilderConfig;
}

export type ScriptVisualBuilderNodeType =
  | "trigger"
  | "message"
  | "ask_question"
  | "wait"
  | "draft_reply"
  | "generate_response"
  | "analyse_conversation"
  | "classify_intent"
  | "ai_prompt"
  | "if_else"
  | "condition"
  | "branch"
  | "switch"
  | "filter"
  | "human_approval"
  | "approve"
  | "assign_queue"
  | "assign"
  | "pause"
  | "escalate"
  | "ppv_offer"
  | "bundle"
  | "custom_content"
  | "renew_subscription"
  | "delay"
  | "schedule"
  | "expiry"
  | "end";

export type ScriptVisualBuilderNodeCategory = "conversation" | "ai" | "logic" | "human" | "commerce" | "timing";

export interface ScriptVisualBuilderNode {
  id: string;
  type: ScriptVisualBuilderNodeType;
  label: string;
  category?: ScriptVisualBuilderNodeCategory;
  x: number;
  y: number;
  config: Record<string, unknown>;
}

export interface ScriptVisualBuilderConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface ScriptVisualBuilderConfig {
  schemaVersion: 1;
  selectedNodeId?: string | null;
  nodes: ScriptVisualBuilderNode[];
  connections: ScriptVisualBuilderConnection[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface ScriptBuilderBranchRule {
  id: string;
  label: string;
  condition: ScriptBuilderCondition;
  nextStepId: string | null;
}

export interface ScriptBuilderStepMetadata {
  kind?: ScriptBuilderStepKind;
  label?: string;
  nodeKey?: string;
  outcomeKey?: string;
  outcomeLabel?: string;
  terminalType?: string;
  queueHandoff?: boolean;
  handoffKind?: string;
  handoffObjective?: string;
  handoffTitle?: string;
  variableKey?: string;
  variableValue?: string;
  waitForReply?: boolean;
  waitForReplyMinutes?: number;
  waitForPurchase?: boolean;
  branchRules?: ScriptBuilderBranchRule[];
  messageGenerationMode?: ScriptMessageGenerationMode;
  mediaUrl?: string;
  mediaKind?: ScriptMediaKind;
  ppvTitle?: string;
  ppvPrice?: number;
  stopConditions?: ScriptBuilderCondition[];
  notes?: string;
}

export type ChatAutomationScenarioKey = "new_subscriber" | "subscription_expiring" | "inactive_subscriber" | "ppv_promotion";
export type AutomationRuleStatus = "active" | "draft" | "paused" | "archived";
export type AutomationRuleTriggerType =
  | "new_subscriber"
  | "subscription_expiring"
  | "subscription_renewed"
  | "no_chat_activity"
  | "new_inbound_message"
  | "ppv_purchased"
  | "high_spender_detected"
  | "fan_inactive"
  | "manual"
  | "birthday"
  | "vip";
export type AutomationRuleActionType = "run_script" | "create_task" | "queue_outbound_draft" | "notify_agency";
export type AutomationCreatorScope = "all_creators" | "selected_creator";
export type SettingsAuditEntityType = "agency" | "creator";
export type SettingsEmojiLevel = "none" | "light" | "moderate" | "heavy";
export type SettingsFlirtyLevel = "low" | "medium" | "high";
export type SettingsSalesAggressiveness = "soft" | "balanced" | "assertive";

export interface AgencyQuietHours {
  enabled: boolean;
  startHour: number;
  endHour: number;
}

export interface AgencyDefaultsSettings {
  id: string;
  default_approval_mode: MessageScriptActionMode;
  default_ai_mode: "disabled" | "draft_only" | "approval_required" | "auto_send";
  default_timezone: string;
  quiet_hours: AgencyQuietHours;
  default_cooldown_minutes: number;
  daily_outbound_cap_per_creator: number;
  daily_outbound_cap_per_fan: number;
  created_at: string;
  updated_at: string;
}

export interface CreatorPreferenceSettings {
  id: string;
  creator_id: string;
  automation_enabled: boolean;
  chat_automation_enabled: boolean;
  ppv_automation_enabled: boolean;
  tone_notes: string | null;
  restricted_topics: string[];
  escalation_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatorAiBehaviorSettings {
  ai_mode: "disabled" | "draft_only" | "approval_required" | "auto_send";
  max_message_length: number;
  emoji_level: SettingsEmojiLevel;
  flirty_level: SettingsFlirtyLevel;
  sales_aggressiveness: SettingsSalesAggressiveness;
  use_creator_memory: boolean;
  escalate_high_value_fan_threshold: number;
}

export interface CreatorSafetySettings {
  require_approval_first_message: boolean;
  require_approval_ppv_offers: boolean;
  require_approval_above_spend_threshold: number;
  require_approval_vip_fans: boolean;
  require_approval_custom_requests: boolean;
  restricted_keywords: string[];
  allow_auto_send_for_vip: boolean;
}

export interface CreatorAiSafetySettings {
  id: string;
  creator_id: string;
  ai_behavior: CreatorAiBehaviorSettings;
  safety: CreatorSafetySettings;
  created_at: string;
  updated_at: string;
}

export interface SettingsRuntimeHealth {
  betterfansApiKeyConfigured: boolean;
  betterfansBaseUrlConfigured: boolean;
  supabaseConfigured: boolean;
  eventStreamStatus: {
    connectionStatus: string;
    transport: string;
    persistentWebSocket: string;
    message: string;
  };
  lastSuccessfulEventReceivedAt: string | null;
  lastSuccessfulEventType: string | null;
  lastFailedEventAt: string | null;
  lastFailedEventType: string | null;
  lastSyncRunAt: string | null;
  lastSyncRunStatus: string | null;
}

export interface SettingsAuditEntry {
  id: string;
  entity_type: SettingsAuditEntityType;
  entity_id: string | null;
  actor_label: string | null;
  change_summary: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface CreatorSettingsBundle {
  creator: Pick<OfCreator, "id" | "username" | "display_name" | "betterfans_account_id" | "status" | "last_sync_at" | "onboarding_status" | "active">;
  preferences: CreatorPreferenceSettings;
  ai_safety: CreatorAiSafetySettings;
}

export type CreatorIntelligenceProjectionState = "available" | "accepted" | "dismissed";
export type CreatorPlaybookProposalState = "draft" | "accepted" | "dismissed";

export interface CreatorIntelligencePackageOpportunity {
  source_opportunity_reference: string;
  source_scenario_reference: string | null;
  journey_type: string;
  opportunity_type: string;
  title: string;
  rationale: string;
  confidence: number;
  priority: number;
}

export interface CreatorIntelligencePackageV1 {
  source_product: string;
  contract_version: string;
  intelligence_version: string;
  source_package_reference: string;
  source_assessment_reference: string;
  package_state: "identified" | "published" | "superseded";
  primary_vertical: string;
  archetype_journey: string;
  derived_scenario: string;
  intelligence_summary: string;
  available_opportunities: CreatorIntelligencePackageOpportunity[];
}

export interface CreatorIntelligenceSnapshot {
  id: string;
  creator_id: string;
  source_product: string;
  contract_version: string;
  intelligence_version: string;
  source_package_reference: string;
  source_assessment_reference: string;
  package_payload: CreatorIntelligencePackageV1;
  imported_at: string;
  superseded_at: string | null;
}

export interface CreatorIntelligenceOpportunityProjection {
  id: string;
  creator_id: string;
  intelligence_snapshot_id: string;
  source_opportunity_reference: string;
  source_scenario_reference: string | null;
  journey_type: string;
  opportunity_type: string;
  title: string;
  rationale: string;
  confidence: number;
  priority: number;
  projection_state: CreatorIntelligenceProjectionState;
  created_at: string;
  updated_at: string;
}

export interface CreatorPlaybookProposalPayloadStep {
  id: string;
  order: number;
  label: string;
  objective: string;
  message_draft: string;
  expected_subscriber_response_options: string[];
  fork_routing: Array<{
    response_option: string;
    route_to: string;
    note: string;
  }>;
  endpoint_label?: string;
}

export interface CreatorPlaybookProposalPayload {
  schema_version: 1;
  entry_trigger: string;
  creator_voice_notes: string[];
  guardrails: string[];
  steps: CreatorPlaybookProposalPayloadStep[];
  forks: Array<{
    from_step_id: string;
    response_option: string;
    to_step_id: string;
    endpoint_label?: string;
    rationale: string;
  }>;
  endpoints: Array<{
    id: string;
    label: string;
    description: string;
  }>;
  rationale: string;
  confidence: number;
  source_references: Array<{
    kind: string;
    reference: string;
  }>;
}

export interface CreatorPlaybookProposal {
  id: string;
  creator_id: string;
  intelligence_snapshot_id: string;
  creator_intelligence_opportunity_projection_id: string;
  proposal_title: string;
  journey_type: string;
  source_opportunity_type: string;
  proposal_state: CreatorPlaybookProposalState;
  proposal_payload: CreatorPlaybookProposalPayload;
  created_at: string;
  updated_at: string;
}

export interface CreatorIntelligenceSummary {
  source_product: string;
  contract_version: string;
  intelligence_version: string;
  source_package_reference: string;
  source_assessment_reference: string;
  package_state: "identified" | "published" | "superseded";
  primary_vertical: string;
  archetype_journey: string;
  derived_scenario: string;
  intelligence_summary: string;
  imported_at: string;
  superseded_at: string | null;
}

export interface CreatorIntelligenceWorkspaceData {
  creator: Pick<OfCreator, "id" | "username" | "display_name">;
  latest_snapshot: CreatorIntelligenceSnapshot | null;
  summary: CreatorIntelligenceSummary | null;
  snapshots: CreatorIntelligenceSnapshot[];
  opportunities: CreatorIntelligenceOpportunityProjection[];
}

export interface SettingsWorkspaceData {
  agency: AgencyDefaultsSettings;
  creators: CreatorSettingsBundle[];
  runtime: SettingsRuntimeHealth;
  audit: SettingsAuditEntry[];
}

export interface AutomationRuleConditionSummary {
  key: string;
  label: string;
  matched: boolean;
  actual: string;
  expected: string;
}

export interface AutomationRuleSimulationResult {
  matched: boolean;
  triggerMatched: boolean;
  action: AutomationRuleActionType;
  scriptId: string | null;
  scriptName: string | null;
  creatorId: string;
  creatorName: string;
  simulatedAt: string;
  eventType: string;
  conditions: AutomationRuleConditionSummary[];
  automationSimulationId: string | null;
  outboundMessages: OfOutboundMessage[];
  summary: string;
}

export interface OfAutomationRule {
  id: string;
  name: string;
  description: string | null;
  creator_scope: AutomationCreatorScope;
  creator_id: string | null;
  status: AutomationRuleStatus;
  trigger_type: AutomationRuleTriggerType | string;
  action_type: AutomationRuleActionType;
  selected_script_id: string | null;
  approval_mode: MessageScriptActionMode;
  conditions: ScriptBuilderCondition[];
  cooldown_minutes: number;
  frequency_limit: number;
  metadata: Record<string, unknown>;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
  selected_script?: Pick<OfMessageScript, "id" | "name" | "status" | "trigger_event_type" | "category"> | null;
  creator?: Pick<OfCreator, "id" | "username" | "display_name"> | null;
  recent_simulations?: AutomationRuleSimulationResult[];
}

export interface OfCreatorAutomationScenario {
  id: string;
  creator_id: string;
  scenario_key: ChatAutomationScenarioKey;
  label: string;
  description: string | null;
  trigger_event_type: string;
  linked_script_id: string | null;
  enabled: boolean;
  creator_enabled: boolean;
  action_mode_override: MessageScriptActionMode | null;
  metadata: Record<string, unknown>;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
  linked_script?: Pick<OfMessageScript, "id" | "name" | "status" | "action_mode" | "trigger_event_type" | "category"> | null;
  running_count?: number;
  failed_count?: number;
  recent_events?: Array<Pick<OfEvent, "id" | "event_type" | "received_at">>;
}

export interface OfRevenueJourney {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  source_channel: string;
  target_channel: string;
  audience: string;
  trigger_event: string;
  conversation_flow_id: string;
  expected_outcome: string;
  success_event: string;
  failure_event: string;
  status: RevenueJourneyStatus;
  metadata: Record<string, unknown>;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
  conversation_flow?: Pick<OfMessageScript, "id" | "name" | "status" | "action_mode" | "trigger_event_type" | "category"> | null;
  creator?: Pick<OfCreator, "id" | "username" | "display_name"> | null;
}

export interface RevenueJourneyWorkspaceData {
  creators: OfCreator[];
  journeys: OfRevenueJourney[];
}

export interface ScriptBuilderConfig {
  schemaVersion?: number;
  variables?: ScriptBuilderVariable[];
  workspace?: ScriptWorkspaceConfig;
  source_proposal_id?: string;
  intelligence_snapshot_id?: string;
  opportunity_projection_id?: string;
  cip_version?: string;
  created_from_proposal_at?: string;
}

export interface OfAutomationRun {
  id: string;
  creator_id: string;
  script_id: string;
  fan_id: string;
  source_event_id: string | null;
  action_mode: MessageScriptActionMode;
  status: AutomationRunStatus;
  execution_mode: AutomationExecutionMode;
  simulation_run_id?: string | null;
  metadata?: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  of_message_scripts?: Pick<OfMessageScript, "name" | "trigger_event_type"> | null;
  of_creators?: Pick<OfCreator, "username" | "display_name"> | null;
}

export interface OfConversationInstance {
  id: string;
  creator_id: string;
  subscriber_id: string | null;
  relationship_id: string | null;
  script_id: string;
  source_script_id: string | null;
  script_version: number;
  automation_run_id: string | null;
  originating_event_id: string | null;
  last_event_id: string | null;
  current_step_id: string | null;
  next_step_id: string | null;
  status: ConversationRuntimeStatus;
  execution_mode: AutomationExecutionMode;
  variables: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  retry_count: number;
  waiting_until: string | null;
  waiting_reason: string | null;
  cancellation_reason: string | null;
  completion_reason: string | null;
  last_error: string | null;
  processing_started_at: string | null;
  last_resumed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
  of_message_scripts?: Pick<OfMessageScript, "name" | "trigger_event_type" | "folder_name" | "version_number"> | null;
  current_step?: Pick<OfMessageScriptStep, "id" | "step_order" | "step_type" | "message_body"> | null;
  next_step?: Pick<OfMessageScriptStep, "id" | "step_order" | "step_type" | "message_body"> | null;
  source_event?: Pick<OfEvent, "id" | "event_type" | "received_at"> | null;
}

export interface OfConversationHistoryItem {
  id: string;
  conversation_instance_id: string;
  creator_id: string;
  event_id: string | null;
  step_id: string | null;
  transition_key: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  detail: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface ConversationOwnership {
  owner_type: "creator" | "agency" | "shared" | "unassigned";
  owner_id: string | null;
  owner_label: string | null;
  creator_id: string;
  subscriber_id: string | null;
  relationship_id: string | null;
}

export interface ConversationParticipant {
  id: string | null;
  role: ConversationParticipantRole;
  label: string;
  username: string | null;
  is_primary: boolean;
  metadata: Record<string, unknown>;
}

export interface ConversationHistoryEntry {
  id: string;
  occurred_at: string;
  event_type: string;
  from_state: ConversationLifecycleState | null;
  to_state: ConversationLifecycleState | null;
  detail: string | null;
  payload: Record<string, unknown>;
}

export interface ConversationRelatedEvent {
  id: string;
  event_type: string;
  title: string;
  received_at: string;
}

export interface Conversation extends OfConversationInstance {
  lifecycle_state: ConversationLifecycleState;
  ownership: ConversationOwnership;
  participants: ConversationParticipant[];
  history: ConversationHistoryEntry[];
  related_events: ConversationRelatedEvent[];
}

export type ConversationStatusGroup = "active" | "waiting" | "terminal";
export type AutomationAuditActorType = "system" | "operator";
export type AutomationAuditEntityType = "conversation" | "simulation" | "outbound_message" | "runtime";
export type ConversationOperationalAction =
  | "retry"
  | "resume"
  | "cancel"
  | "restart"
  | "duplicate_as_simulation"
  | "export";
export type HealthAlertSeverity = "info" | "warning" | "critical";

export interface OfAutomationAuditTrailEntry {
  id: string;
  creator_id: string;
  conversation_instance_id: string | null;
  simulation_run_id: string | null;
  outbound_message_id: string | null;
  entity_type: AutomationAuditEntityType;
  action: string;
  actor_type: AutomationAuditActorType;
  actor_label: string | null;
  detail: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ConversationHealthAlert {
  id: string;
  conversation_id: string;
  creator_id: string;
  severity: HealthAlertSeverity;
  kind: "stuck_running" | "delay_overdue" | "approval_overdue" | "reply_overdue" | "repeated_failures";
  title: string;
  detail: string;
  triggered_at: string;
}

export interface ConversationOperationsSummary {
  total: number;
  active: number;
  waiting: number;
  completed: number;
  cancelled: number;
  failed: number;
  production: number;
  simulation: number;
  overdue: number;
  awaitingApproval: number;
  awaitingReply: number;
  healthAlerts: ConversationHealthAlert[];
}

export interface ConversationOperationsDetail {
  conversation: Conversation;
  history: OfConversationHistoryItem[];
  outboundMessages: OfOutboundMessage[];
  auditTrail: OfAutomationAuditTrailEntry[];
  relatedSimulation: OfAutomationSimulation | null;
  subscriber: Record<string, unknown> | null;
  relationship: Record<string, unknown> | null;
  creator: Pick<OfCreator, "id" | "username" | "display_name"> | null;
}

export interface ConversationWorkspaceViewModel {
  selected_creator: Pick<OfCreator, "id" | "username" | "display_name"> | null;
  detail: ConversationOperationsDetail;
  current_queue: Queue | null;
  current_queue_item: QueueWorkspaceItemSummary | null;
  current_opportunity: ConversationOpportunitySummary | null;
  subscriber_context: QueueWorkspaceSubscriberSummary | null;
  recent_events: QueueWorkspaceRecentEvent[];
  attachments: ConversationWorkspaceAttachment[];
  relationship_context?: RelationshipContextProjection | null;
  selected_opening_posture?: OpeningPosture;
}

export interface ConversationOperationsMetrics {
  summary: ConversationOperationsSummary;
  statusCounts: Record<string, number>;
  scriptCounts: Array<{ script_id: string; script_name: string; count: number }>;
  creatorCounts: Array<{ creator_id: string; creator_name: string; count: number }>;
  waitingBuckets: Array<{ label: string; count: number }>;
  dailyVolume: Array<{ date: string; started: number; completed: number; failed: number }>;
}

export interface ConversationOperationsExport {
  exported_at: string;
  detail: ConversationOperationsDetail;
}

export interface OfOutboundMessage {
  id: string;
  creator_id: string;
  fan_id: string;
  script_id: string | null;
  automation_run_id: string | null;
  conversation_instance_id: string | null;
  script_step_id: string | null;
  source_event_id: string | null;
  execution_mode: AutomationExecutionMode;
  simulation_run_id?: string | null;
  destination?: string | null;
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
  metadata?: Record<string, unknown>;
  created_at: string;
  of_message_scripts?: Pick<OfMessageScript, "name"> | null;
  of_creators?: Pick<OfCreator, "username" | "display_name"> | null;
}

export interface OfSimulatedSubscriber {
  id: string;
  creator_id: string;
  name: string;
  username: string;
  subscription_status: string;
  renewal_state: string;
  spend_level: string;
  lifetime_value: number;
  message_history_summary: string | null;
  custom_variables: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OfAutomationSimulation {
  id: string;
  creator_id: string;
  script_id: string | null;
  scenario_id: string | null;
  journey_id?: string | null;
  simulated_subscriber_id: string | null;
  conversation_instance_id: string | null;
  automation_run_id: string | null;
  source_event_id: string | null;
  status: AutomationSimulationStatus;
  event_type: string;
  event_payload: Record<string, unknown>;
  initial_variables: Record<string, unknown>;
  runtime_state: Record<string, unknown>;
  failure_plan: Record<string, unknown>;
  last_error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  simulated_subscriber?: OfSimulatedSubscriber | null;
  script?: Pick<OfMessageScript, "id" | "name" | "action_mode" | "trigger_event_type"> | null;
  scenario?: Pick<OfCreatorAutomationScenario, "id" | "scenario_key" | "label" | "trigger_event_type"> | null;
  journey?: Pick<OfRevenueJourney, "id" | "name" | "source_channel" | "target_channel" | "audience" | "trigger_event" | "expected_outcome" | "success_event" | "failure_event" | "status"> | null;
  conversation?: OfConversationInstance | null;
  history?: OfConversationHistoryItem[];
  outbound_messages?: OfOutboundMessage[];
}

export interface MessageScriptTemplate {
  name: string;
  description?: string;
  triggerEventType: string;
  autoSendEnabled: boolean;
  requiresApproval: boolean;
  actionMode?: MessageScriptActionMode;
  cooldownHours: number;
  maxSendsPerFan: number;
  folderName?: string;
  category?: string;
  tags?: string[];
  versionNumber?: number;
  sourceScriptId?: string | null;
  builderConfig?: ScriptBuilderConfig;
  steps: ScriptStepTemplate[];
}

export interface ScriptStepTemplate {
  id?: string;
  order: number;
  type: MessageScriptStepType;
  body?: string;
  delayMinutes?: number;
  waitForReplyMinutes?: number;
  condition?: {
    key: string;
    value: string;
  };
  nextStepId?: string;
  fallbackStepId?: string;
  metadata?: ScriptBuilderStepMetadata;
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

export function mapConversationRuntimeStatusToLifecycleState(
  status: ConversationRuntimeStatus,
  input?: {
    historyCount?: number;
    waitingUntil?: string | null;
    waitingReason?: string | null;
    cancellationReason?: string | null;
    completionReason?: string | null;
    failedAt?: string | null;
    cancelledAt?: string | null;
  }
): ConversationLifecycleState {
  if (status === "completed") return "completed";
  if (status === "failed") return "escalated";
  if (status === "cancelled") return "archived";
  if (status === "waiting_delay" || status === "waiting_reply" || status === "waiting_approval") return "waiting";
  if ((input?.historyCount ?? 0) === 0 && status === "running") return "new";
  if ((input?.waitingReason ?? "").toLowerCase().includes("escalat")) return "escalated";
  if ((input?.cancellationReason ?? "").toLowerCase().includes("archive")) return "archived";
  return "open";
}

export function mapConversationInstanceToConversation(
  conversation: OfConversationInstance & {
    of_creators?: Pick<OfCreator, "id" | "username" | "display_name"> | Record<string, unknown> | null;
    of_subscribers?: Record<string, unknown> | null;
    of_relationships?: Record<string, unknown> | null;
    source_event?: Pick<OfEvent, "id" | "event_type" | "received_at"> | null;
    current_step?: Pick<OfMessageScriptStep, "id" | "step_order" | "step_type" | "message_body"> | null;
    next_step?: Pick<OfMessageScriptStep, "id" | "step_order" | "step_type" | "message_body"> | null;
  },
  options?: {
    history?: OfConversationHistoryItem[];
    relatedEvents?: Array<Pick<OfEvent, "id" | "event_type" | "received_at">>;
    subscriber?: Record<string, unknown> | null;
    relationship?: Record<string, unknown> | null;
  }
): Conversation {
  const history = (options?.history ?? []).map((item) => ({
    id: item.id,
    occurred_at: item.created_at,
    event_type: item.event_type,
    from_state: mapConversationRuntimeStatusToLifecycleState(toRuntimeStatus(item.from_status), {
      historyCount: options?.history?.length ?? 0
    }),
    to_state: mapConversationRuntimeStatusToLifecycleState(toRuntimeStatus(item.to_status), {
      historyCount: options?.history?.length ?? 0
    }),
    detail: item.detail,
    payload: item.payload
  }));
  const creatorRecord = isPlainRecord(conversation.of_creators) ? conversation.of_creators : null;
  const creatorId = conversation.creator_id;
  const creatorLabel = creatorRecord ? firstString(creatorRecord, ["display_name", "username"]) ?? creatorId : creatorId;
  const subscriberId = conversation.subscriber_id;
  const subscriberRecord = isPlainRecord(options?.subscriber) ? options?.subscriber : isPlainRecord(conversation.of_subscribers) ? conversation.of_subscribers : null;
  const subscriberLabel = subscriberRecord ? firstString(subscriberRecord, ["display_name", "username"]) ?? subscriberId ?? "Subscriber" : "Subscriber";
  const relationshipRecord = isPlainRecord(options?.relationship) ? options?.relationship : isPlainRecord(conversation.of_relationships) ? conversation.of_relationships : null;
  const ownerType: ConversationOwnership["owner_type"] = creatorId ? "creator" : "unassigned";
  const ownerLabel = ownerType === "creator" ? creatorLabel : null;
  const relatedEventSource = options?.relatedEvents ?? (conversation.source_event ? [conversation.source_event] : []);
  const participants: ConversationParticipant[] = [
    {
      id: creatorId,
      role: "creator",
      label: creatorLabel,
      username: creatorRecord ? firstString(creatorRecord, ["username"]) : null,
      is_primary: true,
      metadata: {}
    },
    {
      id: subscriberId,
      role: "subscriber",
      label: subscriberLabel,
      username: subscriberRecord ? firstString(subscriberRecord, ["username"]) : null,
      is_primary: false,
      metadata: relationshipRecord ? { relationship_id: conversation.relationship_id } : {}
    }
  ];

  return {
    ...conversation,
    lifecycle_state: mapConversationRuntimeStatusToLifecycleState(conversation.status, {
      historyCount: history.length,
      waitingUntil: conversation.waiting_until,
      waitingReason: conversation.waiting_reason,
      cancellationReason: conversation.cancellation_reason,
      completionReason: conversation.completion_reason,
      failedAt: conversation.failed_at,
      cancelledAt: conversation.cancelled_at
    }),
    ownership: {
      owner_type: ownerType,
      owner_id: ownerType === "creator" ? creatorId : null,
      owner_label: ownerLabel,
      creator_id: creatorId,
      subscriber_id: subscriberId,
      relationship_id: conversation.relationship_id
    },
    participants,
    history,
    related_events: relatedEventSource.map((event) => ({
      id: event.id,
      event_type: event.event_type,
      title: summarizeEventType(event.event_type),
      received_at: event.received_at
    }))
  };
}

function toRuntimeStatus(value: string | null | undefined): ConversationRuntimeStatus {
  if (value === "running" || value === "waiting_delay" || value === "waiting_reply" || value === "waiting_approval" || value === "completed" || value === "cancelled" || value === "failed") {
    return value;
  }
  return "running";
}

function firstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function mapTaskStatusToQueueItemStatus(status: TaskStatus): QueueItemLifecycleStatus {
  if (status === "open") return "visible";
  if (status === "in_progress") return "claimed";
  if (status === "waiting") return "assigned";
  return "resolved";
}

export function mapTaskToQueueItem(task: OfTask): QueueItem {
  const queueId = queueIdFromTask(task);
  return {
    id: task.id,
    queue_id: queueId,
    conversation_id: conversationIdFromTask(task),
    opportunity_id: null,
    assigned_operator_id: task.assigned_to,
    priority: task.priority,
    status: mapTaskStatusToQueueItemStatus(task.status),
    created_at: task.created_at,
    updated_at: task.updated_at,
    moved_at: task.updated_at,
    resolved_at: task.completed_at ?? task.cancelled_at ?? task.archived_at,
    metadata: {
      source_type: task.source_type,
      source_id: task.source_id,
      source_event_id: task.source_event_id,
      subscriber_id: task.subscriber_id,
      chat_id: task.chat_id,
      task_type: task.task_type,
      rule_name: task.rule_name,
      rule_version: task.rule_version,
      priority_score: task.priority_score
    }
  };
}

export function mapTaskToQueue(task: OfTask): Queue {
  return {
    id: queueIdFromTask(task),
    creator_id: task.creator_id,
    name: task.rule_name,
    label: humanizeIdentifier(task.rule_name),
    description: task.description,
    operational_status: task.status === "archived" ? "archived" : "active",
    visibility_state: task.status === "archived" ? "hidden" : "visible",
    priority: task.priority,
    assigned_operator_id: task.assigned_to,
    created_at: task.created_at,
    updated_at: task.updated_at,
    metadata: {
      task_type: task.task_type,
      source_type: task.source_type
    }
  };
}

export interface QueueWorkspaceCompatibilityViewModel {
  queue: Queue;
  items: QueueItem[];
}

function queueIdFromTask(task: OfTask) {
  return `queue:${task.creator_id}:${task.rule_name}`;
}

function conversationIdFromTask(task: OfTask) {
  if (typeof task.source_type === "string" && /conversation/i.test(task.source_type) && typeof task.source_id === "string") {
    return task.source_id;
  }
  return null;
}

function humanizeIdentifier(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/* ==========================================================================
 * Playbook Journey / Node Architecture (ADR-0002)
 * See docs/architecture/adr-0002-playbook-journey-node-architecture.md
 *
 * These types define the JOURNEY layer that sits ABOVE the existing script
 * runtime. They are authoring / orchestration contracts only and introduce no
 * execution engine. A Conversation node's Node Flow is realised by an existing
 * OfMessageScript (referenced via NodeFlowRef); that script is still compiled
 * and executed by the existing runtime, unchanged.
 * ========================================================================== */

/** Bounded-capability classes a journey node may take. */
export type JourneyNodeClass =
  | "channel"
  | "identity"
  | "onboarding"
  | "process"
  | "conversation"
  | "human";

/** Provisional, transport-scoped channels a Channel node may represent. */
export type JourneyChannelKind = "instagram" | "onlyfans" | "email" | "web_chat";

/**
 * The reduced, operator-facing stages of a Conversation node's Node Flow.
 * A VIEW contract for the drill-down editor (Source -> Opening -> Reply ->
 * Decision -> Response -> Exit). This is NOT the runtime step model.
 */
export type ConversationSurfaceStage =
  | "source"
  | "opening"
  | "reply"
  | "decision"
  | "response"
  | "exit";

/**
 * Reference from a node to the internal process that realises it (its Node Flow).
 * A Conversation node points at an existing OfMessageScript by id; the script is
 * still executed by the existing runtime. The union is intentionally open to
 * future extension but MUST NOT imply a new execution engine.
 */
export type NodeFlowRef = {
  kind: "script";
  scriptId: string;
  scriptVersion?: number;
};

/** A declared input a node accepts. */
export interface JourneyNodeInput {
  key: string;
  label: string;
  required?: boolean;
  description?: string;
}

/** A declared output a node produces into node-local or journey context. */
export interface JourneyNodeOutput {
  key: string;
  label: string;
  description?: string;
}

/** A named outlet by which control leaves a node; bound by JourneyNodeConnection.from.port. */
export interface JourneyNodeDestination {
  key: string;
  label: string;
  description?: string;
}

/** The explicit IO / destinations contract every node MUST declare. */
export interface JourneyNodeContract {
  inputs: JourneyNodeInput[];
  outputs: JourneyNodeOutput[];
  destinations: JourneyNodeDestination[];
}

/* --- Per-class node configuration (discriminated by JourneyNode.class) ----- */

export interface JourneyChannelNodeConfig {
  channel: JourneyChannelKind;
  /** Human label for the transport account / inbox; NOT a canonical identity. */
  accountLabel?: string;
  /** Key of the provisional, transport-scoped identity this channel emits. */
  provisionalIdentityKey?: string;
}

export interface JourneyIdentityNodeConfig {
  /** Strategy for resolving/linking a provisional identity to a canonical Subscriber. */
  resolution: "auto_link" | "match_or_create" | "operator_review";
  /** Whether an unresolved identity blocks progression. */
  blockUntilResolved?: boolean;
}

export interface JourneyOnboardingNodeConfig {
  /** What this creator-scoped onboarding node configures. */
  scope: "creator_connection" | "permissions" | "service_configuration";
}

export interface JourneyProcessNodeConfig {
  /** Registry-backed taxonomy key describing the bounded activity. */
  activityKey?: string;
}

export interface JourneyConversationNodeConfig {
  /** Bounded turn budget (sprint guidance: 3-6). A design-time contract, not a new runtime. */
  minTurns?: number;
  maxTurns?: number;
  /** The visible drill-down stages an operator sees and approves. */
  surface?: ConversationSurfaceStage[];
}

export interface JourneyHumanNodeConfig {
  /** The kind of human involvement this node represents. */
  mode: "handoff" | "review" | "intervention";
  /** Destination queue for the handoff, by registry / queue key. */
  queueKey?: string;
}

/* --- Node (discriminated union on `class`) -------------------------------- */

export interface JourneyNodePosition {
  x: number;
  y: number;
}

interface JourneyNodeBase {
  id: string;
  label: string;
  position: JourneyNodePosition;
  /** Optional grouping key for visually clustering nodes on the canvas. */
  group?: string;
  /** The explicit IO / destinations contract for this node. */
  contract: JourneyNodeContract;
  /** Reference to the node's internal process, when it has one. */
  nodeFlowRef?: NodeFlowRef;
  /**
   * COMPOSE-2: optional reference to the reusable CAPABILITY this node
   * represents (WHAT). Independent of `nodeFlowRef` (WHICH concrete Node Flow
   * currently implements it) — the two are distinct and MUST NOT be merged.
   * Additive + optional: NODE-1C graphs saved without it load unchanged, and it
   * never affects runtime execution. Resolved to a CapabilityDescriptor by the
   * (semantic, non-executing) Capability Registry.
   */
  capabilityRef?: CapabilityRef;
}

export interface JourneyChannelNode extends JourneyNodeBase {
  class: "channel";
  config: JourneyChannelNodeConfig;
}

export interface JourneyIdentityNode extends JourneyNodeBase {
  class: "identity";
  config: JourneyIdentityNodeConfig;
}

export interface JourneyOnboardingNode extends JourneyNodeBase {
  class: "onboarding";
  config: JourneyOnboardingNodeConfig;
}

export interface JourneyProcessNode extends JourneyNodeBase {
  class: "process";
  config: JourneyProcessNodeConfig;
}

export interface JourneyConversationNode extends JourneyNodeBase {
  class: "conversation";
  config: JourneyConversationNodeConfig;
}

export interface JourneyHumanNode extends JourneyNodeBase {
  class: "human";
  config: JourneyHumanNodeConfig;
}

export type JourneyNode =
  | JourneyChannelNode
  | JourneyIdentityNode
  | JourneyOnboardingNode
  | JourneyProcessNode
  | JourneyConversationNode
  | JourneyHumanNode;

/* --- Connections + graph document ----------------------------------------- */

export interface JourneyNodeConnectionEndpoint {
  nodeId: string;
  /** Destination outlet key on the source node (matches JourneyNodeDestination.key). */
  port?: string;
}

export interface JourneyNodeConnection {
  id: string;
  from: JourneyNodeConnectionEndpoint;
  to: JourneyNodeConnectionEndpoint;
  /** Operator-facing edge label, e.g. an outcome name. */
  label?: string;
}

export interface JourneyGroup {
  id: string;
  label: string;
  colorKey?: string;
  // Optional persisted layout (NODE-1C). When absent, geometry is derived from
  // member node positions. Persisting it lets a stored graph round-trip the
  // group box exactly as the canvas rendered it.
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface JourneyViewport {
  x: number;
  y: number;
  zoom: number;
}

/**
 * The persisted Journey graph document - the smallest surface NODE-1C needs:
 * node class, position, grouping, source/destination relationships, node
 * configuration and node-flow reference. Stored as JSONB alongside the existing
 * builder_config / proposal_payload precedents, with NO changes to runtime tables.
 */
export interface JourneyGraph {
  schemaVersion: 1;
  nodes: JourneyNode[];
  connections: JourneyNodeConnection[];
  groups?: JourneyGroup[];
  viewport?: JourneyViewport;
  selectedNodeId?: string | null;
}

/** A Playbook Journey (the "Journey" orchestration map) owned by Playbook Studio. */
export interface PlaybookJourney {
  id: string;
  creatorId: string;
  title: string;
  description?: string;
  status: "draft" | "active" | "archived";
  graph: JourneyGraph;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Persisted playbook-journey row (NODE-1C). One row per playbook (script),
 * keyed by script_id. Stores the JourneyGraph as JSONB alongside light
 * metadata. It does NOT touch runtime tables; the runtime continues to walk the
 * compiled script referenced by each Conversation node's nodeFlowRef.
 */
export interface OfPlaybookJourney {
  id: string;
  script_id: string;
  creator_id: string;
  title: string;
  status: "draft" | "active" | "archived";
  schema_version: number;
  version: number;
  graph: JourneyGraph;
  created_at: string;
  updated_at: string;
}

/* ==========================================================================
 * NODE-1E: Journey Node Contract — capability metadata (derived, not persisted)
 *
 * A capability-facing descriptor for a journey node. For the journey canvas and
 * node drawer it answers three questions WITHOUT reaching into a node's Node
 * Flow implementation: what bounded capability is this, how does it connect
 * (entry/exit) into the journey, and where does it hand off?
 *
 * It is a DERIVED VIEW, not part of JourneyGraph. It is computed
 * deterministically from a node's class, declared IO contract, config and
 * nodeFlowRef, plus a single evidence probe (whether a referenced script
 * exists). Keeping it out of the persisted graph means NODE-1C stored graphs
 * stay byte-compatible and no migration is required.
 *
 * Readiness is deterministic and evidence-based: the ONLY runtime-adjacent
 * signal consulted is referenced-script existence. It never infers live
 * operational health or runtime readiness.
 * ========================================================================== */

/**
 * Evidence-based readiness of a node's capability.
 * - `ready`               structurally complete: a referenced node flow exists,
 *                         or the class needs no node flow and is configured.
 * - `needs_configuration` a required binding/config is absent (e.g. a
 *                         Conversation node with no nodeFlowRef).
 * - `reference_missing`   a nodeFlowRef points at a script that does not exist
 *                         (evidence: the script lookup failed).
 * - `manual`              a human-owned capability; there is no automated
 *                         implementation to validate (by design).
 * - `unknown`             could not be determined; the safe fallback for
 *                         unmapped classes or unverifiable references.
 *
 * NOTE: readiness describes structural / contract completeness from deterministic
 * evidence. It is NOT a live operational-health or runtime-readiness signal.
 */
export type JourneyNodeReadiness =
  | "ready"
  | "needs_configuration"
  | "reference_missing"
  | "manual"
  | "unknown";

/** Which party owns a node's bounded capability. */
export type JourneyNodeOwner = "channel" | "system" | "automation" | "human";

/**
 * Capability metadata for a single journey node (the NODE-1E "Journey Node
 * Contract"). Derived at render; never copied into the persisted JourneyGraph.
 * It carries the node's reference (nodeFlowRef) but never the Node Flow's
 * contents — navigation into the implementation stays via nodeFlowRef alone.
 */
export interface JourneyNodeCapability {
  nodeId: string;
  label: string;
  nodeClass: JourneyNodeClass;
  /** Human-readable capability, e.g. "Automated conversation". */
  capabilityType: string;
  /** Channel / source context, when known (a Channel's own transport, or the journey's entry channel). */
  source?: string;
  /** Deterministic summary of how control ENTERS this node (from its declared inputs / class). */
  entrySummary: string;
  /** Deterministic summary of how control LEAVES this node (from its declared destinations). */
  exitSummary: string;
  /** The node's reference to its bounded implementation — the reference only, never its contents. */
  nodeFlowRef?: NodeFlowRef;
  /** Convenience: whether the node references a Node Flow at all. */
  hasNodeFlow: boolean;
  /** Which party owns this capability. */
  owner: JourneyNodeOwner;
  /** Marks a node where a human takes over. */
  isHumanHandoff: boolean;
  /** Evidence-based readiness (see JourneyNodeReadiness). */
  readiness: JourneyNodeReadiness;
  /** One-line, evidence-based explanation of the readiness value. */
  readinessDetail: string;
  /** Optional evidence notes / warnings (e.g. a referenced flow that was not found). */
  warnings?: string[];

  /* --- COMPOSE-2: reusable-capability metadata (additive; all optional) ------ */
  /** The node's reusable-capability reference (WHAT), when bound. */
  capabilityRef?: CapabilityRef;
  /** Registry key echoed from capabilityRef, when the node is capability-bound. */
  capabilityKey?: string;
  /** Registry label, when the capabilityRef resolves in the Capability Registry. */
  capabilityLabel?: string;
  /** Semantic category, when the descriptor resolves. */
  capabilityCategory?: CapabilityCategory;
  /** Capability maturity, when the descriptor resolves. */
  capabilityStatus?: CapabilityStatus;
  /** One-line bounded responsibility (from the descriptor), when resolved. */
  boundedResponsibility?: string;
  /** Whether a concrete implementation exists (node nodeFlowRef, or descriptor implementationRefs). */
  implementationAvailable?: boolean;
  /** COMPOSE-2 compatibility state of this node's capability/flow binding. */
  capabilityBinding?: CapabilityBindingState;
}

/* ==========================================================================
 * COMPOSE-2: Capability Registry + Journey Composition Model
 * See docs/architecture/compose-2-capability-registry-and-journey-composition.md
 *
 * A Capability is the reusable SEMANTIC definition of one bounded piece of work
 * the system can perform. A Journey Node references WHICH reusable capability it
 * represents via `capabilityRef` (a stable, script-independent semantic identity)
 * and, INDEPENDENTLY, WHICH concrete Node Flow currently implements it via
 * `nodeFlowRef` (a script). The two references are DIFFERENT concerns and MUST
 * NOT be merged: capabilityRef is stable and reusable across creators/journeys;
 * nodeFlowRef is the concrete, swappable implementation the runtime executes.
 *
 * The Capability Registry that resolves a capabilityRef is SEMANTIC METADATA
 * only. It is not a runtime engine, not a script store, not a second Journey
 * graph, and it does not replace nodeFlowRef.
 * ========================================================================== */

/**
 * Stable, serialisable, script-independent semantic reference to a reusable
 * capability. Carries no runtime state, no Node Flow steps, no Journey layout.
 */
export interface CapabilityRef {
  /** Stable semantic key (snake_case). `string` (not a closed union) so unknown/older keys degrade gracefully. */
  capabilityKey: string;
  /** Optional contract version of the referenced Capability descriptor. */
  version?: number;
}

/**
 * The known/seeded capability keys. COMPOSE-2 v0.1 seeded the first six;
 * COMPOSE-3 adds `identity_resolution` (a system-owned identity capability,
 * distinct from a Channel's transport entry). Authoring convenience; refs
 * remain open `string` so unknown/older keys still degrade gracefully.
 */
export type CapabilityKey =
  | "channel_source_entry"
  | "new_subscriber_welcome_discovery"
  | "make_offer_ppv"
  | "silence_follow_up"
  | "boundary_safety_response"
  | "human_handoff"
  | "identity_resolution";

/** Coarse semantic grouping for a capability. Aligned with — but distinct from — JourneyNodeClass. */
export type CapabilityCategory =
  | "channel"
  | "identity"
  | "conversation"
  | "commerce"
  | "engagement"
  | "safety"
  | "human";

/** Maturity of a Capability descriptor. NOT a runtime-health signal. */
export type CapabilityStatus = "stable" | "experimental" | "proposed";

/**
 * Canonical capability CONTEXT INPUT keys — the small shared vocabulary a
 * capability draws context from, mapped to existing canonical boundaries so no
 * capability invents its own context names. Keys only; no transport/execution.
 */
export type CapabilityInputKey =
  | "event_context"          // triggering event (HOST / of_events)
  | "provisional_identity"   // COMPOSE-3: provisional, transport-scoped identity evidence (pre-resolution)
  | "identity_context"       // canonical Subscriber identity (Subscriber Profile)
  | "relationship_context"   // RelationshipContextProjection (Hermes relationship context)
  | "conversation_context"   // conversation state / history (OfConversationInstance)
  | "interpretation_signals" // CanonicalInterpretationSignal[] (Conversation Interpretation)
  | "opportunity_context"    // detected ConversationOpportunity, if any
  | "creator_context";       // creator scope / archetype (Creator Workspace)

/**
 * Canonical capability CONTEXT OUTPUT / emission keys — what a capability may
 * emit, mapped to existing canonical mechanisms. Keys only; no transport.
 */
export type CapabilityOutputKey =
  | "outcome"                // terminal outcome (end step outcomeKey/terminalType)
  | "next_event"             // an emitted of_events row (e.g. no_response, offer_accepted)
  | "provisional_identity"   // COMPOSE-3: provisional identity evidence emitted by a Channel boundary
  | "identity_context"       // COMPOSE-3: canonical Subscriber identity produced by identity resolution
  | "conversation_action"    // a message/action within the conversation
  | "interpretation_input"   // an OfMessageClassification appended for a reply
  | "opportunity_signal"     // a Conversation Opportunity signal
  | "human_handoff_request"  // a Queue handoff request (NSP-5 minimum payload)
  | "relationship_update";   // a relationship/context update

/**
 * ONE canonical interpretation-signal vocabulary for capability contracts
 * (COMPOSE-2). It reconciles NSP-4's inline response categories with the
 * existing ConversationIntent model; it is NOT a new interpretation SYSTEM and
 * NOT a producer (COMPOSE-4 wires producers/consumers). A signal describes what
 * a message MEANS and is distinct from an Opportunity (what to act on) and a
 * Capability (the work performed).
 */
export type CanonicalInterpretationSignal =
  | "greeting"
  | "warm_enthusiastic"
  | "compliment"
  | "flirtatious"
  | "shares_preference"
  | "curious_about_creator"
  | "casual_chat"
  | "off_topic"
  | "disengaged"
  | "content_interest"
  | "purchase_intent"
  | "ppv_interest"
  | "custom_request"
  | "subscription_question"
  | "price_objection"
  | "not_ready"
  | "boundary_testing"
  | "unsupported_request"
  | "complaint"
  | "support_request"
  | "silence";

/**
 * The four COMPOSE-2 capability/flow compatibility states a Journey node may be in.
 * - `capability_and_flow` known reusable capability WITH a concrete Node Flow.
 * - `capability_only`      known capability, no concrete Node Flow attached yet.
 * - `flow_only`            legacy/backwards-compatible concrete flow, no capability mapping.
 * - `unbound`              neither (orchestration/channel/group/manual/unknown legacy node).
 */
export type CapabilityBindingState =
  | "capability_and_flow"
  | "capability_only"
  | "flow_only"
  | "unbound";

/**
 * Typed descriptor for one reusable capability. The smallest sufficient
 * contract: what it is, the bounded responsibility it owns, its category, the
 * canonical context it may consume/emit, the interpretation signals and
 * opportunity types it works with, any known concrete implementations, its
 * owner and maturity. It holds NO runtime state and NO Node Flow steps.
 */
export interface CapabilityDescriptor {
  capabilityKey: CapabilityKey;
  version: number;
  label: string;
  /** One-line bounded responsibility this capability owns. */
  description: string;
  category: CapabilityCategory;
  /** Which party owns this capability (reuses the JourneyNode owner axis). */
  owner: JourneyNodeOwner;
  status: CapabilityStatus;
  /** True when a human necessarily owns the work (e.g. handoff/review). */
  requiresHuman: boolean;
  /** Canonical context keys this capability may consume. */
  inputKeys: CapabilityInputKey[];
  /** Canonical emission keys this capability may produce. */
  outputKeys: CapabilityOutputKey[];
  /** Interpretation signals this capability is designed to act on. */
  supportedInterpretationSignals?: CanonicalInterpretationSignal[];
  /**
   * Canonical Conversation Opportunity types this capability can surface, named
   * against docs/conversation-opportunity-catalogue-v1.md. Typed as `string[]`
   * to avoid minting a duplicate opportunity vocabulary; the canonical
   * opportunity type/mapping is owned by the Opportunity seam (COMPOSE-4).
   */
  supportedOpportunityTypes?: string[];
  /**
   * Concrete Node Flow implementations known at the SEMANTIC layer (often empty
   * in v0.1). The live, per-creator implementation is normally attached at the
   * Journey node via `nodeFlowRef`, not here.
   */
  implementationRefs?: NodeFlowRef[];
}

/**
 * Illustrative typed journey for Emma's New Subscriber funnel (ADR-0002 worked
 * example). This is NOT the live migration (that is NODE-1E); it exists so the
 * node contract is exercised by the TypeScript compiler:
 *
 *   OnlyFans (Channel) -> New Subscriber Chat (Conversation) -> Human Handoff (Human)
 *
 * COMPOSE-2: each node now also carries a `capabilityRef` (WHAT reusable
 * capability), independent of the Conversation node's `nodeFlowRef` (WHICH
 * concrete script implements it).
 */
export const EMMA_NEW_SUBSCRIBER_JOURNEY_EXAMPLE: PlaybookJourney = {
  id: "journey-emma-new-subscriber",
  creatorId: "creator-emma",
  title: "New Subscriber Funnel",
  description: "Emma's new-subscriber journey: welcome, interpret, hand off.",
  status: "draft",
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  graph: {
    schemaVersion: 1,
    selectedNodeId: "node-new-subscriber-chat",
    nodes: [
      {
        id: "node-onlyfans-channel",
        class: "channel",
        label: "OnlyFans",
        position: { x: 80, y: 200 },
        capabilityRef: { capabilityKey: "channel_source_entry", version: 1 },
        contract: {
          inputs: [],
          outputs: [{ key: "provisional_subscriber_ref", label: "Provisional subscriber reference" }],
          destinations: [{ key: "new_subscriber", label: "New subscriber" }]
        },
        config: {
          channel: "onlyfans",
          accountLabel: "Emma on OnlyFans",
          provisionalIdentityKey: "of_subscriber_ref"
        }
      },
      {
        id: "node-new-subscriber-chat",
        class: "conversation",
        label: "New Subscriber Chat",
        position: { x: 420, y: 200 },
        capabilityRef: { capabilityKey: "new_subscriber_welcome_discovery", version: 1 },
        nodeFlowRef: { kind: "script", scriptId: "script-new-subscriber", scriptVersion: 1 },
        contract: {
          inputs: [{ key: "provisional_subscriber_ref", label: "Provisional subscriber reference", required: true }],
          outputs: [
            { key: "conversation_state", label: "Conversation state" },
            { key: "latest_interpretation", label: "Latest interpretation" }
          ],
          destinations: [
            { key: "handoff", label: "Hand off to human" },
            { key: "terminal", label: "Ended" }
          ]
        },
        config: {
          minTurns: 3,
          maxTurns: 6,
          surface: ["source", "opening", "reply", "decision", "response", "exit"]
        }
      },
      {
        id: "node-human-handoff",
        class: "human",
        label: "Human Handoff",
        position: { x: 760, y: 200 },
        capabilityRef: { capabilityKey: "human_handoff", version: 1 },
        contract: {
          inputs: [
            { key: "conversation_state", label: "Conversation state", required: true },
            { key: "latest_interpretation", label: "Latest interpretation" }
          ],
          outputs: [{ key: "queue_item", label: "Queue item" }],
          destinations: [{ key: "queued", label: "Queued for operator" }]
        },
        config: {
          mode: "handoff",
          queueKey: "new_subscriber_review"
        }
      }
    ],
    connections: [
      {
        id: "edge-channel-to-chat",
        from: { nodeId: "node-onlyfans-channel", port: "new_subscriber" },
        to: { nodeId: "node-new-subscriber-chat" },
        label: "New subscriber"
      },
      {
        id: "edge-chat-to-handoff",
        from: { nodeId: "node-new-subscriber-chat", port: "handoff" },
        to: { nodeId: "node-human-handoff" },
        label: "Handoff"
      }
    ],
    viewport: { x: 0, y: 0, zoom: 0.9 }
  }
};

/* ==========================================================================
 * COMPOSE-3: Instagram Entry + Identity Resolution
 * See docs/architecture/compose-3-instagram-entry-and-identity-resolution.md
 *
 * Contracts + a small, dependency-free DETERMINISTIC CORE that proves the
 * architectural path:
 *
 *   Instagram event
 *     -> Channel: Instagram Entry (channel_source_entry)  [ingestion boundary]
 *     -> provisional identity evidence                    [ProvisionalIdentity]
 *     -> Identity Resolution (identity_resolution)         [resolveProvisionalIdentity]
 *     -> downstream relationship context                  [RelationshipContextProjection]
 *
 * Hard boundaries preserved by these contracts:
 *   - Channel ingestion produces provisional identity evidence; it NEVER claims
 *     a person has been resolved (ProvisionalIdentity.resolutionState is always
 *     "provisional").
 *   - Identity resolution is a SEPARATE, deterministic step; it resolves ONLY on
 *     exact, same-platform, same-creator evidence and never fabricates a contact,
 *     relationship, or cross-platform match.
 *   - Relationship context is emitted only as the existing RelationshipContextProjection
 *     shape (Hermes/FYV boundary), so downstream consumers read it unchanged.
 *   - Nothing here interprets a message or creates an Opportunity/Queue item
 *     (that is COMPOSE-4). These functions are pure and hold no runtime state.
 * ========================================================================== */

/** Canonical provider string for Instagram-originated events. */
export const INSTAGRAM_PROVIDER = "instagram" as const;

/** Where an Instagram-originated event entered the system (audit provenance). */
export interface InstagramEventSource {
  platform: "instagram";
  /** The Instagram account/business id the event targets, when known. */
  accountId: string | null;
  /** How the event reached the ingestion boundary (fixtures / adapter / webhook forward). */
  receivedVia: string;
}

/**
 * The minimum canonical contract emitted by the Instagram Channel boundary. It
 * is transport-scoped EVIDENCE — never a resolved person. `resolutionState` is
 * fixed to "provisional" to make the distinction unforgeable at the type level:
 * a provisional external identity is NOT a resolved internal relationship
 * identity, even when a username or platform id is present.
 */
export interface ProvisionalIdentity {
  /** Source platform that produced the evidence. */
  sourcePlatform: PlatformProvider;
  /** External account/user id on the source platform, where available. */
  externalId: string | null;
  /** Username / handle on the source platform, where available. */
  username: string | null;
  /** FMF creator/account context (canonical creator id), where available. */
  creatorId: string | null;
  /** The creator's external account id on the source platform, where available. */
  creatorExternalId: string | null;
  /** Reference back to the source event (provider_event_id / of_events id). */
  sourceEventRef: string | null;
  /** When the evidence was observed (ISO 8601). */
  evidenceAt: string;
  /** Always "provisional" at the channel boundary — no resolution is claimed. */
  resolutionState: "provisional";
}

/**
 * A validated + normalized Instagram event, ready to persist into the canonical
 * event boundary (of_events). `raw` preserves the source evidence verbatim for
 * later audit/debugging; `provisionalIdentity` is the transport-scoped evidence
 * the Channel boundary emits alongside the event.
 */
export interface NormalizedInstagramEvent {
  provider: typeof INSTAGRAM_PROVIDER;
  /** Provider event id preserved for idempotent/deduplicated ingestion, where available. */
  providerEventId: string | null;
  /** Normalized, non-empty event type. */
  eventType: string;
  /** FMF creator id, when the caller identified the creator directly. */
  creatorId: string | null;
  /** The creator's Instagram account id, when the caller identified by account. */
  creatorExternalId: string | null;
  /** When the source event occurred (ISO 8601), when available. */
  occurredAt: string | null;
  /** Source provenance metadata. */
  source: InstagramEventSource;
  /** Transport-scoped provisional identity evidence. */
  provisionalIdentity: ProvisionalIdentity;
  /** The raw source payload, preserved verbatim. */
  raw: Record<string, unknown>;
}

/** Deterministic outcome of validating + normalizing an Instagram ingestion payload. */
export type InstagramIngestionOutcome =
  | { ok: true; event: NormalizedInstagramEvent; provisionalIdentity: ProvisionalIdentity }
  | { ok: false; statusCode: number; error: string; field?: string };

/**
 * A minimal, canonical view of an EXISTING relationship record used as a
 * resolution candidate. It reuses the existing contact/relationship boundary
 * (of_subscriber_relationships) rather than inventing a competing model: the
 * caller loads candidates and the resolver stays pure + deterministic.
 */
export interface IdentityCandidate {
  /** Canonical of_subscriber_relationships id. */
  subscriberRelationshipId: string;
  /** Canonical subscriber id, when known. */
  subscriberId?: string | null;
  /** Creator that owns this relationship (scopes resolution — never cross-creator). */
  creatorId: string;
  /** Platform of the stored external identifier (scopes resolution — never cross-platform). */
  platformProvider: PlatformProvider;
  /** Stored external identifier (platform_subscriber_id), when known. */
  externalId?: string | null;
  /** Stored username/handle, when known. */
  username?: string | null;
}

export type IdentityResolutionStatus = "resolved" | "unresolved";

/** How a resolution was reached. "none" accompanies an unresolved result. */
export type IdentityResolutionMethod = "external_id_exact" | "username_exact" | "none";

/** The canonical identity a resolved provisional identity maps to. */
export interface ResolvedIdentity {
  subscriberRelationshipId: string;
  subscriberId: string | null;
  matchedOn: IdentityResolutionMethod;
}

/**
 * The deterministic result of an identity-resolution attempt. `resolved` is null
 * for an unresolved result — a valid, safe state that must NOT fabricate a
 * contact or relationship.
 */
export interface IdentityResolutionResult {
  status: IdentityResolutionStatus;
  method: IdentityResolutionMethod;
  /** Deterministic confidence: 1 exact external id, 0.9 exact username, 0 unresolved. */
  confidence: number;
  /** Echo of the provisional evidence the attempt consumed. */
  provisional: ProvisionalIdentity;
  /** The resolved canonical identity, or null when unresolved. */
  resolved: ResolvedIdentity | null;
  warnings: string[];
}

/* --- Deterministic core (pure; no I/O, no runtime state) ------------------- */

function isComposeRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function composeString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "bigint") return String(value);
  return null;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const found = composeString(record[key]);
    if (found) return found;
  }
  return null;
}

function pickNestedString(record: Record<string, unknown>, path: string[], keys: string[]): string | null {
  let cursor: unknown = record;
  for (const segment of path) {
    if (!isComposeRecord(cursor)) return null;
    cursor = cursor[segment];
  }
  if (!isComposeRecord(cursor)) return null;
  return pickString(cursor, keys);
}

/**
 * Deterministically validate + normalize an Instagram-originated payload and
 * emit provisional identity evidence. Pure: given the same input (and
 * receivedAt) it always returns the same outcome. It performs NO interpretation
 * and creates NO opportunity. Creator EXISTENCE is not checked here (that is a
 * data-layer concern for the ingestion route); this validates SHAPE only.
 */
export function normalizeInstagramEvent(
  raw: unknown,
  options: { receivedAt?: string } = {}
): InstagramIngestionOutcome {
  if (!isComposeRecord(raw)) {
    return { ok: false, statusCode: 400, error: "Instagram event payload must be a JSON object" };
  }

  const receivedAt = composeString(options.receivedAt) ?? new Date().toISOString();

  const eventType = pickString(raw, ["eventType", "event_type", "type", "field"]);
  if (!eventType) {
    return { ok: false, statusCode: 400, error: "Instagram event type is required", field: "eventType" };
  }

  const creatorId = pickString(raw, ["creatorId", "creator_id"]);
  const creatorExternalId = pickString(raw, ["instagramAccountId", "instagram_account_id", "accountId", "account_id", "igAccountId", "ig_account_id"]);
  if (!creatorId && !creatorExternalId) {
    return {
      ok: false,
      statusCode: 400,
      error: "An Instagram creator reference (creatorId or instagramAccountId) is required",
      field: "creatorId"
    };
  }

  const providerEventId =
    pickString(raw, ["providerEventId", "provider_event_id", "id", "eventId", "mid"]) ??
    pickNestedString(raw, ["message"], ["mid", "id"]);

  const externalId =
    pickString(raw, ["senderId", "sender_id", "igUserId", "ig_user_id", "fromId", "from_id"]) ??
    pickNestedString(raw, ["user"], ["id", "userId"]) ??
    pickNestedString(raw, ["from"], ["id", "userId"]) ??
    pickNestedString(raw, ["sender"], ["id", "userId"]);

  const username =
    pickString(raw, ["username", "handle", "senderUsername", "sender_username"]) ??
    pickNestedString(raw, ["user"], ["username", "handle"]) ??
    pickNestedString(raw, ["from"], ["username", "handle"]) ??
    pickNestedString(raw, ["sender"], ["username", "handle"]);

  const occurredAt = pickString(raw, ["occurredAt", "occurred_at", "timestamp", "receivedAt", "received_at"]);

  const provisionalIdentity: ProvisionalIdentity = {
    sourcePlatform: INSTAGRAM_PROVIDER,
    externalId,
    username,
    creatorId,
    creatorExternalId,
    sourceEventRef: providerEventId,
    evidenceAt: occurredAt ?? receivedAt,
    resolutionState: "provisional"
  };

  const event: NormalizedInstagramEvent = {
    provider: INSTAGRAM_PROVIDER,
    providerEventId,
    eventType,
    creatorId,
    creatorExternalId,
    occurredAt,
    source: { platform: "instagram", accountId: creatorExternalId, receivedVia: "http_ingest" },
    provisionalIdentity,
    raw
  };

  return { ok: true, event, provisionalIdentity };
}

/**
 * Deterministically attempt to resolve provisional identity evidence to a
 * canonical relationship. Resolution is EXACT only and strictly scoped:
 *   - same platform (never cross-platform),
 *   - same creator (never cross-creator),
 *   - exact external-id match preferred, then exact (case-insensitive) username.
 * There is no fuzzy or heuristic matching. An unresolved result is a valid,
 * safe state and never fabricates a contact or relationship.
 */
export function resolveProvisionalIdentity(
  provisional: ProvisionalIdentity,
  candidates: readonly IdentityCandidate[]
): IdentityResolutionResult {
  const unresolved = (warning: string): IdentityResolutionResult => ({
    status: "unresolved",
    method: "none",
    confidence: 0,
    provisional,
    resolved: null,
    warnings: [warning]
  });

  // Without creator context we cannot scope a match safely; stay unresolved.
  if (!provisional.creatorId) {
    return unresolved("Creator context is missing; the provisional identity cannot be scoped and is left unresolved.");
  }

  const sameScope = (candidate: IdentityCandidate): boolean =>
    candidate.platformProvider === provisional.sourcePlatform && candidate.creatorId === provisional.creatorId;

  // 1. Exact external-id match (strongest deterministic evidence).
  if (provisional.externalId) {
    for (const candidate of candidates) {
      if (sameScope(candidate) && candidate.externalId && candidate.externalId === provisional.externalId) {
        return {
          status: "resolved",
          method: "external_id_exact",
          confidence: 1,
          provisional,
          resolved: {
            subscriberRelationshipId: candidate.subscriberRelationshipId,
            subscriberId: candidate.subscriberId ?? null,
            matchedOn: "external_id_exact"
          },
          warnings: []
        };
      }
    }
  }

  // 2. Exact username match (case-insensitive; weaker than a stable id).
  if (provisional.username) {
    const target = provisional.username.toLowerCase();
    for (const candidate of candidates) {
      if (sameScope(candidate) && candidate.username && candidate.username.toLowerCase() === target) {
        return {
          status: "resolved",
          method: "username_exact",
          confidence: 0.9,
          provisional,
          resolved: {
            subscriberRelationshipId: candidate.subscriberRelationshipId,
            subscriberId: candidate.subscriberId ?? null,
            matchedOn: "username_exact"
          },
          warnings: ["Resolved on an exact username match without a stable external identifier."]
        };
      }
    }
  }

  return unresolved("No canonical subscriber matched the provisional Instagram identity.");
}

/**
 * Derive the downstream relationship context for an identity-resolution result,
 * emitted as the existing RelationshipContextProjection shape so downstream
 * consumers (the Hermes/FYV relationship-context boundary) read it unchanged.
 *
 * Identity resolution is NOT relationship intelligence: this never invents a
 * relationship posture, signals, or commercial summary. It reports identity
 * status/confidence/usability + the known source only. An unresolved identity
 * yields a safe, unusable projection with a warning — never a fabricated
 * contact or relationship.
 */
export function projectRelationshipContextFromIdentity(result: IdentityResolutionResult): RelationshipContextProjection {
  const knownSources = result.provisional.sourcePlatform ? [result.provisional.sourcePlatform] : [];

  if (result.status === "resolved") {
    const exact = result.method === "external_id_exact";
    return {
      identity_status: exact ? "exact" : "probable",
      identity_confidence: result.confidence,
      downstream_usability: exact ? "usable" : "qualified",
      known_sources: knownSources,
      // Identity resolution does not own relationship intelligence.
      relationship_posture: null,
      relationship_signals: [],
      commercial_signal_summary: null,
      warnings: result.warnings.slice()
    };
  }

  return {
    identity_status: "unresolved",
    identity_confidence: 0,
    downstream_usability: "unusable",
    known_sources: knownSources,
    relationship_posture: null,
    relationship_signals: [],
    commercial_signal_summary: null,
    warnings: result.warnings.length
      ? result.warnings.slice()
      : ["Provisional Instagram identity did not resolve to a canonical subscriber."]
  };
}

/**
 * COMPOSE-3 reference journey (typed; exercised by the compiler + the
 * deterministic check). It composes the target path:
 *
 *   Instagram Entry (Channel: channel_source_entry)
 *     -> Identity Resolution (Identity: identity_resolution)
 *       -> resolved   -> New Subscriber Welcome (Conversation) [downstream relationship context]
 *       -> unresolved -> Identity Review (Human)               [graceful unresolved]
 *
 * Compatibility model (COMPOSE-2) exercised:
 *   - Instagram Channel   = capability_only (B): a reusable capability, adapter-backed, no Node Flow.
 *   - Identity Resolution = capability_only (B): capabilityRef WITHOUT a nodeFlowRef — an Identity node
 *     is not required to have a concrete Node Flow.
 *   - New Subscriber Welcome = capability_and_flow (A): capabilityRef + a concrete nodeFlowRef.
 *   - Identity Review     = capability_only (B): human-owned, no Node Flow.
 * capabilityRef (WHAT) stays strictly independent of nodeFlowRef (WHICH).
 */
export const INSTAGRAM_IDENTITY_JOURNEY_EXAMPLE: PlaybookJourney = {
  id: "journey-instagram-identity-reference",
  creatorId: "creator-demo",
  title: "Instagram Entry → Identity Resolution",
  description: "COMPOSE-3 reference: Instagram channel entry, provisional identity, identity resolution, downstream relationship context (resolved + unresolved paths).",
  status: "draft",
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  graph: {
    schemaVersion: 1,
    selectedNodeId: "node-identity-resolution",
    groups: [
      { id: "entry", label: "Channel entry", colorKey: "#38bdf8" },
      { id: "identity", label: "Identity", colorKey: "#a78bfa" },
      { id: "downstream", label: "Downstream", colorKey: "#e66a8d" }
    ],
    nodes: [
      {
        id: "node-instagram-entry",
        class: "channel",
        label: "Instagram Entry",
        position: { x: 60, y: 200 },
        group: "entry",
        // State B (capability_only): reusable channel capability, adapter-backed, no Node Flow.
        capabilityRef: { capabilityKey: "channel_source_entry", version: 1 },
        contract: {
          inputs: [],
          outputs: [{ key: "provisional_identity", label: "Provisional Instagram identity" }],
          destinations: [{ key: "inbound", label: "Inbound Instagram event" }]
        },
        config: { channel: "instagram", accountLabel: "Creator on Instagram", provisionalIdentityKey: "ig_provisional_identity" }
      },
      {
        id: "node-identity-resolution",
        class: "identity",
        label: "Identity Resolution",
        position: { x: 400, y: 200 },
        group: "identity",
        // State B (capability_only): capabilityRef WITHOUT a nodeFlowRef — an
        // Identity node need not have a concrete Node Flow to be represented.
        capabilityRef: { capabilityKey: "identity_resolution", version: 1 },
        contract: {
          inputs: [{ key: "provisional_identity", label: "Provisional Instagram identity", required: true }],
          outputs: [
            { key: "identity_context", label: "Canonical identity" },
            { key: "relationship_context", label: "Relationship context" }
          ],
          destinations: [
            { key: "resolved", label: "Resolved" },
            { key: "unresolved", label: "Unresolved" }
          ]
        },
        // Unresolved is a valid state; it must not hard-block, so resolution
        // routes rather than gating (blockUntilResolved false).
        config: { resolution: "match_or_create", blockUntilResolved: false }
      },
      {
        id: "node-new-subscriber-welcome",
        class: "conversation",
        label: "New Subscriber Welcome",
        position: { x: 760, y: 110 },
        group: "downstream",
        // State A (capability_and_flow): reusable capability WITH a concrete Node Flow.
        capabilityRef: { capabilityKey: "new_subscriber_welcome_discovery", version: 1 },
        nodeFlowRef: { kind: "script", scriptId: "demo-script-welcome", scriptVersion: 1 },
        contract: {
          inputs: [
            { key: "identity_context", label: "Canonical identity", required: true },
            { key: "relationship_context", label: "Relationship context" }
          ],
          outputs: [
            { key: "conversation_state", label: "Conversation state" },
            { key: "latest_interpretation", label: "Latest interpretation" }
          ],
          destinations: [{ key: "terminal", label: "Ended" }]
        },
        config: { minTurns: 3, maxTurns: 6, surface: ["source", "opening", "reply", "decision", "response", "exit"] }
      },
      {
        id: "node-identity-review",
        class: "human",
        label: "Identity Review",
        position: { x: 760, y: 320 },
        group: "downstream",
        // State B (capability_only): human-owned, no Node Flow.
        capabilityRef: { capabilityKey: "human_handoff", version: 1 },
        contract: {
          inputs: [{ key: "provisional_identity", label: "Provisional Instagram identity", required: true }],
          outputs: [{ key: "queue_item", label: "Queue item" }],
          destinations: [{ key: "queued", label: "Queued for operator" }]
        },
        config: { mode: "review", queueKey: "identity_review" }
      }
    ],
    connections: [
      { id: "edge-ig-identity", from: { nodeId: "node-instagram-entry", port: "inbound" }, to: { nodeId: "node-identity-resolution" }, label: "Provisional identity" },
      { id: "edge-identity-welcome", from: { nodeId: "node-identity-resolution", port: "resolved" }, to: { nodeId: "node-new-subscriber-welcome" }, label: "Resolved" },
      { id: "edge-identity-review", from: { nodeId: "node-identity-resolution", port: "unresolved" }, to: { nodeId: "node-identity-review" }, label: "Unresolved" }
    ],
    viewport: { x: 0, y: 0, zoom: 0.85 }
  }
};
