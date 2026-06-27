import type {
  MessageScriptTemplate,
  OfAutomationRun,
  OfChat,
  OfConversationIntelligence,
  OfCreator,
  OfCreatorSnapshot,
  OfEvent,
  OfMessageScript,
  OfOutboundMessage,
  OfRecommendation,
  OfContextEvent,
  OfRelationshipTimelineItem,
  OfSubscriber,
  OfSubscriberRelationship,
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

export interface SubscribersData {
  creators: OfCreator[];
  subscribers: OfSubscriberRelationship[];
  tasks: OfTask[];
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

export async function createCreatorScript(creatorId: string, template: MessageScriptTemplate): Promise<{ script: OfMessageScript }> {
  return apiJson<{ script: OfMessageScript }>(`/creators/${creatorId}/scripts`, jsonInit("POST", template));
}

export async function updateScript(scriptId: string, patch: Partial<OfMessageScript>): Promise<{ script: OfMessageScript }> {
  assertUuid(scriptId, "script");
  return apiJson<{ script: OfMessageScript }>(`/scripts/${scriptId}`, jsonInit("PATCH", patch));
}

export async function runEventAutomations(eventId: string): Promise<AutomationRunSummary> {
  assertUuid(eventId, "event");
  return apiJson<AutomationRunSummary>(`/events/${eventId}/run-automations`, { method: "POST" });
}

export async function fetchCreatorAutomationRuns(creatorId: string): Promise<{ runs: OfAutomationRun[] }> {
  return apiJson<{ runs: OfAutomationRun[] }>(`/creators/${creatorId}/automation-runs`);
}

export async function fetchOutboundMessages(): Promise<{ messages: OfOutboundMessage[] }> {
  return apiJson<{ messages: OfOutboundMessage[] }>("/outbound-messages");
}

export async function updateOutboundMessage(
  messageId: string,
  patch: Partial<Pick<OfOutboundMessage, "draft_text" | "final_text" | "status" | "approval_status" | "approved_by">>
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

function jsonInit(method: "POST" | "PATCH", body: unknown): RequestInit {
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
