import type {
  OfAutomationSimulation,
  ConversationHealthAlert,
  ConversationOperationsDetail,
  ConversationOperationsExport,
  ConversationOperationsMetrics,
  ConversationOperationsSummary,
  ConversationWorkspaceViewModel,
  QueueWorkspaceViewModel,
  OfAutomationAuditTrailEntry,
  OfAutomationRule,
  AutomationRuleSimulationResult,
  AutomationRegistryWorkspaceData,
  AgencyDefaultsSettings,
  MessageScriptTemplate,
  OfAutomationRun,
  OfChat,
  OfConversationIntelligence,
  OfConversationHistoryItem,
  OfConversationInstance,
  OfCreator,
  OfCreatorAutomationScenario,
  OfCreatorSnapshot,
  OfEvent,
  OfMessageScript,
  OfOutboundMessage,
  OfRecommendation,
  SettingsWorkspaceData,
  CreatorPreferenceSettings,
  CreatorAiSafetySettings,
  OfContextEvent,
  OfRelationshipTimelineItem,
  OfSimulatedSubscriber,
  OfSubscriber,
  OfSubscriberRelationship,
  DailyFocusQueueCard,
  MorningBrief,
  OfSyncRun,
  OfTask,
  SubscriberWorkspaceTimelineItem,
  SyncType
} from "@funkmyfans/of-types";

export interface EventStreamStatus {
  connectionStatus: string;
  transport: string;
  persistentWebSocket: string;
  message: string;
}

export interface DashboardData {
  creators: OfCreator[];
  snapshots: OfCreatorSnapshot[];
  tasks: OfTask[];
  events: OfEvent[];
  syncRuns: OfSyncRun[];
  relationships: OfSubscriberRelationship[];
  contextEvents: OfContextEvent[];
  dailyFocusQueue: DailyFocusQueueCard[];
  morningBrief: MorningBrief;
  dailyOperations: {
    draftsNeedingApproval: number;
    failedSends: number;
    fansNeedingReply: number;
    automationsMatchedToday: number;
    scriptsTriggeredToday: number;
    revenueOpportunities: number;
  };
}

export interface CreatorDetailData {
  creator: OfCreator;
  snapshots: OfCreatorSnapshot[];
  subscribers: OfSubscriber[];
  chats: OfChat[];
  tasks: OfTask[];
  recommendations: OfRecommendation[];
  events: OfEvent[];
  syncRuns: OfSyncRun[];
  relationships: OfSubscriberRelationship[];
  relationshipTimeline: OfRelationshipTimelineItem[];
  contextEvents: OfContextEvent[];
}

export interface ConversationDetailData extends ConversationOperationsDetail {}

export interface QueueWorkspaceData extends QueueWorkspaceViewModel {}

export interface OperationsDashboardData extends QueueWorkspaceViewModel {}

export interface SimulationDetailData {
  simulation: OfAutomationSimulation;
  conversation: OfConversationInstance | null;
  history: OfConversationHistoryItem[];
  outboundMessages: OfOutboundMessage[];
}

export interface SubscribersData {
  creators: OfCreator[];
  subscribers: OfSubscriberRelationship[];
  tasks: OfTask[];
}

export interface ScriptsWorkspaceData {
  creators: OfCreator[];
  scripts: OfMessageScript[];
}

export interface AutomationWorkspaceData {
  creators: OfCreator[];
  scripts: OfMessageScript[];
  rules: OfAutomationRule[];
}

export interface RegistryWorkspaceData {
  registry: AutomationRegistryWorkspaceData;
}

export interface SubscriberDetailData {
  subscriber: OfSubscriberRelationship;
  creator: OfCreator | null;
  tasks: OfTask[];
  events: OfEvent[];
  timeline: SubscriberWorkspaceTimelineItem[];
  intelligence: OfConversationIntelligence | null;
}

export interface AutomationRunSummary {
  eventId: string;
  matched: number;
  queued: number;
  skipped: number;
  errors: string[];
}

export interface SimulationLaunchPayload {
  scriptId?: string | null;
  scenarioId?: string | null;
  simulatedSubscriberId?: string | null;
  eventType: string;
  eventPayload?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  subscriber?: Partial<Pick<OfSimulatedSubscriber, "name" | "username" | "subscription_status" | "renewal_state" | "spend_level" | "lifetime_value" | "message_history_summary" | "custom_variables">>;
}

export type CreatorOnboardingService =
  | "chat_management"
  | "welcome_automation"
  | "subscriber_crm"
  | "content_vault"
  | "analytics"
  | "ai_coach";

export interface CreatorCreatePayload {
  platform_provider: string;
  betterfans_account_id: string;
  username: string;
  display_name: string;
  location: string;
  status: string;
  onboarding_status: string;
  services: CreatorOnboardingService[];
  notes: string;
}

export interface TaskGenerationSummary {
  created: number;
  skipped: number;
  duplicates: number;
  errors: string[];
  evaluated?: number;
}

type SyncSectionResponse = {
  syncRun: OfSyncRun;
  status: "success" | "failed";
  recordsProcessed: number;
  error?: string;
};

const API_BASE = "/api";

export async function fetchDashboard(): Promise<DashboardData> {
  return apiJson<DashboardData>("/dashboard");
}

export async function fetchCreatorDetail(creatorId: string): Promise<CreatorDetailData> {
  return apiJson<CreatorDetailData>(`/creators/${creatorId}`);
}

export async function createCreator(payload: CreatorCreatePayload): Promise<{ creator: OfCreator }> {
  return apiJson<{ creator: OfCreator }>("/creators", jsonInit("POST", payload));
}

export async function validateCreatorConnection(betterfansAccountId: string): Promise<{ valid: boolean; duplicate: boolean; creator: Pick<OfCreator, "betterfans_account_id" | "username" | "display_name" | "location" | "status" | "onboarding_status"> }> {
  return apiJson<{ valid: boolean; duplicate: boolean; creator: Pick<OfCreator, "betterfans_account_id" | "username" | "display_name" | "location" | "status" | "onboarding_status"> }>("/creators/validate", jsonInit("POST", { betterfans_account_id: betterfansAccountId }));
}

export async function fetchEvents(): Promise<{ events: OfEvent[] }> {
  return apiJson<{ events: OfEvent[] }>("/events");
}

export async function fetchTasks(filters: Record<string, string> = {}): Promise<{ tasks: OfTask[] }> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && value !== "all") params.set(key, value);
  }
  const query = params.toString();
  return apiJson<{ tasks: OfTask[] }>(`/tasks${query ? `?${query}` : ""}`);
}

export async function fetchSubscribers(filters: Record<string, string> = {}): Promise<SubscribersData> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && value !== "all") params.set(key, value);
  }
  const query = params.toString();
  return apiJson<SubscribersData>(`/subscribers${query ? `?${query}` : ""}`);
}

export async function fetchSubscriberDetail(subscriberId: string): Promise<SubscriberDetailData> {
  assertUuid(subscriberId, "subscriber");
  return apiJson<SubscriberDetailData>(`/subscribers/${subscriberId}`);
}

export async function fetchSubscriberTimeline(subscriberId: string): Promise<{ timeline: SubscriberWorkspaceTimelineItem[] }> {
  assertUuid(subscriberId, "subscriber");
  return apiJson<{ timeline: SubscriberWorkspaceTimelineItem[] }>(`/subscribers/${subscriberId}/timeline`);
}

export async function fetchSubscriberIntelligence(subscriberId: string): Promise<{ intelligence: OfConversationIntelligence }> {
  assertUuid(subscriberId, "subscriber");
  return apiJson<{ intelligence: OfConversationIntelligence }>(`/subscribers/${subscriberId}/intelligence`);
}

export async function recalculateSubscriberIntelligence(subscriberId: string): Promise<{ intelligence: OfConversationIntelligence }> {
  assertUuid(subscriberId, "subscriber");
  return apiJson<{ intelligence: OfConversationIntelligence }>(`/subscribers/${subscriberId}/recalculate`, { method: "POST" });
}

export async function recalculateAllSubscriberIntelligence(): Promise<{ recalculated: number; errors: string[] }> {
  return apiJson<{ recalculated: number; errors: string[] }>("/subscribers/recalculate-all", { method: "POST" });
}

export async function recalculateSubscriberScore(subscriberId: string): Promise<{ subscriber: OfSubscriberRelationship }> {
  assertUuid(subscriberId, "subscriber");
  return apiJson<{ subscriber: OfSubscriberRelationship }>(`/subscribers/${subscriberId}/score`, { method: "POST" });
}

export async function recalculateAllSubscriberScores(): Promise<{ recalculated: number; tasksUpdated: number; errors: string[] }> {
  return apiJson<{ recalculated: number; tasksUpdated: number; errors: string[] }>("/subscribers/score-all", { method: "POST" });
}

export async function createSubscriberTask(
  subscriberId: string,
  body: { title: string; reason?: string; priorityScore?: number; dueAt?: string | null; recommendedAction?: string }
): Promise<{ task: OfTask }> {
  assertUuid(subscriberId, "subscriber");
  return apiJson<{ task: OfTask }>(`/subscribers/${subscriberId}/tasks`, jsonInit("POST", body));
}

export async function updateSubscriberRelationship(
  subscriberId: string,
  patch: Partial<Pick<OfSubscriberRelationship, "automation_paused" | "human_takeover" | "auto_send_enabled" | "current_workflow">>
): Promise<{ subscriber: OfSubscriberRelationship }> {
  assertUuid(subscriberId, "subscriber");
  return apiJson<{ subscriber: OfSubscriberRelationship }>(`/subscribers/${subscriberId}`, jsonInit("PATCH", patch));
}

export async function generateCreatorTasks(creatorId: string): Promise<TaskGenerationSummary> {
  return apiJson<TaskGenerationSummary>(`/creators/${creatorId}/tasks/generate`, { method: "POST" });
}

export async function updateTask(
  taskId: string,
  patch: Partial<Pick<OfTask, "status" | "priority" | "due_at" | "resolution_note" | "ignore_reason" | "assigned_to">> & { viewed?: boolean; actor?: string }
): Promise<{ task: OfTask }> {
  return apiJson<{ task: OfTask }>(`/tasks/${taskId}`, jsonInit("PATCH", patch));
}

export async function fetchCreatorScripts(creatorId: string): Promise<{ scripts: OfMessageScript[] }> {
  return apiJson<{ scripts: OfMessageScript[] }>(`/creators/${creatorId}/scripts`);
}

export async function fetchScriptsWorkspace(): Promise<ScriptsWorkspaceData> {
  return apiJson<ScriptsWorkspaceData>("/scripts/workspace");
}

export async function fetchAutomationWorkspace(): Promise<AutomationWorkspaceData> {
  return apiJson<AutomationWorkspaceData>("/automation/workspace");
}

export async function fetchAutomationRegistry(): Promise<AutomationRegistryWorkspaceData> {
  return apiJson<AutomationRegistryWorkspaceData>("/automation/registry");
}

export async function fetchSettingsWorkspace(): Promise<SettingsWorkspaceData> {
  return apiJson<SettingsWorkspaceData>("/settings/workspace");
}

export async function createCreatorScript(creatorId: string, template: MessageScriptTemplate): Promise<{ script: OfMessageScript }> {
  return apiJson<{ script: OfMessageScript }>(`/creators/${creatorId}/scripts`, jsonInit("POST", template));
}

export async function updateScript(scriptId: string, patch: Partial<OfMessageScript>): Promise<{ script: OfMessageScript }> {
  assertUuid(scriptId, "script");
  return apiJson<{ script: OfMessageScript }>(`/scripts/${scriptId}`, jsonInit("PATCH", patch));
}

export async function saveScriptBuilder(scriptId: string, template: MessageScriptTemplate): Promise<{ script: OfMessageScript }> {
  assertUuid(scriptId, "script");
  return apiJson<{ script: OfMessageScript }>(`/scripts/${scriptId}/builder`, jsonInit("PUT", template));
}

export async function duplicateScript(scriptId: string): Promise<{ script: OfMessageScript }> {
  assertUuid(scriptId, "script");
  return apiJson<{ script: OfMessageScript }>(`/scripts/${scriptId}/duplicate`, { method: "POST" });
}

export async function deleteScript(scriptId: string): Promise<{ ok: true }> {
  assertUuid(scriptId, "script");
  return apiJson<{ ok: true }>(`/scripts/${scriptId}`, { method: "DELETE" });
}

export async function createAutomationRule(payload: Partial<OfAutomationRule>): Promise<{ rule: OfAutomationRule }> {
  return apiJson<{ rule: OfAutomationRule }>("/automation/rules", jsonInit("POST", payload));
}

export async function updateAutomationRule(ruleId: string, patch: Partial<OfAutomationRule>): Promise<{ rule: OfAutomationRule }> {
  assertUuid(ruleId, "automation rule");
  return apiJson<{ rule: OfAutomationRule }>(`/automation/rules/${ruleId}`, jsonInit("PATCH", patch));
}

export async function duplicateAutomationRule(ruleId: string): Promise<{ rule: OfAutomationRule }> {
  assertUuid(ruleId, "automation rule");
  return apiJson<{ rule: OfAutomationRule }>(`/automation/rules/${ruleId}/duplicate`, { method: "POST" });
}

export async function deleteAutomationRule(ruleId: string): Promise<{ ok: true }> {
  assertUuid(ruleId, "automation rule");
  return apiJson<{ ok: true }>(`/automation/rules/${ruleId}`, { method: "DELETE" });
}

export async function testAutomationRule(
  ruleId: string,
  payload: {
    creatorId: string;
    eventType: string;
    subscriber: {
      name: string;
      username: string;
      subscription_status: string;
      renewal_state: string;
      spend_level: string;
      lifetime_value: number;
      message_history_summary?: string;
      custom_variables?: Record<string, unknown>;
    };
    relationship?: Record<string, unknown>;
    eventPayload?: Record<string, unknown>;
  }
): Promise<AutomationRuleSimulationResult> {
  assertUuid(ruleId, "automation rule");
  return apiJson<AutomationRuleSimulationResult>(`/automation/rules/${ruleId}/test`, jsonInit("POST", payload));
}

export async function updateAgencySettings(patch: Partial<AgencyDefaultsSettings>): Promise<{ agency: AgencyDefaultsSettings }> {
  return apiJson<{ agency: AgencyDefaultsSettings }>("/settings/agency", jsonInit("PATCH", patch));
}

export async function updateCreatorPreferences(
  creatorId: string,
  patch: Partial<CreatorPreferenceSettings>
): Promise<{ preferences: CreatorPreferenceSettings }> {
  assertUuid(creatorId, "creator");
  return apiJson<{ preferences: CreatorPreferenceSettings }>(`/settings/creators/${creatorId}/preferences`, jsonInit("PATCH", patch));
}

export async function updateCreatorAiSafety(
  creatorId: string,
  patch: Partial<CreatorAiSafetySettings>
): Promise<{ aiSafety: CreatorAiSafetySettings }> {
  assertUuid(creatorId, "creator");
  return apiJson<{ aiSafety: CreatorAiSafetySettings }>(`/settings/creators/${creatorId}/ai-safety`, jsonInit("PATCH", patch));
}

export async function runEventAutomations(eventId: string): Promise<AutomationRunSummary> {
  assertUuid(eventId, "event");
  return apiJson<AutomationRunSummary>(`/events/${eventId}/run-automations`, { method: "POST" });
}

export async function fetchCreatorAutomationRuns(creatorId: string): Promise<{ runs: OfAutomationRun[] }> {
  return apiJson<{ runs: OfAutomationRun[] }>(`/creators/${creatorId}/automation-runs`);
}

export async function fetchCreatorConversations(creatorId: string): Promise<{ conversations: OfConversationInstance[] }> {
  return apiJson<{ conversations: OfConversationInstance[] }>(`/creators/${creatorId}/conversations`);
}

export async function fetchConversationDetail(conversationId: string): Promise<ConversationDetailData> {
  assertUuid(conversationId, "conversation");
  return apiJson<ConversationDetailData>(`/conversations/${conversationId}`);
}

export async function fetchSimulatedSubscribers(creatorId: string): Promise<{ subscribers: OfSimulatedSubscriber[] }> {
  return apiJson<{ subscribers: OfSimulatedSubscriber[] }>(`/creators/${creatorId}/simulated-subscribers`);
}

export async function createSimulatedSubscriber(
  creatorId: string,
  payload: Partial<Pick<OfSimulatedSubscriber, "name" | "username" | "subscription_status" | "renewal_state" | "spend_level" | "lifetime_value" | "message_history_summary" | "custom_variables">>
): Promise<{ subscriber: OfSimulatedSubscriber }> {
  return apiJson<{ subscriber: OfSimulatedSubscriber }>(`/creators/${creatorId}/simulated-subscribers`, jsonInit("POST", payload));
}

export async function updateSimulatedSubscriber(
  subscriberId: string,
  payload: Partial<Pick<OfSimulatedSubscriber, "name" | "username" | "subscription_status" | "renewal_state" | "spend_level" | "lifetime_value" | "message_history_summary" | "custom_variables">>
): Promise<{ subscriber: OfSimulatedSubscriber }> {
  assertUuid(subscriberId, "simulated subscriber");
  return apiJson<{ subscriber: OfSimulatedSubscriber }>(`/simulated-subscribers/${subscriberId}`, jsonInit("PATCH", payload));
}

export async function fetchCreatorSimulations(creatorId: string): Promise<{ simulations: OfAutomationSimulation[] }> {
  return apiJson<{ simulations: OfAutomationSimulation[] }>(`/creators/${creatorId}/simulations`);
}

export async function startSimulation(creatorId: string, payload: SimulationLaunchPayload): Promise<SimulationDetailData> {
  return apiJson<SimulationDetailData>(`/creators/${creatorId}/simulations`, jsonInit("POST", payload));
}

export async function fetchSimulationDetail(simulationId: string): Promise<SimulationDetailData> {
  assertUuid(simulationId, "simulation");
  return apiJson<SimulationDetailData>(`/simulations/${simulationId}`);
}

export async function simulationReply(simulationId: string, text: string): Promise<SimulationDetailData> {
  assertUuid(simulationId, "simulation");
  return apiJson<SimulationDetailData>(`/simulations/${simulationId}/reply`, jsonInit("POST", { text }));
}

export async function simulationFastForward(simulationId: string): Promise<SimulationDetailData> {
  assertUuid(simulationId, "simulation");
  return apiJson<SimulationDetailData>(`/simulations/${simulationId}/fast-forward`, { method: "POST" });
}

export async function simulationPause(simulationId: string): Promise<SimulationDetailData> {
  assertUuid(simulationId, "simulation");
  return apiJson<SimulationDetailData>(`/simulations/${simulationId}/pause`, { method: "POST" });
}

export async function simulationResume(simulationId: string): Promise<SimulationDetailData> {
  assertUuid(simulationId, "simulation");
  return apiJson<SimulationDetailData>(`/simulations/${simulationId}/resume`, { method: "POST" });
}

export async function simulationInjectFailure(simulationId: string, kind: "next_send"): Promise<SimulationDetailData> {
  assertUuid(simulationId, "simulation");
  return apiJson<SimulationDetailData>(`/simulations/${simulationId}/failures`, jsonInit("POST", { kind }));
}

export async function simulationRetry(simulationId: string): Promise<SimulationDetailData> {
  assertUuid(simulationId, "simulation");
  return apiJson<SimulationDetailData>(`/simulations/${simulationId}/retry`, { method: "POST" });
}

export async function simulationCancel(simulationId: string): Promise<SimulationDetailData> {
  assertUuid(simulationId, "simulation");
  return apiJson<SimulationDetailData>(`/simulations/${simulationId}/cancel`, { method: "POST" });
}

export async function simulationRestart(simulationId: string): Promise<SimulationDetailData> {
  assertUuid(simulationId, "simulation");
  return apiJson<SimulationDetailData>(`/simulations/${simulationId}/restart`, { method: "POST" });
}

export async function simulationReset(simulationId: string): Promise<SimulationDetailData> {
  assertUuid(simulationId, "simulation");
  return apiJson<SimulationDetailData>(`/simulations/${simulationId}/reset`, { method: "POST" });
}

export async function cancelConversation(conversationId: string, reason: string): Promise<{ conversation: OfConversationInstance }> {
  assertUuid(conversationId, "conversation");
  return apiJson<{ conversation: OfConversationInstance }>(`/conversations/${conversationId}/cancel`, jsonInit("POST", { reason }));
}

export async function fetchOperationsDashboard(filters: Record<string, string> = {}): Promise<OperationsDashboardData> {
  // Legacy compatibility alias for callers still using the dashboard-shaped operations endpoint.
  return apiJson<OperationsDashboardData>(`/operations/dashboard${queryString(filters)}`);
}

export async function fetchQueueWorkspace(filters: Record<string, string> = {}): Promise<QueueWorkspaceData> {
  return apiJson<QueueWorkspaceData>(`/queue-workspace${queryString(filters)}`);
}

export async function fetchOperationsConversationDetail(conversationId: string): Promise<ConversationOperationsDetail> {
  assertUuid(conversationId, "conversation");
  return apiJson<ConversationOperationsDetail>(`/operations/conversations/${conversationId}`);
}

export async function retryOperationsConversation(conversationId: string): Promise<ConversationOperationsDetail> {
  assertUuid(conversationId, "conversation");
  return apiJson<ConversationOperationsDetail>(`/operations/conversations/${conversationId}/retry`, { method: "POST" });
}

export async function resumeOperationsConversation(conversationId: string): Promise<ConversationOperationsDetail> {
  assertUuid(conversationId, "conversation");
  return apiJson<ConversationOperationsDetail>(`/operations/conversations/${conversationId}/resume`, { method: "POST" });
}

export async function cancelOperationsConversation(conversationId: string, reason: string): Promise<ConversationOperationsDetail> {
  assertUuid(conversationId, "conversation");
  return apiJson<ConversationOperationsDetail>(`/operations/conversations/${conversationId}/cancel`, jsonInit("POST", { reason }));
}

export async function restartOperationsConversation(conversationId: string): Promise<ConversationOperationsDetail> {
  assertUuid(conversationId, "conversation");
  return apiJson<ConversationOperationsDetail>(`/operations/conversations/${conversationId}/restart`, { method: "POST" });
}

export async function duplicateConversationAsSimulation(conversationId: string): Promise<ConversationOperationsDetail> {
  assertUuid(conversationId, "conversation");
  return apiJson<ConversationOperationsDetail>(`/operations/conversations/${conversationId}/duplicate-as-simulation`, { method: "POST" });
}

export async function exportOperationsConversation(conversationId: string): Promise<ConversationOperationsExport> {
  assertUuid(conversationId, "conversation");
  return apiJson<ConversationOperationsExport>(`/operations/conversations/${conversationId}/export`);
}

export async function fetchOperationsMetrics(filters: Record<string, string> = {}): Promise<ConversationOperationsMetrics> {
  return apiJson<ConversationOperationsMetrics>(`/operations/metrics${queryString(filters)}`);
}

export async function fetchOperationsAuditTrail(filters: Record<string, string> = {}): Promise<{ entries: OfAutomationAuditTrailEntry[] }> {
  return apiJson<{ entries: OfAutomationAuditTrailEntry[] }>(`/operations/audit-trail${queryString(filters)}`);
}

export async function processDueConversations(): Promise<{ processed: number; errors: string[] }> {
  return apiJson<{ processed: number; errors: string[] }>("/conversations/process-due", { method: "POST" });
}

export async function fetchCreatorAutomationScenarios(creatorId: string): Promise<{ scenarios: OfCreatorAutomationScenario[] }> {
  return apiJson<{ scenarios: OfCreatorAutomationScenario[] }>(`/creators/${creatorId}/automation-scenarios`);
}

export async function updateAutomationScenario(scenarioId: string, patch: Partial<OfCreatorAutomationScenario>): Promise<{ scenario: OfCreatorAutomationScenario }> {
  assertUuid(scenarioId, "automation scenario");
  return apiJson<{ scenario: OfCreatorAutomationScenario }>(`/automation-scenarios/${scenarioId}`, jsonInit("PATCH", patch));
}

export async function fetchOutboundMessages(): Promise<{ messages: OfOutboundMessage[] }> {
  return apiJson<{ messages: OfOutboundMessage[] }>("/outbound-messages");
}

export async function updateOutboundMessage(
  messageId: string,
  patch: Partial<Pick<OfOutboundMessage, "draft_text" | "final_text" | "status" | "approval_status" | "approved_by">> & {
    edited_by?: string;
    error_message?: string;
    failure_reason?: string;
    reason?: string;
  }
): Promise<{ message: OfOutboundMessage }> {
  assertUuid(messageId, "outbound message");
  return apiJson<{ message: OfOutboundMessage }>(`/outbound-messages/${messageId}`, jsonInit("PATCH", patch));
}

export async function fetchEventStreamStatus(): Promise<EventStreamStatus> {
  return apiJson<EventStreamStatus>("/events/stream/status");
}

export async function connectEventStream(): Promise<EventStreamStatus> {
  return apiJson<EventStreamStatus>("/events/stream/connect", { method: "POST" });
}

export async function disconnectEventStream(): Promise<EventStreamStatus> {
  return apiJson<EventStreamStatus>("/events/stream/disconnect", { method: "POST" });
}

export async function syncCreator(accountId: string): Promise<{ creatorId: string; syncedAt: string }> {
  return apiJson<{ creatorId: string; syncedAt: string }>("/sync", jsonInit("POST", { accountId }));
}

export async function syncCreatorSection(creatorId: string, syncType: SyncType): Promise<SyncSectionResponse> {
  return apiJson<SyncSectionResponse>(`/creators/${creatorId}/sync/${syncType}`, { method: "POST" });
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), init);
  const bodyText = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    throw new Error(`API ${response.status} ${response.statusText} for ${path}: ${bodyText || "empty response"}`);
  }

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`API response for ${path} was ${contentType || "missing content-type"}, expected application/json. Body: ${bodyText.slice(0, 120)}`);
  }

  try {
    return JSON.parse(bodyText) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid JSON";
    throw new Error(`API response for ${path} could not be parsed as JSON: ${message}`);
  }
}

function apiUrl(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function queryString(filters: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && value !== "all") params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

function jsonInit(method: "POST" | "PATCH" | "PUT", body: unknown): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  };
}

function assertUuid(value: string, label: string) {
  if (!isUuid(value)) {
    throw new Error(`Cannot run ${label} action because "${value}" is not a database UUID.`);
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}
