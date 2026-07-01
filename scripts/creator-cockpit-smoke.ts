import "dotenv/config";

import type { AutomationRuleSimulationResult, OfOutboundMessage } from "@funkmyfans/of-types";

type JsonRecord = Record<string, unknown>;
type SmokeFetchResult = {
  path: string;
  status: number;
  contentType: string;
  text: string;
  body: unknown;
};

const baseUrl = normalizeBaseUrl(process.env.COCKPIT_BASE_URL ?? process.argv[2] ?? "http://127.0.0.1:8787");
const mutationEnabled = process.env.COCKPIT_SMOKE_MUTATION === "true";

async function main() {
  const failures: string[] = [];
  const notes: string[] = [];

  console.log(`[smoke] base ${baseUrl}`);

  const dashboard = await readJson("/api/dashboard", failures);
  if (dashboard) {
    validateDashboardShape(dashboard, failures);
    console.log(`[api] /api/dashboard creators=${arrayLength(dashboard.creators)} tasks=${arrayLength(dashboard.tasks)}`);
  }

  const scriptsWorkspace = await readJson("/api/scripts/workspace", failures);
  if (scriptsWorkspace) {
    validateScriptsWorkspaceShape(scriptsWorkspace, failures);
    console.log(`[api] /api/scripts/workspace scripts=${arrayLength(scriptsWorkspace.scripts)}`);
  }

  const automationWorkspace = await readJson("/api/automation/workspace", failures);
  if (automationWorkspace) {
    validateAutomationWorkspaceShape(automationWorkspace, failures);
    console.log(`[api] /api/automation/workspace rules=${arrayLength(automationWorkspace.rules)}`);
  }

  const settingsWorkspace = await readJson("/api/settings/workspace", failures);
  if (settingsWorkspace) {
    validateSettingsWorkspaceShape(settingsWorkspace, failures);
    console.log(`[api] /api/settings/workspace creators=${arrayLength(settingsWorkspace.creators)}`);
  }

  const outboundMessagesResponse = await readJson("/api/outbound-messages", failures);
  let outboundMessages: OfOutboundMessage[] = [];
  if (outboundMessagesResponse) {
    validateOutboundMessagesShape(outboundMessagesResponse, failures);
    outboundMessages = arrayOfObjects(outboundMessagesResponse.messages) as OfOutboundMessage[];
    console.log(`[api] /api/outbound-messages messages=${outboundMessages.length}`);
  }

  if (dashboard && scriptsWorkspace && automationWorkspace) {
    await validateBusinessFlow(dashboard, scriptsWorkspace, automationWorkspace, failures, notes);
  }

  if (dashboard) {
    await validateCop1QueueWorkspaceFlow(dashboard, failures, notes);
  }

  if (outboundMessagesResponse) {
    validateOutboundApprovalQueue(outboundMessages, failures);
  }

  if (mutationEnabled) {
    notes.push("[info] COCKPIT_SMOKE_MUTATION=true is reserved; mutation smoke checks are not implemented yet.");
  }

  if (failures.length) {
    console.error("\nSmoke test failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  for (const note of notes) {
    console.log(note);
  }

  console.log(`\nCreator Cockpit smoke suite passed against ${baseUrl}`);
}

async function readJson(path: string, failures: string[]): Promise<JsonRecord | null> {
  const result = await fetchEndpoint(path);
  if (result.status !== 200) {
    failures.push(`${path}: expected HTTP 200, got ${result.status} - ${trim(result.text)}`);
    return null;
  }

  if (!result.contentType.toLowerCase().includes("application/json")) {
    failures.push(`${path}: expected JSON response, got ${result.contentType || "missing content-type"}`);
    return null;
  }

  if (!isRecord(result.body)) {
    failures.push(`${path}: expected JSON object, got ${describeValue(result.body)}`);
    return null;
  }

  if ("error" in result.body) {
    failures.push(`${path}: unexpected error payload - ${describeValue(result.body.error)}`);
    return null;
  }

  return result.body;
}

async function fetchEndpoint(path: string): Promise<SmokeFetchResult> {
  const response = await fetch(new URL(path, baseUrl));
  const text = await response.text();
  let body: unknown = null;

  if (response.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  } else {
    body = text;
  }

  return {
    path,
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    text,
    body
  };
}

function validateDashboardShape(body: JsonRecord, failures: string[]) {
  const creators = requireArray(body, "creators", "/api/dashboard", failures);
  const snapshots = requireArray(body, "snapshots", "/api/dashboard", failures);
  const tasks = requireArray(body, "tasks", "/api/dashboard", failures);
  const events = requireArray(body, "events", "/api/dashboard", failures);
  const syncRuns = requireArray(body, "syncRuns", "/api/dashboard", failures);
  const relationships = requireArray(body, "relationships", "/api/dashboard", failures);
  const contextEvents = requireArray(body, "contextEvents", "/api/dashboard", failures);
  const dailyFocusQueue = requireArray(body, "dailyFocusQueue", "/api/dashboard", failures);
  const morningBrief = requireRecord(body, "morningBrief", "/api/dashboard", failures);
  const dailyOperations = requireRecord(body, "dailyOperations", "/api/dashboard", failures);

  if (dailyOperations) {
    requireNumber(dailyOperations, "draftsNeedingApproval", "/api/dashboard.dailyOperations", failures);
    requireNumber(dailyOperations, "failedSends", "/api/dashboard.dailyOperations", failures);
    requireNumber(dailyOperations, "fansNeedingReply", "/api/dashboard.dailyOperations", failures);
    requireNumber(dailyOperations, "automationsMatchedToday", "/api/dashboard.dailyOperations", failures);
    requireNumber(dailyOperations, "scriptsTriggeredToday", "/api/dashboard.dailyOperations", failures);
    requireNumber(dailyOperations, "revenueOpportunities", "/api/dashboard.dailyOperations", failures);
  }

  if (morningBrief) {
    requireString(morningBrief, "headline", "/api/dashboard.morningBrief", failures);
    requireString(morningBrief, "summary", "/api/dashboard.morningBrief", failures);
    requireString(morningBrief, "highest_priority_subscriber", "/api/dashboard.morningBrief", failures);
    requireString(morningBrief, "highest_priority_reason", "/api/dashboard.morningBrief", failures);
    requireNumber(morningBrief, "missed_revenue", "/api/dashboard.morningBrief", failures);
  }

  validateSampleObjects(
    "/api/dashboard",
    [
      [creators, (item) => {
        requireString(item, "id", "/api/dashboard.creators[]", failures);
        requireString(item, "username", "/api/dashboard.creators[]", failures);
        requireString(item, "display_name", "/api/dashboard.creators[]", failures);
      }],
      [snapshots, (item) => {
        requireString(item, "id", "/api/dashboard.snapshots[]", failures);
        requireString(item, "creator_id", "/api/dashboard.snapshots[]", failures);
        requireString(item, "snapshot_date", "/api/dashboard.snapshots[]", failures);
      }],
      [tasks, (item) => {
        requireString(item, "id", "/api/dashboard.tasks[]", failures);
        requireString(item, "creator_id", "/api/dashboard.tasks[]", failures);
        requireString(item, "status", "/api/dashboard.tasks[]", failures);
        requireString(item, "title", "/api/dashboard.tasks[]", failures);
      }],
      [events, (item) => {
        requireString(item, "id", "/api/dashboard.events[]", failures);
        requireString(item, "event_type", "/api/dashboard.events[]", failures);
        requireString(item, "created_at", "/api/dashboard.events[]", failures);
      }],
      [syncRuns, (item) => {
        requireString(item, "id", "/api/dashboard.syncRuns[]", failures);
        requireString(item, "status", "/api/dashboard.syncRuns[]", failures);
      }],
      [relationships, (item) => {
        requireString(item, "id", "/api/dashboard.relationships[]", failures);
        requireString(item, "creator_id", "/api/dashboard.relationships[]", failures);
        requireString(item, "updated_at", "/api/dashboard.relationships[]", failures);
      }],
      [contextEvents, (item) => {
        requireString(item, "id", "/api/dashboard.contextEvents[]", failures);
        requireString(item, "event_type", "/api/dashboard.contextEvents[]", failures);
        requireString(item, "delivery_status", "/api/dashboard.contextEvents[]", failures);
      }],
      [dailyFocusQueue, (item) => {
        requireString(item, "key", "/api/dashboard.dailyFocusQueue[]", failures);
        requireString(item, "title", "/api/dashboard.dailyFocusQueue[]", failures);
        requireString(item, "emoji", "/api/dashboard.dailyFocusQueue[]", failures);
        requireString(item, "color", "/api/dashboard.dailyFocusQueue[]", failures);
        requireNumber(item, "count", "/api/dashboard.dailyFocusQueue[]", failures);
      }]
    ],
    failures
  );
}

function validateScriptsWorkspaceShape(body: JsonRecord, failures: string[]) {
  const creators = requireArray(body, "creators", "/api/scripts/workspace", failures);
  const scripts = requireArray(body, "scripts", "/api/scripts/workspace", failures);

  validateSampleObjects(
    "/api/scripts/workspace",
    [
      [creators, (item) => {
        requireString(item, "id", "/api/scripts/workspace.creators[]", failures);
        requireString(item, "username", "/api/scripts/workspace.creators[]", failures);
        requireString(item, "display_name", "/api/scripts/workspace.creators[]", failures);
      }],
      [scripts, (item) => {
        requireString(item, "id", "/api/scripts/workspace.scripts[]", failures);
        requireString(item, "creator_id", "/api/scripts/workspace.scripts[]", failures);
        requireString(item, "name", "/api/scripts/workspace.scripts[]", failures);
        const steps = requireArray(item, "steps", "/api/scripts/workspace.scripts[]", failures);
        validateSampleObjects(
          "/api/scripts/workspace.scripts[].steps",
          [[steps, (step) => {
            requireString(step, "id", "/api/scripts/workspace.scripts[].steps[]", failures);
            requireNumber(step, "step_order", "/api/scripts/workspace.scripts[].steps[]", failures);
            requireString(step, "step_type", "/api/scripts/workspace.scripts[].steps[]", failures);
          }]],
          failures
        );
      }]
    ],
    failures
  );
}

function validateAutomationWorkspaceShape(body: JsonRecord, failures: string[]) {
  const creators = requireArray(body, "creators", "/api/automation/workspace", failures);
  const scripts = requireArray(body, "scripts", "/api/automation/workspace", failures);
  const rules = requireArray(body, "rules", "/api/automation/workspace", failures);

  validateSampleObjects(
    "/api/automation/workspace",
    [
      [creators, (item) => {
        requireString(item, "id", "/api/automation/workspace.creators[]", failures);
        requireString(item, "username", "/api/automation/workspace.creators[]", failures);
        requireString(item, "display_name", "/api/automation/workspace.creators[]", failures);
      }],
      [scripts, (item) => {
        requireString(item, "id", "/api/automation/workspace.scripts[]", failures);
        requireString(item, "creator_id", "/api/automation/workspace.scripts[]", failures);
        requireString(item, "name", "/api/automation/workspace.scripts[]", failures);
      }],
      [rules, (item) => {
        requireString(item, "id", "/api/automation/workspace.rules[]", failures);
        requireString(item, "name", "/api/automation/workspace.rules[]", failures);
        requireString(item, "status", "/api/automation/workspace.rules[]", failures);
        requireString(item, "trigger_type", "/api/automation/workspace.rules[]", failures);
        requireString(item, "action_type", "/api/automation/workspace.rules[]", failures);
        requireArray(item, "conditions", "/api/automation/workspace.rules[]", failures);
      }]
    ],
    failures
  );
}

function validateSettingsWorkspaceShape(body: JsonRecord, failures: string[]) {
  const agency = requireRecord(body, "agency", "/api/settings/workspace", failures);
  const creators = requireArray(body, "creators", "/api/settings/workspace", failures);
  const runtime = requireRecord(body, "runtime", "/api/settings/workspace", failures);
  const audit = requireArray(body, "audit", "/api/settings/workspace", failures);

  if (agency) {
    requireString(agency, "id", "/api/settings/workspace.agency", failures);
    requireString(agency, "default_timezone", "/api/settings/workspace.agency", failures);
    const quietHours = requireRecord(agency, "quiet_hours", "/api/settings/workspace.agency", failures);
    if (quietHours) {
      requireBoolean(quietHours, "enabled", "/api/settings/workspace.agency.quiet_hours", failures);
      requireNumber(quietHours, "startHour", "/api/settings/workspace.agency.quiet_hours", failures);
      requireNumber(quietHours, "endHour", "/api/settings/workspace.agency.quiet_hours", failures);
    }
  }

  if (runtime) {
    requireBoolean(runtime, "betterfansApiKeyConfigured", "/api/settings/workspace.runtime", failures);
    requireBoolean(runtime, "betterfansBaseUrlConfigured", "/api/settings/workspace.runtime", failures);
    requireBoolean(runtime, "supabaseConfigured", "/api/settings/workspace.runtime", failures);
    const eventStreamStatus = requireRecord(runtime, "eventStreamStatus", "/api/settings/workspace.runtime", failures);
    if (eventStreamStatus) {
      requireString(eventStreamStatus, "connectionStatus", "/api/settings/workspace.runtime.eventStreamStatus", failures);
      requireString(eventStreamStatus, "transport", "/api/settings/workspace.runtime.eventStreamStatus", failures);
      requireString(eventStreamStatus, "persistentWebSocket", "/api/settings/workspace.runtime.eventStreamStatus", failures);
      requireString(eventStreamStatus, "message", "/api/settings/workspace.runtime.eventStreamStatus", failures);
    }
  }

  validateSampleObjects(
    "/api/settings/workspace",
    [
      [creators, (item) => {
        const creator = requireRecord(item, "creator", "/api/settings/workspace.creators[]", failures);
        const preferences = requireRecord(item, "preferences", "/api/settings/workspace.creators[]", failures);
        const aiSafety = requireRecord(item, "ai_safety", "/api/settings/workspace.creators[]", failures);
        if (creator) {
          requireString(creator, "id", "/api/settings/workspace.creators[].creator", failures);
          requireString(creator, "username", "/api/settings/workspace.creators[].creator", failures);
          requireString(creator, "display_name", "/api/settings/workspace.creators[].creator", failures);
        }
        if (preferences) {
          requireString(preferences, "creator_id", "/api/settings/workspace.creators[].preferences", failures);
        }
        if (aiSafety) {
          requireString(aiSafety, "creator_id", "/api/settings/workspace.creators[].ai_safety", failures);
        }
      }],
      [audit, (item) => {
        requireString(item, "id", "/api/settings/workspace.audit[]", failures);
        requireString(item, "entity_type", "/api/settings/workspace.audit[]", failures);
        requireString(item, "created_at", "/api/settings/workspace.audit[]", failures);
      }]
    ],
    failures
  );
}

function validateOutboundMessagesShape(body: JsonRecord, failures: string[]) {
  const messages = requireArray(body, "messages", "/api/outbound-messages", failures);
  validateSampleObjects(
    "/api/outbound-messages",
    [[messages, (item) => validateOutboundMessage(item, "/api/outbound-messages.messages[]", failures)]],
    failures
  );
}

function validateOutboundApprovalQueue(messages: OfOutboundMessage[], failures: string[]) {
  const buckets = {
    needsApproval: messages.filter((message) => message.status === "pending_approval" || message.approval_status === "pending"),
    approvedSending: messages.filter((message) => message.approval_status === "approved" || message.status === "queued" || message.status === "sending"),
    sent: messages.filter((message) => message.status === "sent"),
    failed: messages.filter((message) => message.status === "failed" || message.status === "rejected" || message.approval_status === "rejected")
  };

  console.log(
    `[approval] buckets needs=${buckets.needsApproval.length} approved/sending=${buckets.approvedSending.length} sent=${buckets.sent.length} failed=${buckets.failed.length}`
  );

  if (!("needsApproval" in buckets) || !Array.isArray(buckets.needsApproval)) {
    failures.push("/api/outbound-messages: missing needsApproval bucket");
  }
  if (!("approvedSending" in buckets) || !Array.isArray(buckets.approvedSending)) {
    failures.push("/api/outbound-messages: missing approvedSending bucket");
  }
  if (!("sent" in buckets) || !Array.isArray(buckets.sent)) {
    failures.push("/api/outbound-messages: missing sent bucket");
  }
  if (!("failed" in buckets) || !Array.isArray(buckets.failed)) {
    failures.push("/api/outbound-messages: missing failed bucket");
  }

  const draft = buckets.needsApproval[0];
  if (draft) {
    validateOutboundMessage(draft, "/api/outbound-messages.needsApproval[0]", failures);
  }

  for (const message of [...buckets.approvedSending, ...buckets.sent, ...buckets.failed].slice(0, 2)) {
    validateOutboundMessage(message, "/api/outbound-messages.bucketSample", failures);
  }
}

function validateOutboundMessage(message: JsonRecord, endpoint: string, failures: string[]) {
  requireString(message, "id", endpoint, failures);
  requireString(message, "creator_id", endpoint, failures);
  requireString(message, "status", endpoint, failures);
  requireString(message, "approval_status", endpoint, failures);
  requireString(message, "execution_mode", endpoint, failures);

  const bodyText = stringOrNull(message.message_body) ?? stringOrNull(message.draft_text) ?? stringOrNull(message.final_text);
  if (!bodyText) {
    failures.push(`${endpoint}: expected a message body in message_body, draft_text, or final_text; got ${describeValue(message.message_body ?? message.draft_text ?? message.final_text)}`);
  }

  if (message.script_id != null && typeof message.script_id !== "string") {
    failures.push(`${endpoint}: expected 'script_id' to be string or null, got ${describeValue(message.script_id)}`);
  }
  if (message.script_id && !isRecord(message.of_message_scripts)) {
    failures.push(`${endpoint}: expected 'of_message_scripts' relation for scripted outbound message, got ${describeValue(message.of_message_scripts)}`);
  }
  if (message.metadata != null && !isRecord(message.metadata)) {
    failures.push(`${endpoint}: expected 'metadata' to be an object or null, got ${describeValue(message.metadata)}`);
  }
  if (message.execution_mode !== "simulation" && message.status === "sent") {
    failures.push(`${endpoint}: smoke suite never expects a live sent message from read-only checks`);
  }
}

async function validateBusinessFlow(
  dashboard: JsonRecord,
  scriptsWorkspace: JsonRecord,
  automationWorkspace: JsonRecord,
  failures: string[],
  notes: string[]
) {
  const creators = arrayOfObjects(dashboard.creators) as JsonRecord[];
  const connectedCreator = pickConnectedCreator(creators);
  if (!connectedCreator) {
    failures.push("/api/dashboard: expected at least one connected creator to exercise business flow smoke");
    return;
  }

  notes.push(`[flow] selected creator ${stringValue(connectedCreator.display_name ?? connectedCreator.username ?? connectedCreator.id)}`);

  const scripts = arrayOfObjects(scriptsWorkspace.scripts) as JsonRecord[];
  const automationRules = arrayOfObjects(automationWorkspace.rules) as JsonRecord[];

  const creatorScripts = scripts.filter((script) => script.creator_id === connectedCreator.id);
  if (!creatorScripts.length) {
    failures.push(`/api/scripts/workspace: expected scripts for selected creator ${connectedCreator.id}`);
  }

  const candidateRules = automationRules.filter((rule) => !rule.creator_id || rule.creator_id === connectedCreator.id);
  const chosenRule = candidateRules.find((rule) => rule.selected_script_id && (rule.action_type === "run_script" || rule.action_type === "queue_outbound_draft")) ?? candidateRules[0];

  if (!chosenRule) {
    failures.push(`/api/automation/workspace: expected at least one automation rule to exercise simulation smoke for creator ${connectedCreator.id}`);
    return;
  }

  const testInput = buildAutomationSmokeInput(connectedCreator, chosenRule);
  notes.push(`[flow] testing rule ${stringValue(chosenRule.name)} (${stringValue(chosenRule.trigger_type)})`);

  await runAutomationSimulationTest(chosenRule, testInput, failures, notes);
}

async function validateCop1QueueWorkspaceFlow(dashboard: JsonRecord, failures: string[], notes: string[]) {
  const creators = arrayOfObjects(dashboard.creators) as JsonRecord[];
  const connectedCreator = pickConnectedCreator(creators);
  if (!connectedCreator) {
    failures.push("/api/dashboard: expected at least one connected creator to exercise COP-1 queue workspace smoke");
    return;
  }

  const creatorId = stringValue(connectedCreator.id);
  notes.push(`[queue] selected creator ${stringValue(connectedCreator.display_name ?? connectedCreator.username ?? connectedCreator.id)}`);

  const queueWorkspace = await readJson(`/api/queue-workspace?creatorId=${encodeURIComponent(creatorId)}`, failures);
  const operationsDashboard = await readJson(`/api/operations/dashboard?creatorId=${encodeURIComponent(creatorId)}`, failures);
  if (!queueWorkspace || !operationsDashboard) return;

  validateQueueWorkspaceShape(queueWorkspace, "/api/queue-workspace", failures);
  validateQueueWorkspaceShape(operationsDashboard, "/api/operations/dashboard", failures);
  validateCompatibilityAdapter(queueWorkspace, operationsDashboard, failures);

  const selectedCreator = requireRecord(queueWorkspace, "selected_creator", "/api/queue-workspace", failures);
  if (selectedCreator) {
    requireString(selectedCreator, "id", "/api/queue-workspace.selected_creator", failures);
    requireString(selectedCreator, "username", "/api/queue-workspace.selected_creator", failures);
    if (stringValue(selectedCreator.id) !== creatorId) {
      failures.push(`/api/queue-workspace.selected_creator: expected creator ${creatorId}, got ${describeValue(selectedCreator.id)}`);
    }
  }

  const queues = arrayOfObjects(queueWorkspace.queues);
  const items = arrayOfObjects(queueWorkspace.items);
  if (!queues.length) {
    failures.push("/api/queue-workspace: expected at least one queue to validate queue ownership behavior");
    return;
  }
  if (!items.length) {
    failures.push("/api/queue-workspace: expected at least one queue item to validate queue item lifecycle");
    return;
  }

  for (const queue of queues.slice(0, 3)) {
    validateQueueSummary(queue, failures, "/api/queue-workspace.queues[]");
  }

  validateQueueItemLifecycle(items[0], failures, "/api/queue-workspace.items[0]");

  const selectedItem = items.find((item) => isRecord(item.conversation) && typeof item.conversation.id === "string") ?? items[0];
  if (!selectedItem) return;

  validateQueueItemLifecycle(selectedItem, failures, "/api/queue-workspace.selected_item");
  await validateConversationLifecycle(selectedItem, failures, notes);
}

async function runAutomationSimulationTest(
  rule: JsonRecord,
  testInput: {
    creatorId: string;
    eventType: string;
    subscriber: JsonRecord;
    relationship: JsonRecord;
  },
  failures: string[],
  notes: string[]
) {
  const path = `/api/automation/rules/${stringValue(rule.id)}/test`;
  const result = await fetchEndpoint(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      creatorId: testInput.creatorId,
      eventType: testInput.eventType,
      subscriber: testInput.subscriber,
      relationship: testInput.relationship
    })
  });

  if (result.status === 404 || result.status === 405) {
    notes.push(`[flow] ${path} unavailable; skipped simulation-only rule test`);
    return;
  }

  if (result.status !== 200) {
    failures.push(`${path}: expected HTTP 200, got ${result.status} - ${trim(result.text)}`);
    return;
  }

  if (!isRecord(result.body)) {
    failures.push(`${path}: expected JSON object, got ${describeValue(result.body)}`);
    return;
  }
  if ("error" in result.body) {
    failures.push(`${path}: unexpected error payload - ${describeValue(result.body.error)}`);
    return;
  }

  const simulation = result.body as Partial<AutomationRuleSimulationResult> & JsonRecord;
  requireBoolean(simulation, "matched", path, failures);
  requireBoolean(simulation, "triggerMatched", path, failures);
  requireString(simulation, "action", path, failures);
  requireString(simulation, "creatorId", path, failures);
  requireString(simulation, "creatorName", path, failures);
  requireString(simulation, "eventType", path, failures);
  requireString(simulation, "simulatedAt", path, failures);
  requireArray(simulation, "conditions", path, failures);
  const outboundMessages = requireArray(simulation, "outboundMessages", path, failures);
  requireString(simulation, "summary", path, failures);

  validateSampleObjects(
    path,
    [[outboundMessages, (item) => {
      requireString(item, "id", `${path}.outboundMessages[]`, failures);
      requireString(item, "creator_id", `${path}.outboundMessages[]`, failures);
      requireString(item, "status", `${path}.outboundMessages[]`, failures);
      requireString(item, "execution_mode", `${path}.outboundMessages[]`, failures);
      if (stringValue(item.status) === "sent" || stringValue(item.execution_mode) !== "simulation") {
        failures.push(`${path}.outboundMessages[]: expected simulation-only outbound messages, got status=${describeValue(item.status)} execution_mode=${describeValue(item.execution_mode)}`);
      }
    }]],
    failures
  );

  const conditions = arrayOfObjects(simulation.conditions);
  validateSampleObjects(
    path,
    [[conditions, (item) => {
      requireString(item, "key", `${path}.conditions[]`, failures);
      requireString(item, "label", `${path}.conditions[]`, failures);
      requireBoolean(item, "matched", `${path}.conditions[]`, failures);
      requireString(item, "actual", `${path}.conditions[]`, failures);
      requireString(item, "expected", `${path}.conditions[]`, failures);
    }]],
    failures
  );

  const matched = Boolean(simulation.matched);
  const triggerMatched = Boolean(simulation.triggerMatched);
  const summary = stringValue(simulation.summary).toLowerCase();
  if (!matched && !triggerMatched && !summary.includes("did not match")) {
    failures.push(`${path}: expected a matched simulation or a clearly reported no-match summary; got summary=${describeValue(simulation.summary)}`);
  }

  if ((simulation.action === "run_script" || simulation.action === "queue_outbound_draft") && matched && simulation.scriptId) {
    if (!stringValue(simulation.automationSimulationId)) {
      failures.push(`${path}: expected automationSimulationId for matched script-backed simulation`);
    }
  }

  if (outboundMessages.length) {
    const sentMessages = outboundMessages.filter((item) => stringValue(item.status) === "sent");
    if (sentMessages.length) {
      failures.push(`${path}: simulation generated sent outbound messages, which is not allowed in smoke tests`);
    }
  }
}

function validateQueueWorkspaceShape(body: JsonRecord, endpoint: string, failures: string[]) {
  const selectedCreator = body.selected_creator;
  const summary = requireRecord(body, "summary", endpoint, failures);
  const queues = requireArray(body, "queues", endpoint, failures);
  const items = requireArray(body, "items", endpoint, failures);
  requireString(body, "selected_queue_id", endpoint, failures);
  requireString(body, "selected_item_id", endpoint, failures);
  const selectedItemContext = body.selected_item_context;

  if (isRecord(selectedCreator)) {
    requireString(selectedCreator, "id", `${endpoint}.selected_creator`, failures);
    requireString(selectedCreator, "username", `${endpoint}.selected_creator`, failures);
  } else if (selectedCreator !== null && typeof selectedCreator !== "undefined") {
    failures.push(`${endpoint}: expected selected_creator to be an object or null, got ${describeValue(selectedCreator)}`);
  }

  if (summary) {
    requireNumber(summary, "total_queues", `${endpoint}.summary`, failures);
    requireNumber(summary, "total_items", `${endpoint}.summary`, failures);
    requireNumber(summary, "visible_items", `${endpoint}.summary`, failures);
    requireNumber(summary, "claimed_items", `${endpoint}.summary`, failures);
    requireNumber(summary, "assigned_items", `${endpoint}.summary`, failures);
    requireNumber(summary, "moved_items", `${endpoint}.summary`, failures);
    requireNumber(summary, "resolved_items", `${endpoint}.summary`, failures);
    requireNumber(summary, "overdue_items", `${endpoint}.summary`, failures);
  }

  validateSampleObjects(
    endpoint,
    [
      [queues, (queue) => validateQueueSummary(queue, failures, `${endpoint}.queues[]`)],
      [items, (item) => validateQueueItemLifecycle(item, failures, `${endpoint}.items[]`)]
    ],
    failures
  );

  if (isRecord(selectedItemContext)) {
    validateQueueItemContext(selectedItemContext, failures, `${endpoint}.selected_item_context`);
  } else if (selectedItemContext !== null && typeof selectedItemContext !== "undefined") {
    failures.push(`${endpoint}: expected selected_item_context to be an object or null, got ${describeValue(selectedItemContext)}`);
  }

  if (summary) {
    const totalQueues = numberValue(summary.total_queues);
    const totalItems = numberValue(summary.total_items);
    if (totalQueues !== queues.length) {
      failures.push(`${endpoint}.summary: total_queues should match queues length (${queues.length}), got ${totalQueues}`);
    }
    if (totalItems !== items.length) {
      failures.push(`${endpoint}.summary: total_items should match items length (${items.length}), got ${totalItems}`);
    }
    const countedItems =
      numberValue(summary.visible_items) +
      numberValue(summary.claimed_items) +
      numberValue(summary.assigned_items) +
      numberValue(summary.moved_items) +
      numberValue(summary.resolved_items);
    if (countedItems !== totalItems) {
      failures.push(`${endpoint}.summary: lifecycle counts should sum to total_items (${totalItems}), got ${countedItems}`);
    }
  }
}

function validateQueueSummary(queue: JsonRecord, failures: string[], endpoint: string) {
  requireString(queue, "id", endpoint, failures);
  requireString(queue, "creator_id", endpoint, failures);
  requireString(queue, "name", endpoint, failures);
  requireString(queue, "label", endpoint, failures);
  requireString(queue, "operational_status", endpoint, failures);
  requireString(queue, "visibility_state", endpoint, failures);
  requireString(queue, "priority", endpoint, failures);
  requireNumber(queue, "item_count", endpoint, failures);
  requireNumber(queue, "active_item_count", endpoint, failures);
  requireNumber(queue, "resolved_item_count", endpoint, failures);

  const itemCount = numberValue(queue.item_count);
  const activeItemCount = numberValue(queue.active_item_count);
  const resolvedItemCount = numberValue(queue.resolved_item_count);
  if (activeItemCount + resolvedItemCount !== itemCount) {
    failures.push(`${endpoint}: active_item_count plus resolved_item_count should equal item_count (${itemCount}), got ${activeItemCount + resolvedItemCount}`);
  }
}

function validateQueueItemLifecycle(item: JsonRecord, failures: string[], endpoint: string) {
  requireString(item, "id", endpoint, failures);
  requireString(item, "queue_id", endpoint, failures);
  requireString(item, "priority", endpoint, failures);
  requireString(item, "status", endpoint, failures);
  requireString(item, "title", endpoint, failures);
  requireString(item, "queue_name", endpoint, failures);
  requireString(item, "queue_label", endpoint, failures);
  requireString(item, "status_label", endpoint, failures);
  requireNumber(item, "priority_score", endpoint, failures);
  requireString(item, "created_at", endpoint, failures);
  requireString(item, "updated_at", endpoint, failures);

  const allowedStatuses = new Set(["visible", "claimed", "assigned", "moved", "resolved"]);
  if (!allowedStatuses.has(stringValue(item.status))) {
    failures.push(`${endpoint}: expected queue item lifecycle status from ${Array.from(allowedStatuses).join(", ")}, got ${describeValue(item.status)}`);
  }

  if (stringValue(item.status) === "resolved") {
    requireString(item, "resolved_at", endpoint, failures);
  }

  if (item.conversation !== null && typeof item.conversation !== "undefined") {
    validateQueueConversationSummary(item.conversation, failures, `${endpoint}.conversation`);
  }

  if (item.subscriber !== null && typeof item.subscriber !== "undefined") {
    validateQueueSubscriberSummary(item.subscriber, failures, `${endpoint}.subscriber`);
  }
}

function validateQueueConversationSummary(conversation: unknown, failures: string[], endpoint: string) {
  if (!isRecord(conversation)) {
    failures.push(`${endpoint}: expected conversation summary object, got ${describeValue(conversation)}`);
    return;
  }

  requireString(conversation, "id", endpoint, failures);
  requireString(conversation, "lifecycle_state", endpoint, failures);
  requireString(conversation, "status", endpoint, failures);
  requireString(conversation, "execution_mode", endpoint, failures);
  requireString(conversation, "updated_at", endpoint, failures);

  const lifecycleStates = new Set(["new", "open", "waiting", "escalated", "completed", "archived"]);
  if (!lifecycleStates.has(stringValue(conversation.lifecycle_state))) {
    failures.push(`${endpoint}: expected conversation lifecycle state from ${Array.from(lifecycleStates).join(", ")}, got ${describeValue(conversation.lifecycle_state)}`);
  }
}

function validateQueueSubscriberSummary(subscriber: unknown, failures: string[], endpoint: string) {
  if (!isRecord(subscriber)) {
    failures.push(`${endpoint}: expected subscriber summary object, got ${describeValue(subscriber)}`);
    return;
  }

  if (subscriber.id !== null && typeof subscriber.id !== "string") {
    failures.push(`${endpoint}: expected subscriber id to be string or null, got ${describeValue(subscriber.id)}`);
  }
  if (subscriber.display_name !== null && typeof subscriber.display_name !== "string") {
    failures.push(`${endpoint}: expected subscriber display_name to be string or null, got ${describeValue(subscriber.display_name)}`);
  }
  if (subscriber.username !== null && typeof subscriber.username !== "string") {
    failures.push(`${endpoint}: expected subscriber username to be string or null, got ${describeValue(subscriber.username)}`);
  }
}

async function validateConversationLifecycle(item: JsonRecord, failures: string[], notes: string[]) {
  const conversation = item.conversation;
  if (!isRecord(conversation) || typeof conversation.id !== "string") return;

  notes.push(`[conversation] validating lifecycle for ${conversation.id}`);
  const detail = await readJson(`/api/operations/conversations/${encodeURIComponent(conversation.id)}`, failures);
  if (!detail) return;

  const detailConversation = requireRecord(detail, "conversation", "/api/operations/conversations/:id", failures);
  if (!detailConversation) return;

  requireString(detailConversation, "id", "/api/operations/conversations/:id.conversation", failures);
  requireString(detailConversation, "status", "/api/operations/conversations/:id.conversation", failures);
  requireString(detailConversation, "lifecycle_state", "/api/operations/conversations/:id.conversation", failures);
  requireString(detailConversation, "updated_at", "/api/operations/conversations/:id.conversation", failures);

  const lifecycleStates = new Set(["new", "open", "waiting", "escalated", "completed", "archived"]);
  if (!lifecycleStates.has(stringValue(detailConversation.lifecycle_state))) {
    failures.push(`/api/operations/conversations/:id.conversation: unexpected lifecycle state ${describeValue(detailConversation.lifecycle_state)}`);
  }
}

function validateQueueItemContext(context: JsonRecord, failures: string[], endpoint: string) {
  const conversation = context.conversation;
  const subscriber = context.subscriber;
  const recentEvents = requireArray(context, "recent_events", endpoint, failures);

  if (conversation !== null && typeof conversation !== "undefined") {
    validateQueueConversationSummary(conversation, failures, `${endpoint}.conversation`);
  }
  if (subscriber !== null && typeof subscriber !== "undefined") {
    validateQueueSubscriberSummary(subscriber, failures, `${endpoint}.subscriber`);
  }

  validateSampleObjects(
    endpoint,
    [[recentEvents, (event) => {
      requireString(event, "id", `${endpoint}.recent_events[]`, failures);
      requireString(event, "event_type", `${endpoint}.recent_events[]`, failures);
      requireString(event, "title", `${endpoint}.recent_events[]`, failures);
      requireString(event, "occurred_at", `${endpoint}.recent_events[]`, failures);
    }]],
    failures
  );
}

function validateCompatibilityAdapter(left: JsonRecord, right: JsonRecord, failures: string[]) {
  const leftJson = JSON.stringify(left);
  const rightJson = JSON.stringify(right);
  if (leftJson !== rightJson) {
    failures.push("/api/operations/dashboard: transitional adapter no longer matches /api/queue-workspace response exactly");
  }
}

function validateSampleObjects(
  endpoint: string,
  samples: Array<[unknown[], (item: JsonRecord) => void]>,
  failures: string[]
) {
  for (const [items, validator] of samples) {
    if (!items.length) continue;
    const first = items[0];
    if (!isRecord(first)) {
      failures.push(`${endpoint}: expected object sample, got ${describeValue(first)}`);
      continue;
    }
    validator(first);
  }
}

function buildAutomationSmokeInput(creator: JsonRecord, rule: JsonRecord) {
  const creatorId = stringValue(creator.id);
  const displayName = stringValue(creator.display_name ?? creator.username ?? "Creator");
  const username = `smoke_${slugify(displayName || creatorId).slice(0, 24)}_${creatorId.slice(0, 8)}`;
  return {
    creatorId,
    eventType: mapRuleTriggerToEventType(stringValue(rule.trigger_type)),
    subscriber: {
      name: `${displayName} Smoke Fan`,
      username,
      subscription_status: "active",
      renewal_state: "current",
      spend_level: "high",
      lifetime_value: 250,
      message_history_summary: "Smoke test candidate",
      custom_variables: { smoke: true }
    },
    relationship: {
      lifetime_spend: 250,
      vip_score: 90,
      current_subscription_status: "active",
      ppv_purchases: 1,
      purchase_count: 1,
      last_subscriber_message_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      days_until_expiry: 1
    }
  };
}

function mapRuleTriggerToEventType(triggerType: string) {
  const mapping: Record<string, string> = {
    new_subscriber: "subscriber_created",
    subscription_expiring: "subscriber_expiring",
    subscription_renewed: "subscription_renewed",
    no_chat_activity: "no_chat_activity",
    new_inbound_message: "chat_message",
    ppv_purchased: "ppv_purchased",
    high_spender_detected: "high_spender",
    fan_inactive: "fan_inactive",
    manual: "manual",
    birthday: "birthday",
    vip: "vip"
  };
  return mapping[triggerType] ?? triggerType;
}

function pickConnectedCreator(creators: JsonRecord[]) {
  return (
    creators.find((creator) => creator.active === true && stringValue(creator.status) === "connected") ??
    creators.find((creator) => creator.active === true) ??
    creators[0] ??
    null
  ) as JsonRecord | null;
}

function requireArray(body: JsonRecord, key: string, endpoint: string, failures: string[]) {
  const value = body[key];
  if (!Array.isArray(value)) {
    failures.push(`${endpoint}: expected key '${key}' to be an array, got ${describeValue(value)}`);
    return [];
  }
  return value;
}

function requireRecord(body: JsonRecord, key: string, endpoint: string, failures: string[]) {
  const value = body[key];
  if (!isRecord(value)) {
    failures.push(`${endpoint}: expected key '${key}' to be an object, got ${describeValue(value)}`);
    return null;
  }
  return value;
}

function requireString(body: JsonRecord, key: string, endpoint: string, failures: string[]) {
  const value = body[key];
  if (typeof value !== "string" || !value) {
    failures.push(`${endpoint}: expected key '${key}' to be a non-empty string, got ${describeValue(value)}`);
    return null;
  }
  return value;
}

function requireNumber(body: JsonRecord, key: string, endpoint: string, failures: string[]) {
  const value = body[key];
  if (typeof value !== "number" || Number.isNaN(value)) {
    failures.push(`${endpoint}: expected key '${key}' to be a number, got ${describeValue(value)}`);
    return null;
  }
  return value;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function requireBoolean(body: JsonRecord, key: string, endpoint: string, failures: string[]) {
  const value = body[key];
  if (typeof value !== "boolean") {
    failures.push(`${endpoint}: expected key '${key}' to be a boolean, got ${describeValue(value)}`);
    return null;
  }
  return value;
}

function arrayOfObjects(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function arrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function trim(value: string, max = 240) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > max ? `${compact.slice(0, max)}...` : compact;
}

function describeValue(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `array(len=${value.length})`;
  if (typeof value === "string") return `string(${JSON.stringify(value.length > 48 ? `${value.slice(0, 48)}...` : value)})`;
  if (typeof value === "number") return `number(${value})`;
  if (typeof value === "boolean") return `boolean(${value})`;
  if (typeof value === "undefined") return "undefined";
  if (isRecord(value)) return `object(keys=${Object.keys(value).slice(0, 6).join(",") || "<none>"})`;
  return typeof value;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

await main();
