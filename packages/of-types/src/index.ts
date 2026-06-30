export type CreatorStatus = "pending" | "connected" | "attention" | "paused" | "disconnected";
export type CreatorOnboardingStatus = "draft" | "pending" | "connected" | "syncing" | "ready" | "needs_attention";
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
export type AutomationExecutionMode = "production" | "simulation";
export type AutomationSimulationStatus = "draft" | "running" | "paused" | "completed" | "cancelled" | "failed";
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
  archivedAt?: string | null;
  execution?: ScriptWorkspaceExecutionConfig;
  ai?: ScriptWorkspaceAiConfig;
  approval?: ScriptWorkspaceApprovalConfig;
  conditions?: ScriptBuilderCondition[];
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
  variableKey?: string;
  variableValue?: string;
  waitForReply?: boolean;
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

export interface ScriptBuilderConfig {
  schemaVersion?: number;
  variables?: ScriptBuilderVariable[];
  workspace?: ScriptWorkspaceConfig;
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
  conversation: OfConversationInstance;
  history: OfConversationHistoryItem[];
  outboundMessages: OfOutboundMessage[];
  auditTrail: OfAutomationAuditTrailEntry[];
  relatedSimulation: OfAutomationSimulation | null;
  subscriber: Record<string, unknown> | null;
  relationship: Record<string, unknown> | null;
  creator: Pick<OfCreator, "id" | "username" | "display_name"> | null;
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
