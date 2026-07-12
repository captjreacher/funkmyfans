export type CreatorStatus = "pending" | "connected" | "attention" | "paused" | "disconnected";
export type CreatorOnboardingStatus = "draft" | "pending" | "connected" | "syncing" | "ready" | "needs_attention";
/**
 * FMF creator RELATIONSHIP lifecycle (FYV -> FMF handoff). Deliberately distinct
 * from CreatorStatus (platform connection health) and CreatorOnboardingStatus
 * (setup/sync): this is the relationship arc a creator moves through with FMF.
 *   invited -> accepted -> active -> paused -> offboarded
 */
export type CreatorRelationshipState = "invited" | "accepted" | "active" | "paused" | "offboarded";
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
  /**
   * FMF creator RELATIONSHIP lifecycle (FYV handoff). Additive + nullable: legacy
   * creators have no lifecycle until one is set. Advanced by the FYV published
   * package event (invited -> accepted) and by explicit FMF operational decisions
   * (e.g. accepted -> active). See canTransitionCreatorRelationship.
   */
  relationship_state?: CreatorRelationshipState | null;
  relationship_state_changed_at?: string | null;
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

/* ==========================================================================
 * COMPOSE-4: Canonical Interpretation Signals → Capability Outcome → Opportunity
 * See docs/architecture/compose-4-interpretation-opportunity-boundary.md
 *
 * A small, dependency-free DETERMINISTIC boundary that proves:
 *
 *   conversation/event evidence
 *     → existing producer (inline regex / ConversationIntent)   [COMPOSE-2 tables]
 *     → canonical interpretation signal                         [CanonicalInterpretationSignal]
 *     → capability outcome                                      [CapabilityOutcome]
 *     → opportunity signal                                      [OpportunitySignal]
 *     → existing Opportunity boundary                           [ConversationOpportunity input adapter]
 *
 * Hard boundaries preserved:
 *   - A capability outcome is DERIVED deterministically; it is NOT executed by
 *     the Capability Registry and is NOT a Node Flow internal.
 *   - Interpretation signals are NOT opportunities; capability outcomes are NOT
 *     Queue items — this boundary NEVER creates a Queue item.
 *   - Opportunities preserve the evidence chain (producer raw signal + canonical
 *     signals flow through to the opportunity signal).
 *   - Unsupported / weak / unknown evidence degrades safely (no opportunity).
 *   - Unresolved identity must NOT fabricate an opportunity owner (COMPOSE-3
 *     link): owner-bearing categories require a resolved identity.
 *   - Everything here is pure and holds no runtime state.
 * ========================================================================== */

/** The bounded outcome a capability reached, independent of how a Node Flow executed it. */
export type CapabilityOutcomeType =
  | "relationship_continuation"
  | "offer_opportunity"
  | "content_preference"
  | "silence_follow_up"
  | "boundary_safety"
  | "human_handoff"
  | "no_action";

/** Evidence chain carried from producer → signal → outcome → opportunity signal. */
export interface CapabilityOutcomeEvidence {
  /** Which producer emitted the raw evidence (e.g. "inline_regex", "conversation_intelligence", "conversation_runtime.end_step"). */
  producer: string;
  /** The producer's raw output (response_class / ConversationIntent / end-step outcomeKey), where available. */
  rawSignal: string | null;
  /** Canonical interpretation signals mapped from the raw evidence. */
  canonicalSignals: CanonicalInterpretationSignal[];
  /** Source event reference, where available. */
  sourceEventId: string | null;
  /** Source conversation reference, where available. */
  sourceConversationId: string | null;
  /** Optional deterministic notes (never free-form AI text). */
  notes: string[];
}

/**
 * The minimum deterministic capability-outcome model. DERIVED (never executed):
 * source capability, source node (where available), source refs, canonical
 * signals consumed/produced, outcome type, evidence, confidence/readiness,
 * actionability and whether human review is required.
 */
export interface CapabilityOutcome {
  capabilityKey: string;
  nodeId: string | null;
  outcomeType: CapabilityOutcomeType;
  /** The runtime end-step outcome key, where available. */
  outcomeKey: string | null;
  /** completed / handoff, where available. */
  terminalType: string | null;
  canonicalSignals: CanonicalInterpretationSignal[];
  evidence: CapabilityOutcomeEvidence;
  /** Deterministic readiness/confidence in [0,1]. */
  confidence: number;
  /** Whether the outcome warrants an opportunity. */
  actionable: boolean;
  /** Whether a human necessarily owns the next step. */
  requiresHuman: boolean;
  /** COMPOSE-3 link: whether a canonical identity backs this outcome. */
  identityResolved: boolean;
}

/** Existing runtime opportunity categories (queueOpportunityCategory): reused, not re-minted. */
export type OpportunitySignalCategory = "revenue" | "operations" | "relationship";

/**
 * A deterministic opportunity SIGNAL, aligned field-for-field with the existing
 * ConversationOpportunity model so it can be adapted to the existing persistence
 * boundary. It is a signal only — producing it creates NO ConversationOpportunity
 * row and NO Queue item by itself.
 */
export interface OpportunitySignal {
  capabilityKey: string;
  outcomeType: CapabilityOutcomeType;
  /** Maps to ConversationOpportunity.route_key. */
  routeKey: string;
  /** Maps to ConversationOpportunity.opportunity_classification. */
  opportunityClassification: string;
  /** Maps to ConversationOpportunity.category (existing runtime vocabulary). */
  category: OpportunitySignalCategory;
  title: string;
  summary: string;
  priority: TaskPriority;
  /** Whether the EXISTING lifecycle would route this to a human. No Queue item is created here. */
  queueHandoff: boolean;
  recommendedNextObjective: string | null;
  canonicalSignals: CanonicalInterpretationSignal[];
  requiresHuman: boolean;
  identityResolved: boolean;
  sourceEventId: string | null;
  sourceConversationId: string | null;
  /** Preserved evidence chain. */
  evidence: CapabilityOutcomeEvidence;
}

/** Result of the deterministic outcome → opportunity-signal boundary. */
export type OutcomeToOpportunityResult =
  | { produced: true; signal: OpportunitySignal }
  | { produced: false; reason: string };

/** Below this deterministic confidence an outcome is treated as too weak to become an opportunity. */
export const OPPORTUNITY_MIN_CONFIDENCE = 0.5;

function composeToken(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Deterministically classify a capability outcome type from the runtime
 * end-step outcome key and/or handoff kind. Unknown inputs degrade to
 * "no_action".
 */
export function outcomeTypeFor(params: {
  outcomeKey?: string | null;
  handoffKind?: string | null;
  terminalType?: string | null;
}): CapabilityOutcomeType {
  const handoff = composeToken(params.handoffKind);
  const key = composeToken(params.outcomeKey);
  const probe = handoff || key;
  if (probe === "buying_signal" || key === "buying_signal") return "offer_opportunity";
  if (probe === "human_review" || probe === "exception" || probe === "human_handoff") return "human_handoff";
  if (probe === "relationship_continuation" || probe === "engaged") return "relationship_continuation";
  if (probe === "content_preference" || probe === "shares_preference" || probe === "content_interest") return "content_preference";
  if (probe === "boundary_safety" || probe === "boundary_testing" || probe === "unsupported_request") return "boundary_safety";
  if (probe === "no_response" || probe === "silence" || probe === "silent_no_reply") return "silence_follow_up";
  return "no_action";
}

/** Representative canonical signals an outcome type consumes/produces (typed, compile-time canonical). */
export function canonicalSignalsForOutcomeType(outcomeType: CapabilityOutcomeType): CanonicalInterpretationSignal[] {
  switch (outcomeType) {
    case "offer_opportunity":
      return ["purchase_intent", "ppv_interest"];
    case "relationship_continuation":
      return ["warm_enthusiastic"];
    case "content_preference":
      return ["content_interest", "shares_preference"];
    case "silence_follow_up":
      return ["silence"];
    case "boundary_safety":
      return ["boundary_testing", "unsupported_request"];
    case "human_handoff":
    case "no_action":
    default:
      return [];
  }
}

const OUTCOME_DEFAULT_CONFIDENCE: Record<CapabilityOutcomeType, number> = {
  offer_opportunity: 0.9,
  human_handoff: 0.9,
  boundary_safety: 0.85,
  content_preference: 0.75,
  relationship_continuation: 0.7,
  silence_follow_up: 0.4,
  no_action: 0.2
};

const OUTCOME_ACTIONABLE: Record<CapabilityOutcomeType, boolean> = {
  offer_opportunity: true,
  relationship_continuation: true,
  content_preference: true,
  human_handoff: true,
  boundary_safety: true,
  silence_follow_up: false,
  no_action: false
};

const OUTCOME_REQUIRES_HUMAN: Record<CapabilityOutcomeType, boolean> = {
  human_handoff: true,
  boundary_safety: true,
  offer_opportunity: false,
  relationship_continuation: false,
  content_preference: false,
  silence_follow_up: false,
  no_action: false
};

/**
 * Build a deterministic CapabilityOutcome from runtime evidence. Pure and total.
 * Canonical signals are taken from the producer evidence when supplied (preserving
 * the chain), else derived from the outcome type.
 */
export function buildCapabilityOutcome(params: {
  capabilityKey: string;
  nodeId?: string | null;
  outcomeKey?: string | null;
  handoffKind?: string | null;
  terminalType?: string | null;
  outcomeType?: CapabilityOutcomeType;
  producer?: string;
  rawSignal?: string | null;
  canonicalSignals?: CanonicalInterpretationSignal[];
  confidence?: number;
  sourceEventId?: string | null;
  sourceConversationId?: string | null;
  identityResolved?: boolean;
  notes?: string[];
}): CapabilityOutcome {
  const outcomeType = params.outcomeType ?? outcomeTypeFor(params);
  const canonicalSignals =
    params.canonicalSignals && params.canonicalSignals.length
      ? params.canonicalSignals.slice()
      : canonicalSignalsForOutcomeType(outcomeType);
  const confidence =
    typeof params.confidence === "number" && params.confidence >= 0 && params.confidence <= 1
      ? params.confidence
      : OUTCOME_DEFAULT_CONFIDENCE[outcomeType];

  return {
    capabilityKey: params.capabilityKey,
    nodeId: params.nodeId ?? null,
    outcomeType,
    outcomeKey: params.outcomeKey ?? null,
    terminalType: params.terminalType ?? null,
    canonicalSignals,
    evidence: {
      producer: params.producer ?? "unknown",
      rawSignal: params.rawSignal ?? params.outcomeKey ?? null,
      canonicalSignals: canonicalSignals.slice(),
      sourceEventId: params.sourceEventId ?? null,
      sourceConversationId: params.sourceConversationId ?? null,
      notes: params.notes ? params.notes.slice() : []
    },
    confidence,
    actionable: OUTCOME_ACTIONABLE[outcomeType],
    requiresHuman: OUTCOME_REQUIRES_HUMAN[outcomeType],
    identityResolved: Boolean(params.identityResolved)
  };
}

interface OpportunityMappingDef {
  category: OpportunitySignalCategory;
  classification: string;
  priority: TaskPriority;
  queueHandoff: boolean;
  /** Owner-bearing opportunities (a subscriber to act on) require a resolved identity. */
  requiresOwner: boolean;
  title: string;
  summary: string;
  objective: string;
}

// Only these outcome types map to an opportunity signal. Others degrade safely.
const OPPORTUNITY_MAPPING: Partial<Record<CapabilityOutcomeType, OpportunityMappingDef>> = {
  offer_opportunity: {
    category: "revenue",
    classification: "buying_signal",
    priority: "high",
    queueHandoff: true,
    requiresOwner: true,
    title: "Buying signal opportunity",
    summary: "The subscriber is signalling purchase intent and should be routed for a revenue follow-up.",
    objective: "Review the buying signal and send the next sales follow-up."
  },
  relationship_continuation: {
    category: "relationship",
    classification: "relationship_continuation",
    priority: "medium",
    queueHandoff: true,
    requiresOwner: true,
    title: "Relationship continuation",
    summary: "The subscriber is engaged; continue the relationship and keep them warm.",
    objective: "Continue the relationship naturally and keep the subscriber warm."
  },
  content_preference: {
    category: "relationship",
    classification: "content_preference",
    priority: "medium",
    queueHandoff: false,
    requiresOwner: true,
    title: "Content preference discovered",
    summary: "The subscriber shared a content preference that should tailor future content.",
    objective: "Use the discovered preference to tailor the next content offer."
  },
  human_handoff: {
    category: "operations",
    classification: "human_review",
    priority: "high",
    queueHandoff: true,
    requiresOwner: false,
    title: "Human review",
    summary: "The conversation requires human review before it continues.",
    objective: "Review the conversation and decide the safe next step."
  },
  boundary_safety: {
    category: "operations",
    classification: "safety_review",
    priority: "high",
    queueHandoff: true,
    requiresOwner: false,
    title: "Safety review",
    summary: "A boundary/safety condition needs human review.",
    objective: "Review the safety condition and respond within policy."
  }
};

/**
 * Deterministically map a capability outcome to an opportunity signal. Maps ONLY
 * explicitly supported outcomes; refuses weak/unknown evidence; and refuses to
 * fabricate an owner when identity is unresolved for owner-bearing categories.
 * Creates NO ConversationOpportunity row and NO Queue item.
 */
export function mapOutcomeToOpportunitySignal(outcome: CapabilityOutcome): OutcomeToOpportunityResult {
  const def = OPPORTUNITY_MAPPING[outcome.outcomeType];
  if (!def) {
    return { produced: false, reason: `outcome type "${outcome.outcomeType}" is not a supported opportunity` };
  }
  if (!outcome.actionable) {
    return { produced: false, reason: "capability outcome is not actionable" };
  }
  if (outcome.confidence < OPPORTUNITY_MIN_CONFIDENCE) {
    return { produced: false, reason: `evidence too weak (confidence ${outcome.confidence} < ${OPPORTUNITY_MIN_CONFIDENCE})` };
  }
  if (def.requiresOwner && !outcome.identityResolved) {
    return { produced: false, reason: "unresolved identity; refusing to fabricate an opportunity owner" };
  }

  const signal: OpportunitySignal = {
    capabilityKey: outcome.capabilityKey,
    outcomeType: outcome.outcomeType,
    routeKey: outcome.outcomeKey ?? outcome.outcomeType,
    opportunityClassification: def.classification,
    category: def.category,
    title: def.title,
    summary: def.summary,
    priority: def.priority,
    queueHandoff: def.queueHandoff,
    recommendedNextObjective: def.objective,
    canonicalSignals: outcome.canonicalSignals.slice(),
    requiresHuman: outcome.requiresHuman,
    identityResolved: outcome.identityResolved,
    sourceEventId: outcome.evidence.sourceEventId,
    sourceConversationId: outcome.evidence.sourceConversationId,
    evidence: {
      ...outcome.evidence,
      canonicalSignals: outcome.evidence.canonicalSignals.slice(),
      notes: outcome.evidence.notes.slice()
    }
  };
  return { produced: true, signal };
}

/**
 * Pure adapter: shape an OpportunitySignal into the EXISTING
 * of_conversation_opportunities insert payload (status "detected", NO queue
 * linkage). It does NOT persist and creates NO Queue item — it documents the
 * persistence seam so the runtime can upsert through the existing
 * ensureConversationOpportunity path (onConflict conversation_instance_id,route_key)
 * without this boundary owning persistence or the Queue.
 */
export function opportunitySignalToConversationOpportunityInput(
  signal: OpportunitySignal,
  refs: { creatorId: string; conversationInstanceId: string | null; sourceStepId?: string | null }
): Record<string, unknown> {
  return {
    creator_id: refs.creatorId,
    conversation_instance_id: refs.conversationInstanceId,
    queue_id: null,
    queue_item_id: null,
    source_event_id: signal.sourceEventId,
    source_step_id: refs.sourceStepId ?? null,
    route_key: signal.routeKey,
    opportunity_classification: signal.opportunityClassification,
    category: signal.category,
    title: signal.title,
    summary: signal.summary,
    status: "detected",
    priority: signal.priority,
    queue_handoff: signal.queueHandoff,
    recommended_next_objective: signal.recommendedNextObjective,
    resolved_at: null,
    metadata: {
      source: "compose4_outcome_boundary",
      capability_key: signal.capabilityKey,
      outcome_type: signal.outcomeType,
      canonical_signals: signal.canonicalSignals,
      requires_human: signal.requiresHuman,
      identity_resolved: signal.identityResolved,
      evidence: signal.evidence
    }
  };
}

/* ==========================================================================
 * COMPOSE-5: Standalone Opportunity Persistence Boundary
 * See docs/architecture/compose-5-standalone-opportunity-persistence-boundary.md
 *
 * COMPOSE-4 proved the derivation
 *   canonical interpretation signal → capability outcome → opportunity signal
 * and shaped an OpportunitySignal into the existing of_conversation_opportunities
 * payload (opportunitySignalToConversationOpportunityInput), but deliberately did
 * NOT persist it — the only existing write path (worker ensureConversationOpportunity)
 * is coupled to Queue creation (ensureConversationHandoffQueueItem).
 *
 * COMPOSE-5 adds the smallest deterministic seam that PERSISTS a produced
 * opportunity signal into the existing Opportunity boundary WITHOUT creating a
 * Queue item — additively, alongside (never modifying) the coupled path:
 *
 *   opportunity signal
 *     → standalone persistence decision   [resolveStandaloneOpportunityPersistence]
 *     → idempotent write plan              [planStandaloneOpportunityWrite]
 *     → persisted opportunity (status "detected", queue links null)
 *     → Queue UNTOUCHED
 *
 * Architectural invariants preserved:
 *   - Interpretation signals / capability outcomes / opportunity signals are NOT
 *     Queue items; this seam creates NO Queue item and touches NO Queue table —
 *     the injected StandaloneOpportunityStore port exposes ONLY the opportunity
 *     store, so the pure orchestrator is STRUCTURALLY incapable of queue writes.
 *   - A persisted opportunity NEVER auto-creates a Queue item: queue_id and
 *     queue_item_id stay null and status is "detected" (never "queued").
 *   - Evidence lineage (producer raw signal + canonical signals + COMPOSE-4
 *     evidence chain) survives into the persisted metadata.
 *   - Idempotency: a deterministic dedupe key prevents duplicate opportunities.
 *   - Unsupported / weak / unresolved-owner signals do NOT persist (the COMPOSE-4
 *     mapping guards flow through as non-persist reasons; owner-fabrication is
 *     independently re-asserted here).
 *   - Everything here is pure and holds no runtime state; the ONLY IO is the
 *     injected store port (implemented over Supabase in the worker).
 * ========================================================================== */

/** Canonical persisted status for a standalone (non-queued) detected opportunity. */
export const STANDALONE_OPPORTUNITY_STATUS: ConversationOpportunityStatus = "detected";

/** Marker written into metadata so a standalone-persisted row is unambiguous + queryable for dedupe. */
export const STANDALONE_OPPORTUNITY_METADATA_KEY = "compose5";

function c5IsRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function c5Token(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Owner-bearing categories require a resolved identity before an opportunity may
 * be persisted (COMPOSE-3 link). Derived from the COMPOSE-4 OPPORTUNITY_MAPPING
 * requiresOwner rule: revenue + relationship are owner-bearing; operations
 * (human_review / safety_review) is not.
 */
export function standaloneOpportunityRequiresOwner(category: OpportunitySignalCategory): boolean {
  return category === "revenue" || category === "relationship";
}

/** References needed to persist an opportunity signal into of_conversation_opportunities. */
export interface StandaloneOpportunityRefs {
  creatorId: string;
  /** of_conversation_opportunities.conversation_instance_id is NOT NULL — required to persist. */
  conversationInstanceId: string | null;
  /** Existing runtime step id, where available (maps to source_step_id). */
  sourceStepId?: string | null;
  /** Capability-graph node id, where available (preserved in metadata.compose5.source_node_id). */
  sourceNodeId?: string | null;
}

/**
 * The smallest deterministic contract carrying a COMPOSE-4 opportunity signal
 * into the existing persistence payload. Every field below is preserved by
 * resolveStandaloneOpportunityPersistence.
 */
export interface StandaloneOpportunityPersistenceContract {
  category: OpportunitySignalCategory;
  opportunityClassification: string;
  routeKey: string;
  capabilityKey: string;
  outcomeType: CapabilityOutcomeType;
  sourceNodeId: string | null;
  sourceEventId: string | null;
  conversationInstanceId: string;
  sourceStepId: string | null;
  canonicalSignals: CanonicalInterpretationSignal[];
  evidence: CapabilityOutcomeEvidence;
  identityResolved: boolean;
  dedupeKey: string;
  status: ConversationOpportunityStatus;
}

/**
 * Deterministic idempotency key for a standalone opportunity. Stable across
 * replays of the SAME opportunity signal for the SAME conversation and distinct
 * across capability / outcome / category / route. Pure string composition — no
 * hashing, no randomness, no clock.
 */
export function buildStandaloneOpportunityDedupeKey(
  signal: OpportunitySignal,
  refs: Pick<StandaloneOpportunityRefs, "conversationInstanceId">
): string {
  return [
    "compose5",
    c5Token(refs.conversationInstanceId) || "no-conversation",
    c5Token(signal.capabilityKey),
    c5Token(signal.outcomeType),
    c5Token(signal.category),
    c5Token(signal.routeKey)
  ].join(":");
}

/**
 * Pure adapter: shape an OpportunitySignal into the standalone
 * of_conversation_opportunities insert payload. Builds on the COMPOSE-4 pure
 * adapter (opportunitySignalToConversationOpportunityInput) and overlays the
 * standalone guarantees (status "detected", queue links null) + an additive
 * metadata.compose5 lineage block carrying the deterministic dedupe key. Does
 * NOT persist and creates NO Queue item.
 */
export function buildStandaloneOpportunityPayload(
  signal: OpportunitySignal,
  refs: StandaloneOpportunityRefs & { conversationInstanceId: string }
): { payload: Record<string, unknown>; dedupeKey: string } {
  const dedupeKey = buildStandaloneOpportunityDedupeKey(signal, refs);
  const base = opportunitySignalToConversationOpportunityInput(signal, {
    creatorId: refs.creatorId,
    conversationInstanceId: refs.conversationInstanceId,
    sourceStepId: refs.sourceStepId ?? null
  });
  const baseMetadata = c5IsRecord(base.metadata) ? base.metadata : {};
  const payload: Record<string, unknown> = {
    ...base,
    // Defensive re-assertion: a standalone row can NEVER look queued.
    status: STANDALONE_OPPORTUNITY_STATUS,
    queue_id: null,
    queue_item_id: null,
    // COMPOSE-7: first-class deterministic dedupe column. A unique index over this
    // column gives the DATABASE authority over duplicate prevention (NULLs remain
    // distinct, so legacy queue-coupled rows with a null dedupe_key are unconstrained).
    dedupe_key: dedupeKey,
    metadata: {
      ...baseMetadata,
      [STANDALONE_OPPORTUNITY_METADATA_KEY]: {
        persistence_boundary: "standalone",
        persisted_without_queue: true,
        dedupe_key: dedupeKey,
        source_node_id: refs.sourceNodeId ?? null,
        status: STANDALONE_OPPORTUNITY_STATUS
      }
    }
  };
  return { payload, dedupeKey };
}

/** Decision produced by the pure resolver: persist (with payload) or explicitly not. */
export type StandaloneOpportunityPersistenceDecision =
  | { persist: false; reason: string }
  | {
      persist: true;
      /** of_conversation_opportunities insert payload (no id / no timestamps). */
      payload: Record<string, unknown>;
      dedupeKey: string;
      routeKey: string;
      conversationInstanceId: string;
      contract: StandaloneOpportunityPersistenceContract;
    };

/**
 * Pure resolver: turn the RESULT of mapOutcomeToOpportunitySignal into a
 * standalone persistence decision. Non-persist reasons (unsupported / weak /
 * unresolved-owner) flow straight through from the COMPOSE-4 mapping — this
 * boundary re-applies, never weakens, those guards. It additionally refuses to
 * persist without a conversation reference and independently re-asserts the
 * owner-fabrication guard for owner-bearing categories.
 */
export function resolveStandaloneOpportunityPersistence(
  result: OutcomeToOpportunityResult,
  refs: StandaloneOpportunityRefs
): StandaloneOpportunityPersistenceDecision {
  if (!result.produced) {
    return { persist: false, reason: result.reason };
  }
  const signal = result.signal;
  if (!refs.conversationInstanceId) {
    return { persist: false, reason: "no conversation reference; refusing to persist a detached opportunity" };
  }
  // Independent re-assertion of the COMPOSE-3/4 owner guard: never fabricate an
  // owner for an owner-bearing opportunity when identity is unresolved, even if a
  // caller hand-built a produced signal that bypassed mapOutcomeToOpportunitySignal.
  if (standaloneOpportunityRequiresOwner(signal.category) && !signal.identityResolved) {
    return { persist: false, reason: "unresolved identity for an owner-bearing opportunity; refusing to fabricate an owner" };
  }

  const { payload, dedupeKey } = buildStandaloneOpportunityPayload(signal, {
    ...refs,
    conversationInstanceId: refs.conversationInstanceId
  });

  const contract: StandaloneOpportunityPersistenceContract = {
    category: signal.category,
    opportunityClassification: signal.opportunityClassification,
    routeKey: signal.routeKey,
    capabilityKey: signal.capabilityKey,
    outcomeType: signal.outcomeType,
    sourceNodeId: refs.sourceNodeId ?? null,
    sourceEventId: signal.sourceEventId,
    conversationInstanceId: refs.conversationInstanceId,
    sourceStepId: refs.sourceStepId ?? null,
    canonicalSignals: signal.canonicalSignals.slice(),
    evidence: {
      ...signal.evidence,
      canonicalSignals: signal.evidence.canonicalSignals.slice(),
      notes: signal.evidence.notes.slice()
    },
    identityResolved: signal.identityResolved,
    dedupeKey,
    status: STANDALONE_OPPORTUNITY_STATUS
  };

  return {
    persist: true,
    payload,
    dedupeKey,
    routeKey: signal.routeKey,
    conversationInstanceId: refs.conversationInstanceId,
    contract
  };
}

/** A minimal already-persisted opportunity row reference the store returns for dedupe. */
export interface StoredOpportunityRef {
  id: string;
  status?: string | null;
  route_key?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** COMPOSE-7: result of a concurrency-safe upsert keyed on the dedupe_key column. */
export interface StandaloneOpportunityUpsertResult {
  opportunity: ConversationOpportunitySummary;
  /** true when an existing row was updated on conflict (deduplicated); false on fresh insert. */
  deduped: boolean;
}

/**
 * IO port for standalone opportunity persistence. Deliberately exposes ONLY the
 * opportunity store — it has NO Queue methods, so the pure orchestrator below is
 * structurally incapable of creating a Queue item. The worker implements this
 * over Supabase; the deterministic checks implement it in-memory.
 *
 * COMPOSE-7: `upsertByDedupeKey` is the AUTHORITATIVE, concurrency-safe write path
 * (backed by the unique index on `dedupe_key`). When a store provides it, the
 * orchestrator uses it in preference to the legacy select-then-write methods,
 * which remain only for non-DB (in-memory) stores where there is no concurrency.
 */
export interface StandaloneOpportunityStore {
  /** Detected (non-queued) opportunities for this conversation + route_key. */
  findDetected(conversationInstanceId: string, routeKey: string): Promise<StoredOpportunityRef[]>;
  insert(payload: Record<string, unknown>): Promise<ConversationOpportunitySummary>;
  update(id: string, patch: Record<string, unknown>): Promise<ConversationOpportunitySummary>;
  /** COMPOSE-7: concurrency-safe conflict-aware write keyed on dedupe_key (DB-authoritative). */
  upsertByDedupeKey?(dedupeKey: string, payload: Record<string, unknown>): Promise<StandaloneOpportunityUpsertResult>;
}

/**
 * Pure idempotency planner: given the detected rows already present for this
 * (conversation, route_key), decide whether to insert a fresh row or update the
 * existing one whose metadata.compose5.dedupe_key matches. Deterministic.
 */
export function planStandaloneOpportunityWrite(
  existing: StoredOpportunityRef[],
  dedupeKey: string
): { op: "insert" } | { op: "update"; id: string } {
  const match = existing.find((row) => {
    const md = row.metadata;
    const c5 = c5IsRecord(md) ? md[STANDALONE_OPPORTUNITY_METADATA_KEY] : null;
    const key = c5IsRecord(c5) ? c5.dedupe_key : null;
    return typeof key === "string" && key === dedupeKey;
  });
  return match ? { op: "update", id: match.id } : { op: "insert" };
}

/** Result of a standalone persistence attempt. */
export type StandaloneOpportunityPersistResult =
  | { persisted: false; reason: string }
  | {
      persisted: true;
      deduped: boolean;
      opportunityId: string;
      opportunity: ConversationOpportunitySummary;
      dedupeKey: string;
    };

/**
 * Pure orchestrator: resolve the decision, then — only when persisting — plan an
 * idempotent write through the injected store. Creates NO Queue item (the port
 * has none). Deterministic given a deterministic store. Weak / unsupported /
 * unresolved-owner / conversation-less inputs short-circuit with no store call.
 */
export async function persistStandaloneOpportunity(
  store: StandaloneOpportunityStore,
  result: OutcomeToOpportunityResult,
  refs: StandaloneOpportunityRefs
): Promise<StandaloneOpportunityPersistResult> {
  const decision = resolveStandaloneOpportunityPersistence(result, refs);
  if (!decision.persist) {
    return { persisted: false, reason: decision.reason };
  }
  // COMPOSE-7: prefer the DB-authoritative, concurrency-safe upsert when the store
  // provides it (the Supabase store does). The unique index on dedupe_key — not this
  // application code — owns duplicate prevention, so concurrent identical writes
  // converge to a single row and a deduped result rather than an error.
  if (store.upsertByDedupeKey) {
    const { opportunity, deduped } = await store.upsertByDedupeKey(decision.dedupeKey, decision.payload);
    return { persisted: true, deduped, opportunityId: opportunity.id, opportunity, dedupeKey: decision.dedupeKey };
  }
  // Fallback for stores without DB-backed upsert (in-memory / tests only, where there
  // is no concurrency). NOT the authoritative production mechanism.
  const existing = await store.findDetected(decision.conversationInstanceId, decision.routeKey);
  const plan = planStandaloneOpportunityWrite(existing, decision.dedupeKey);
  const opportunity =
    plan.op === "update" ? await store.update(plan.id, decision.payload) : await store.insert(decision.payload);
  return {
    persisted: true,
    deduped: plan.op === "update",
    opportunityId: opportunity.id,
    opportunity,
    dedupeKey: decision.dedupeKey
  };
}

/* ==========================================================================
 * COMPOSE-6: Live Opportunity Persistence Wiring
 * See docs/architecture/compose-6-live-opportunity-persistence-wiring.md
 *
 * A single pure orchestrator that COMPOSES the already-proven boundaries so the
 * LIVE conversation interpretation runtime can persist opportunities without
 * duplicating any mapping or persistence logic:
 *
 *   runtime evidence (producer class + canonical signal + terminal outcome)
 *     → buildCapabilityOutcome        (COMPOSE-4)
 *     → mapOutcomeToOpportunitySignal (COMPOSE-4)
 *     → persistStandaloneOpportunity  (COMPOSE-5, via the injected store port)
 *
 * It creates NO Queue item (the COMPOSE-5 store port has no queue method),
 * preserves every COMPOSE-4 guard + the evidence lineage, and is deterministic
 * given a deterministic store. The worker calls it with the Supabase standalone
 * store; the deterministic check calls it with an in-memory store.
 * ========================================================================== */

/** Runtime evidence gathered at the live terminal seam (never fabricated). */
export interface LiveOpportunityEvidence {
  creatorId: string;
  conversationInstanceId: string | null;
  /** Capability the conversation node represents (WHAT), not the Node Flow (WHICH). */
  capabilityKey: string;
  /** Journey node id where genuinely available; null when the runtime cannot identify it. */
  nodeId: string | null;
  outcomeKey: string | null;
  handoffKind: string | null;
  terminalType: string | null;
  /** Which live producer emitted the raw evidence. */
  producer: string;
  /** The producer's raw output (e.g. response_class), where available. */
  rawSignal: string | null;
  /** Canonical signals derived from the producer output (COMPOSE-2 tables); optional. */
  canonicalSignals?: CanonicalInterpretationSignal[];
  /** Deterministic confidence override, where the runtime has one. */
  confidence?: number;
  sourceEventId: string | null;
  sourceStepId: string | null;
  /** COMPOSE-3 link: whether a canonical identity backs this conversation. */
  identityResolved: boolean;
}

/** Full result of a live persistence attempt (for observability + tests). */
export interface LiveOpportunityPersistenceOutcome {
  outcome: CapabilityOutcome;
  mapping: OutcomeToOpportunityResult;
  persist: StandaloneOpportunityPersistResult;
}

/**
 * COMPOSE-6 pure orchestrator. Deterministically derives the capability outcome,
 * maps it to an opportunity signal, and persists a produced signal through the
 * COMPOSE-5 standalone boundary. Reuses the COMPOSE-4/5 pure functions verbatim —
 * NO duplicated mapping or persistence logic. Creates NO Queue item. Unsupported /
 * weak / unresolved-owner / conversation-less evidence yields a non-persist result
 * (the guards live in mapOutcomeToOpportunitySignal + resolveStandaloneOpportunityPersistence).
 */
/**
 * COMPOSE-6/7 pure derivation (NO persistence). Builds the capability outcome and
 * maps it to an opportunity signal from runtime evidence. Used directly by SHADOW
 * mode (derive + observe, never write) and internally by runLiveOpportunityPersistence.
 */
export function deriveLiveOpportunity(evidence: LiveOpportunityEvidence): {
  outcome: CapabilityOutcome;
  mapping: OutcomeToOpportunityResult;
} {
  const outcome = buildCapabilityOutcome({
    capabilityKey: evidence.capabilityKey,
    nodeId: evidence.nodeId,
    outcomeKey: evidence.outcomeKey,
    handoffKind: evidence.handoffKind,
    terminalType: evidence.terminalType,
    producer: evidence.producer,
    rawSignal: evidence.rawSignal,
    canonicalSignals: evidence.canonicalSignals,
    confidence: evidence.confidence,
    sourceEventId: evidence.sourceEventId,
    sourceConversationId: evidence.conversationInstanceId,
    identityResolved: evidence.identityResolved
  });
  const mapping = mapOutcomeToOpportunitySignal(outcome);
  return { outcome, mapping };
}

export async function runLiveOpportunityPersistence(
  store: StandaloneOpportunityStore,
  evidence: LiveOpportunityEvidence
): Promise<LiveOpportunityPersistenceOutcome> {
  const { outcome, mapping } = deriveLiveOpportunity(evidence);
  const persist = await persistStandaloneOpportunity(store, mapping, {
    creatorId: evidence.creatorId,
    conversationInstanceId: evidence.conversationInstanceId,
    sourceStepId: evidence.sourceStepId,
    sourceNodeId: evidence.nodeId
  });
  return { outcome, mapping, persist };
}

/* ==========================================================================
 * COMPOSE-7: Production Activation Hardening — pure activation controls
 * See docs/architecture/compose-7-production-activation-hardening.md
 *
 * Fail-closed, deterministic parsing of the activation mode + creator allowlist.
 * These are pure so the worker reads env and delegates, and the deterministic
 * check proves the fail-closed semantics without a runtime.
 * ========================================================================== */

/** Activation mode for the live opportunity persistence path. Conservative default: "off". */
export type LiveOpportunityMode = "off" | "shadow" | "enabled";

/**
 * Resolve the activation mode. Precedence:
 *   1. COMPOSE6_LIVE_OPPORTUNITY_PERSISTENCE_MODE, when it is exactly off|shadow|enabled.
 *   2. If MODE is unset/empty → backward-compat with the legacy boolean flag
 *      (COMPOSE6_LIVE_OPPORTUNITY_PERSISTENCE_ENABLED): "true"/"1" → "enabled", else "off".
 *   3. Any other (unknown/malformed) MODE value → "off" (fail closed).
 */
export function resolveLiveOpportunityMode(
  modeRaw: string | null | undefined,
  legacyEnabledRaw?: string | null
): LiveOpportunityMode {
  const mode = (modeRaw ?? "").trim().toLowerCase();
  if (mode === "off" || mode === "shadow" || mode === "enabled") return mode;
  if (mode === "") {
    const legacy = (legacyEnabledRaw ?? "").trim().toLowerCase();
    return legacy === "true" || legacy === "1" ? "enabled" : "off";
  }
  return "off";
}

/** Deterministic decision from the creator allowlist (fail-closed). */
export interface CreatorAllowlistDecision {
  /** Whether an allowlist env value was provided at all. */
  configured: boolean;
  /** Present but yielded no usable tokens (e.g. only separators) → fail closed. */
  malformed: boolean;
  /** Whether this creator may run the live path. */
  allowed: boolean;
  /** Deterministic reason code for observability. */
  reason: "no_allowlist" | "allowlisted" | "not_allowlisted" | "malformed_allowlist";
}

/**
 * Evaluate whether a creator is allowed. An unset/empty allowlist means "not
 * configured" → all creators allowed (the MODE still gates). A present-but-empty
 * allowlist (only separators) is malformed → fail closed (nobody allowed). Tokens
 * are split on whitespace/commas; matching is exact against a stable creator id.
 */
export function evaluateCreatorAllowlist(
  rawAllowlist: string | null | undefined,
  creatorId: string
): CreatorAllowlistDecision {
  const raw = (rawAllowlist ?? "").trim();
  if (raw === "") return { configured: false, malformed: false, allowed: true, reason: "no_allowlist" };
  const tokens = raw.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return { configured: true, malformed: true, allowed: false, reason: "malformed_allowlist" };
  const allowed = tokens.includes(creatorId);
  return { configured: true, malformed: false, allowed, reason: allowed ? "allowlisted" : "not_allowlisted" };
}

/** What the live seam should do for a given mode + allowlist decision. */
export type LiveOpportunityAction = "skip_off" | "skip_not_allowed" | "shadow" | "persist";

/**
 * Single source of truth for the live seam's gating decision (used by the worker
 * and proven by the deterministic check). Deterministic + fail-closed: "off" (and,
 * via resolveLiveOpportunityMode, any unknown mode) skips with no side effect; a
 * disallowed/malformed allowlist skips; "shadow" derives-only; "enabled" persists.
 */
export function decideLiveOpportunityAction(
  mode: LiveOpportunityMode,
  allowlist: CreatorAllowlistDecision
): LiveOpportunityAction {
  if (mode === "off") return "skip_off";
  if (!allowlist.allowed) return "skip_not_allowed";
  return mode === "shadow" ? "shadow" : "persist";
}

/* ==========================================================================
 * FYV -> FMF Creator Intelligence Package handoff
 *
 * FMF consumes a PUBLISHED FYV "creator.intelligence_package.published" event as
 * an external source artifact and uses it to advance the creator RELATIONSHIP
 * lifecycle. FYV owns assessment/interpretation/package generation; FMF owns the
 * creator relationship. This is the pure, deterministic, dependency-free core
 * (no I/O): lifecycle transitions + capabilities, event validation, the
 * operational package pointer, and a store-port orchestrator.
 *
 * Invariants enforced here:
 *  - Only a PUBLISHED package is accepted on this path (identified/draft/
 *    superseded are rejected).
 *  - A creator is NEVER created from an event (resolve-first; the route rejects
 *    an unknown creator). No identity is fabricated.
 *  - The event may only advance invited -> accepted. Activation
 *    (accepted -> active) is an explicit FMF operational decision and is NEVER
 *    performed by the event path.
 *  - FMF stores a REFERENCE (of_creators.metadata.fyv_package), never a copy of
 *    FYV intelligence content. Full received-package provenance stays in
 *    creator_intelligence_snapshots.
 * ========================================================================== */

export const CREATOR_RELATIONSHIP_STATES = [
  "invited",
  "accepted",
  "active",
  "paused",
  "offboarded"
] as const;

export function isCreatorRelationshipState(value: unknown): value is CreatorRelationshipState {
  return typeof value === "string" && (CREATOR_RELATIONSHIP_STATES as readonly string[]).includes(value);
}

/**
 * Legal creator relationship transitions. Activation (accepted -> active) is
 * legal here (an explicit FMF operational decision) but is NEVER performed by the
 * FYV event path — see nextRelationshipStateForPublishedPackage. offboarded is
 * terminal. Same-state "transitions" are not transitions (return false).
 */
const CREATOR_RELATIONSHIP_TRANSITIONS: Record<CreatorRelationshipState, readonly CreatorRelationshipState[]> = {
  invited: ["accepted", "offboarded"],
  accepted: ["active", "offboarded"],
  active: ["paused", "offboarded"],
  paused: ["active", "offboarded"],
  offboarded: []
};

export function canTransitionCreatorRelationship(
  from: CreatorRelationshipState,
  to: CreatorRelationshipState
): boolean {
  if (from === to) return false;
  return CREATOR_RELATIONSHIP_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Operational capabilities gated by the creator relationship state. */
export interface CreatorRelationshipCapabilities {
  /** Workspace / onboarding may begin. */
  onboardingAllowed: boolean;
  /** Automations + monetisation workflows may run. */
  automationExecutionEnabled: boolean;
  /** Execution is temporarily suspended (paused); history/relationship preserved. */
  executionSuspended: boolean;
  /** Execution is blocked (offboarded); relationship archived, records preserved. */
  executionBlocked: boolean;
}

/**
 * Deterministic capability gate. Enforces:
 *   invited    -> no operational workflows
 *   accepted   -> onboarding allowed
 *   active     -> workflows enabled
 *   paused     -> suspend execution
 *   offboarded -> block execution
 */
export function relationshipCapabilities(state: CreatorRelationshipState): CreatorRelationshipCapabilities {
  switch (state) {
    case "invited":
      return { onboardingAllowed: false, automationExecutionEnabled: false, executionSuspended: false, executionBlocked: false };
    case "accepted":
      return { onboardingAllowed: true, automationExecutionEnabled: false, executionSuspended: false, executionBlocked: false };
    case "active":
      return { onboardingAllowed: true, automationExecutionEnabled: true, executionSuspended: false, executionBlocked: false };
    case "paused":
      return { onboardingAllowed: true, automationExecutionEnabled: false, executionSuspended: true, executionBlocked: false };
    case "offboarded":
      return { onboardingAllowed: false, automationExecutionEnabled: false, executionSuspended: false, executionBlocked: true };
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

/**
 * The ONLY relationship advance the FYV published event may perform. It moves a
 * creator with no lifecycle yet (null) or an `invited` creator to `accepted`
 * (relationship accepted -> onboarding may begin). It NEVER performs
 * accepted -> active (activation is an explicit FMF decision) and never regresses
 * an already-advanced state. Idempotent: repeated published events keep the
 * creator at its current (>= accepted) state.
 */
export function nextRelationshipStateForPublishedPackage(
  current: CreatorRelationshipState | null | undefined
): CreatorRelationshipState {
  if (current == null || current === "invited") return "accepted";
  return current;
}

export const CREATOR_INTELLIGENCE_PACKAGE_PUBLISHED_EVENT_TYPE = "creator.intelligence_package.published";
export const FYV_SOURCE_PRODUCT = "FYV";
/** of_events.provider value for FYV-originated events (dedupe scope). */
export const FYV_EVENT_PROVIDER = "fyv";

/** The raw FYV published-package event contract, as received on the boundary. */
export interface CreatorIntelligencePackagePublishedEvent {
  event_type: typeof CREATOR_INTELLIGENCE_PACKAGE_PUBLISHED_EVENT_TYPE;
  source_product: string;
  creator_reference: string;
  package_reference: string;
  source_assessment_reference?: string | null;
  package_state: string;
  /** Optional producer-supplied event id; defaults to package_reference for dedupe. */
  event_id?: string | null;
}

/** A validated + normalized FYV published-package event, ready to persist. */
export interface NormalizedCreatorIntelligencePackagePublishedEvent {
  provider: typeof FYV_EVENT_PROVIDER;
  eventType: typeof CREATOR_INTELLIGENCE_PACKAGE_PUBLISHED_EVENT_TYPE;
  sourceProduct: string;
  creatorReference: string;
  packageReference: string;
  assessmentReference: string | null;
  packageState: "published";
  /** Dedupe key for of_events (provider, provider_event_id). */
  providerEventId: string;
  receivedAt: string;
  /** Raw source payload preserved verbatim for audit. */
  raw: Record<string, unknown>;
}

export type CreatorIntelligenceEventOutcome =
  | { ok: true; event: NormalizedCreatorIntelligencePackagePublishedEvent }
  | { ok: false; statusCode: number; error: string; field?: string };

/**
 * Deterministically validate + normalize a FYV published-package event. Pure:
 * SHAPE + BOUNDARY-STATE validation only. Creator EXISTENCE is a data-layer
 * concern (the route resolves + rejects). Required guards:
 *  - event_type == creator.intelligence_package.published
 *  - source_product == FYV
 *  - creator_reference present
 *  - package_reference present
 *  - package_state == "published" (identified/draft/superseded rejected -> 422)
 */
export function normalizeCreatorIntelligencePackagePublishedEvent(
  raw: unknown,
  options: { receivedAt?: string } = {}
): CreatorIntelligenceEventOutcome {
  if (!isComposeRecord(raw)) {
    return { ok: false, statusCode: 400, error: "FYV event payload must be a JSON object" };
  }
  const receivedAt = composeString(options.receivedAt) ?? new Date().toISOString();

  const eventType = pickString(raw, ["event_type", "eventType", "type"]);
  if (eventType !== CREATOR_INTELLIGENCE_PACKAGE_PUBLISHED_EVENT_TYPE) {
    return {
      ok: false,
      statusCode: 400,
      error: `Unsupported event_type; expected ${CREATOR_INTELLIGENCE_PACKAGE_PUBLISHED_EVENT_TYPE}`,
      field: "event_type"
    };
  }

  const sourceProduct = pickString(raw, ["source_product", "sourceProduct"]);
  if (!sourceProduct || sourceProduct.toUpperCase() !== FYV_SOURCE_PRODUCT) {
    return { ok: false, statusCode: 400, error: "source_product must be FYV", field: "source_product" };
  }

  const creatorReference = pickString(raw, ["creator_reference", "creatorReference", "creator_id", "creatorId"]);
  if (!creatorReference) {
    return { ok: false, statusCode: 400, error: "creator_reference is required", field: "creator_reference" };
  }

  const packageReference = pickString(raw, [
    "package_reference",
    "packageReference",
    "source_package_reference",
    "sourcePackageReference"
  ]);
  if (!packageReference) {
    return { ok: false, statusCode: 400, error: "package_reference is required", field: "package_reference" };
  }

  const packageState = pickString(raw, ["package_state", "packageState"]);
  if (packageState !== "published") {
    // Only a PUBLISHED package creates an active onboarding path on this event
    // path. identified / draft / superseded are rejected (no state change).
    return {
      ok: false,
      statusCode: 422,
      error: `package_state must be "published"; received ${packageState ?? "none"}`,
      field: "package_state"
    };
  }

  const assessmentReference = pickString(raw, [
    "source_assessment_reference",
    "sourceAssessmentReference",
    "assessment_reference",
    "assessmentReference"
  ]);
  const providerEventId =
    pickString(raw, ["event_id", "eventId", "provider_event_id", "providerEventId"]) ?? packageReference;

  return {
    ok: true,
    event: {
      provider: FYV_EVENT_PROVIDER,
      eventType: CREATOR_INTELLIGENCE_PACKAGE_PUBLISHED_EVENT_TYPE,
      sourceProduct: FYV_SOURCE_PRODUCT,
      creatorReference,
      packageReference,
      assessmentReference,
      packageState: "published",
      providerEventId,
      receivedAt,
      raw
    }
  };
}

/**
 * The OPERATIONAL pointer FMF stores at of_creators.metadata.fyv_package. It is a
 * REFERENCE, not a copy of FYV intelligence content: full received-package
 * provenance/history lives in creator_intelligence_snapshots. `source_event_id`
 * is the source event's dedupe identifier (the producer event id, else the
 * package_reference); the persisted FMF event row is discoverable via of_events
 * (provider = 'fyv', provider_event_id = source_event_id).
 */
export interface FyvPackagePointer {
  source_product: string;
  package_reference: string;
  assessment_reference: string | null;
  package_state: "published";
  linked_at: string;
  source_event_id: string | null;
}

export function buildFyvPackagePointer(
  event: NormalizedCreatorIntelligencePackagePublishedEvent,
  options: { sourceEventId?: string | null; linkedAt?: string } = {}
): FyvPackagePointer {
  return {
    source_product: event.sourceProduct,
    package_reference: event.packageReference,
    assessment_reference: event.assessmentReference,
    package_state: "published",
    linked_at: composeString(options.linkedAt) ?? event.receivedAt,
    source_event_id: options.sourceEventId ?? event.providerEventId
  };
}

/** A minimal canonical view of an EXISTING creator used as a resolution candidate. */
export interface CreatorRelationshipRecord {
  id: string;
  relationship_state: CreatorRelationshipState | null;
}

/** The persisted result of one atomic FYV ingestion write. */
export interface FyvIngestionPersistResult {
  eventId: string;
  deduped: boolean;
  relationshipState: CreatorRelationshipState;
  transitioned: boolean;
}

/**
 * Store port for FYV published-package ingestion. The orchestrator stays pure +
 * deterministic; each implementation owns its own I/O. `persistIngestion` is the
 * ATOMIC unit (attach the operational pointer + advance the relationship state +
 * upsert the deduped event). The Supabase implementation performs a single-row
 * creator UPDATE + an idempotent event write keyed on the existing
 * (provider, provider_event_id) unique index; the in-memory implementation
 * performs one synchronous mutation.
 */
export interface CreatorIntelligenceEventStore {
  /** Resolve an EXISTING creator by reference. NEVER creates. Returns null when unknown. */
  resolveCreatorByReference(
    reference: string
  ): Promise<CreatorRelationshipRecord | null> | CreatorRelationshipRecord | null;
  /** Atomically attach the package pointer, advance the relationship state, and upsert the deduped event. */
  persistIngestion(input: {
    creator: CreatorRelationshipRecord;
    event: NormalizedCreatorIntelligencePackagePublishedEvent;
    nextState: CreatorRelationshipState;
  }): Promise<FyvIngestionPersistResult> | FyvIngestionPersistResult;
}

export type CreatorIntelligenceIngestionResult =
  | {
      ok: true;
      deduped: boolean;
      creatorId: string;
      eventId: string;
      relationshipState: CreatorRelationshipState;
      transitioned: boolean;
    }
  | { ok: false; statusCode: number; error: string; field?: string };

/**
 * Pure orchestrator for the FYV published-package boundary. Deterministic control
 * flow; ALL I/O is in the injected store. Order:
 *   validate -> resolve creator (reject-on-missing, NEVER create)
 *   -> compute next state (invited/null -> accepted only)
 *   -> persist atomically (attach pointer + advance state + deduped event).
 * It NEVER activates automations (accepted -> active is not performed here).
 */
export async function ingestCreatorIntelligencePackagePublishedEvent(
  store: CreatorIntelligenceEventStore,
  rawPayload: unknown,
  options: { receivedAt?: string } = {}
): Promise<CreatorIntelligenceIngestionResult> {
  const outcome = normalizeCreatorIntelligencePackagePublishedEvent(rawPayload, options);
  if (!outcome.ok) {
    return { ok: false, statusCode: outcome.statusCode, error: outcome.error, field: outcome.field };
  }
  const { event } = outcome;

  const creator = await store.resolveCreatorByReference(event.creatorReference);
  if (!creator) {
    // Unknown creator: reject. No identity fabrication, no duplicate creator.
    return {
      ok: false,
      statusCode: 404,
      error: `No FMF creator found for reference ${event.creatorReference}`,
      field: "creator_reference"
    };
  }

  const nextState = nextRelationshipStateForPublishedPackage(creator.relationship_state);
  const persisted = await store.persistIngestion({ creator, event, nextState });

  return {
    ok: true,
    deduped: persisted.deduped,
    creatorId: creator.id,
    eventId: persisted.eventId,
    relationshipState: persisted.relationshipState,
    transitioned: persisted.transitioned
  };
}
