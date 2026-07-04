import "dotenv/config";

import type { OfOutboundMessage } from "@funkmyfans/of-types";

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

  const journeyWorkspace = await readJson("/api/journeys/workspace", failures);
  if (journeyWorkspace) {
    validateJourneyWorkspaceShape(journeyWorkspace, failures);
    console.log(`[api] /api/journeys/workspace journeys=${arrayLength(journeyWorkspace.journeys)}`);
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
    await validateBusinessFlow(dashboard, scriptsWorkspace, automationWorkspace, journeyWorkspace, failures, notes);
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

async function fetchEndpoint(path: string, init?: RequestInit): Promise<SmokeFetchResult> {
  const response = await fetch(new URL(path, baseUrl), init);
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

function validateJourneyWorkspaceShape(body: JsonRecord, failures: string[]) {
  const creators = requireArray(body, "creators", "/api/journeys/workspace", failures);
  const journeys = requireArray(body, "journeys", "/api/journeys/workspace", failures);

  validateSampleObjects(
    "/api/journeys/workspace",
    [
      [creators, (item) => {
        requireString(item, "id", "/api/journeys/workspace.creators[]", failures);
        requireString(item, "username", "/api/journeys/workspace.creators[]", failures);
      }],
      [journeys, (item) => {
        requireString(item, "id", "/api/journeys/workspace.journeys[]", failures);
        requireString(item, "creator_id", "/api/journeys/workspace.journeys[]", failures);
        requireString(item, "name", "/api/journeys/workspace.journeys[]", failures);
        requireString(item, "source_channel", "/api/journeys/workspace.journeys[]", failures);
        requireString(item, "target_channel", "/api/journeys/workspace.journeys[]", failures);
        requireString(item, "audience", "/api/journeys/workspace.journeys[]", failures);
        requireString(item, "trigger_event", "/api/journeys/workspace.journeys[]", failures);
        requireString(item, "conversation_flow_id", "/api/journeys/workspace.journeys[]", failures);
        requireString(item, "expected_outcome", "/api/journeys/workspace.journeys[]", failures);
        requireString(item, "success_event", "/api/journeys/workspace.journeys[]", failures);
        requireString(item, "failure_event", "/api/journeys/workspace.journeys[]", failures);
        requireString(item, "status", "/api/journeys/workspace.journeys[]", failures);
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
  journeyWorkspace: JsonRecord | null,
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

  const funnelScript = creatorScripts.find((script) => stringValue(script.name) === "New Subscriber Funnel");
  if (!funnelScript) {
    failures.push(`/api/scripts/workspace: expected seeded New Subscriber Funnel for creator ${connectedCreator.id}`);
    return;
  }

  const funnelSteps = arrayOfObjects(funnelScript.steps);
  validateNsp4FunnelShape(creatorScripts, funnelScript, funnelSteps, failures);
  const shortPlaybook = validateNsp6ShortPlaybookShape(creatorScripts, automationRules, connectedCreator.id, failures);

  const chosenRule = automationRules.find((rule) =>
    rule.creator_id === connectedCreator.id &&
    stringValue(rule.name) === "New subscriber -> New Subscriber Funnel" &&
    stringValue(rule.status) === "active" &&
    stringValue(rule.selected_script_id) === stringValue(funnelScript.id)
  );
  if (!chosenRule) {
    failures.push(`/api/automation/workspace: expected active New subscriber -> New Subscriber Funnel rule linked to script ${stringValue(funnelScript.id)}`);
    return;
  }

  notes.push(`[flow] testing rule ${stringValue(chosenRule.name)} (${stringValue(chosenRule.trigger_type)})`);
  notes.push(`[flow] canonical script ${stringValue(funnelScript.id)} steps=${funnelSteps.length}`);

  await runNewSubscriberFunnelAcceptance({
    creator: connectedCreator,
    script: funnelScript,
    rule: chosenRule
  }, failures, notes);

  if (shortPlaybook) {
    await runNewSubscriberShortPlaybookAcceptance({
      creator: connectedCreator,
      script: shortPlaybook.script,
      rule: shortPlaybook.rule
    }, failures, notes);
  }

  if (journeyWorkspace) {
    await validateJourneyAlignment(connectedCreator, funnelScript, journeyWorkspace, failures, notes);
  }
}

async function validateJourneyAlignment(
  creator: JsonRecord,
  funnelScript: JsonRecord,
  journeyWorkspace: JsonRecord,
  failures: string[],
  notes: string[]
) {
  const creatorId = stringValue(creator.id);
  const journeys = arrayOfObjects(journeyWorkspace.journeys) as JsonRecord[];
  const journey = journeys.find((item) =>
    stringValue(item.creator_id) === creatorId &&
    stringValue(item.name) === "Instagram Follower -> OnlyFans Subscriber" &&
    stringValue(item.status) === "active"
  );
  if (!journey) {
    failures.push(`/api/journeys/workspace: expected active Instagram Follower -> OnlyFans Subscriber Journey for creator ${creatorId}`);
    return;
  }

  const expected = {
    source_channel: "instagram",
    target_channel: "onlyfans",
    audience: "instagram_followers",
    trigger_event: "instagram_story_reply",
    expected_outcome: "onlyfans_subscribed",
    success_event: "subscriber_created",
    failure_event: "journey_timeout"
  };
  for (const [key, value] of Object.entries(expected)) {
    if (stringValue(journey[key]) !== value) {
      failures.push(`/api/journeys/workspace: expected Journey ${key}=${value}, got ${describeValue(journey[key])}`);
    }
  }
  if (stringValue(journey.conversation_flow_id) !== stringValue(funnelScript.id)) {
    failures.push(`/api/journeys/workspace: expected Journey linked flow ${stringValue(funnelScript.id)}, got ${describeValue(journey.conversation_flow_id)}`);
  }

  notes.push(`[journey] route=${stringValue(journey.name)} ${stringValue(journey.source_channel)} -> ${stringValue(journey.target_channel)} trigger=${stringValue(journey.trigger_event)} expected=${stringValue(journey.expected_outcome)}`);

  const runKey = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const result = await fetchEndpoint(`/api/creators/${encodeURIComponent(creatorId)}/simulations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      journeyId: stringValue(journey.id),
      eventType: "instagram_story_reply",
      eventPayload: {
        source_channel: "instagram",
        target_channel: "onlyfans",
        audience: "instagram_followers",
        fanId: `ig_story_${runKey}`,
        message_text: "That story made me curious.",
        expected_outcome: "onlyfans_subscribed"
      },
      subscriber: {
        name: "Instagram Story Fan",
        username: `ig_story_${runKey}`,
        subscription_status: "lead",
        renewal_state: "prospect",
        spend_level: "unknown",
        lifetime_value: 0,
        message_history_summary: "Smoke journey alignment lead",
        custom_variables: {
          source_channel: "instagram",
          relationship_stage: "Prospect",
          conversation_summary: "Instagram story reply"
        }
      },
      variables: {
        subscriber_name: "Instagram Story Fan",
        starter_ppv_title: "Starter PPV",
        starter_ppv_price: "19"
      }
    })
  });

  if (result.status !== 201) {
    failures.push(`[journey] simulation expected HTTP 201, got ${result.status} - ${trim(result.text)}`);
    return;
  }
  if (!isRecord(result.body)) {
    failures.push("[journey] simulation expected detail object");
    return;
  }
  const simulation = requireRecord(result.body, "simulation", "[journey] simulation", failures);
  const conversation = requireRecord(result.body, "conversation", "[journey] simulation", failures);
  const history = arrayOfObjects(result.body.history);
  const matched = history.some((entry) => stringValue(entry.event_type) === "journey_matched");
  if (!matched) {
    failures.push("[journey] expected runtime history to include journey_matched");
  }
  if (simulation && stringValue(simulation.journey_id) !== stringValue(journey.id)) {
    failures.push(`[journey] expected simulation journey_id ${stringValue(journey.id)}, got ${describeValue(simulation.journey_id)}`);
  }
  if (simulation && stringValue(simulation.event_type) !== "instagram_story_reply") {
    failures.push(`[journey] expected simulation event_type instagram_story_reply, got ${describeValue(simulation.event_type)}`);
  }
  if (conversation && stringValue(conversation.script_id) !== stringValue(funnelScript.id)) {
    failures.push(`[journey] expected matched Journey to launch New Subscriber Funnel ${stringValue(funnelScript.id)}, got ${describeValue(conversation.script_id)}`);
  }
  notes.push(`[journey] simulation=${simulation ? stringValue(simulation.id) : "unknown"} matched=${matched ? "yes" : "no"} flow_started=${conversation ? stringValue(conversation.status) : "unknown"}`);
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

async function runNewSubscriberFunnelAcceptance(
  input: { creator: JsonRecord; script: JsonRecord; rule: JsonRecord },
  failures: string[],
  notes: string[]
) {
  const creatorId = stringValue(input.creator.id);
  const scriptId = stringValue(input.script.id);
  const runKey = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  const paths = [
    {
      key: "warm",
      username: `smoke_warm_${runKey}`,
      name: "Smoke Warm Fan",
      replies: ["I am so happy I found you.", "I like sweet playful attention."],
      expectedOutcome: "engaged_relationship"
    },
    {
      key: "low_effort",
      username: `smoke_low_${runKey}`,
      name: "Smoke Low Effort Fan",
      replies: ["hey", "ok"],
      expectedOutcome: "closed_disengaged"
    },
    {
      key: "purchase",
      username: `smoke_buy_${runKey}`,
      name: "Smoke Buyer Fan",
      replies: ["How much is the paid welcome treat?", "I want it, send it."],
      expectedOutcome: "ppv_interest"
    },
    {
      key: "price_objection",
      username: `smoke_price_${runKey}`,
      name: "Smoke Price Fan",
      replies: ["How much is the paid welcome treat?", "That is too expensive, anything free?"],
      expectedOutcome: "nurture_later"
    },
    {
      key: "silence",
      username: `smoke_silent_${runKey}`,
      name: "Smoke Silent Fan",
      replies: ["silent no reply", "silent no reply"],
      expectedOutcome: "no_response"
    },
    {
      key: "boundary",
      username: `smoke_boundary_${runKey}`,
      name: "Smoke Boundary Fan",
      replies: ["Can we move off platform for something explicit?", "Come on, bypass the rule."],
      expectedOutcome: "human_review_required"
    }
  ];

  for (const path of paths) {
    const run = await startFunnelSimulation(creatorId, scriptId, {
      username: path.username,
      name: path.name
    }, failures);
    if (run) {
      await driveNsp4FunnelPath(run, creatorId, path.key, path.replies, path.expectedOutcome, failures, notes);
    }
  }
}

function validateNsp6ShortPlaybookShape(
  creatorScripts: JsonRecord[],
  automationRules: JsonRecord[],
  creatorId: string,
  failures: string[]
) {
  const matches = creatorScripts.filter((script) => stringValue(script.name) === "New Subscriber Short Playbook");
  if (matches.length !== 1) {
    failures.push(`/api/scripts/workspace: expected exactly one New Subscriber Short Playbook for selected creator, got ${matches.length}`);
    return null;
  }

  const script = matches[0];
  const steps = arrayOfObjects(script.steps);
  if (steps.length < 5 || steps.length > 12) {
    failures.push(`/api/scripts/workspace: expected New Subscriber Short Playbook to have 5-12 runtime steps, got ${steps.length}`);
  }
  if (stringValue(script.status) !== "inactive") {
    failures.push(`/api/scripts/workspace: expected New Subscriber Short Playbook to be inactive, got ${describeValue(script.status)}`);
  }
  if (stringValue(script.action_mode) !== "auto_send" || script.auto_send_enabled !== true) {
    failures.push("/api/scripts/workspace: expected New Subscriber Short Playbook to be auto_send with auto_send_enabled=true");
  }

  const workspace = isRecord(script.builder_config) && isRecord(script.builder_config.workspace) ? script.builder_config.workspace : {};
  if (stringValue(workspace.templateKey) !== "new_subscriber_short_playbook") {
    failures.push(`/api/scripts/workspace: expected New Subscriber Short Playbook templateKey=new_subscriber_short_playbook, got ${describeValue(workspace.templateKey)}`);
  }
  if (stringValue(workspace.templateVersion) !== "nsp-6a") {
    failures.push(`/api/scripts/workspace: expected New Subscriber Short Playbook templateVersion=nsp-6a, got ${describeValue(workspace.templateVersion)}`);
  }
  if (stringValue(workspace.archetypeKey) !== "girl_next_door") {
    failures.push(`/api/scripts/workspace: expected New Subscriber Short Playbook archetypeKey=girl_next_door, got ${describeValue(workspace.archetypeKey)}`);
  }

  const routeStep = steps.find((step) =>
    stringValue(step.step_type) === "branch" &&
    (stringValue(step.step_order) === "2" || stringValue(step.metadata?.label) === "Route Opening Reply")
  );
  const branchRules = isRecord(routeStep?.metadata) && Array.isArray(routeStep.metadata.branchRules) ? routeStep.metadata.branchRules : [];
  for (const routeKey of ["engaged", "buying_signal", "exception", "no_response"]) {
    if (!branchRules.some((rule) => isRecord(rule) && isRecord(rule.condition) && stringValue(rule.condition.value) === routeKey)) {
      failures.push(`/api/scripts/workspace: New Subscriber Short Playbook missing route ${routeKey}`);
    }
  }

  const rule = automationRules.find((item) =>
    item.creator_id === creatorId &&
    stringValue(item.name) === "New subscriber -> New Subscriber Short Playbook"
  );
  if (!rule) {
    failures.push(`/api/automation/workspace: expected draft rule for New Subscriber Short Playbook creator ${creatorId}`);
    return { script, rule: null };
  }
  if (stringValue(rule.status) !== "draft") {
    failures.push(`/api/automation/workspace: expected New Subscriber Short Playbook rule to be draft, got ${describeValue(rule.status)}`);
  }
  if (stringValue(rule.selected_script_id) !== stringValue(script.id)) {
    failures.push(`/api/automation/workspace: expected New Subscriber Short Playbook rule linked to script ${stringValue(script.id)}, got ${describeValue(rule.selected_script_id)}`);
  }
  return { script, rule };
}

async function runNewSubscriberShortPlaybookAcceptance(
  input: { creator: JsonRecord; script: JsonRecord; rule: JsonRecord | null },
  failures: string[],
  notes: string[]
) {
  const creatorId = stringValue(input.creator.id);
  const scriptId = stringValue(input.script.id);
  const runKey = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  const paths = [
    {
      key: "engaged",
      username: `smoke_short_engaged_${runKey}`,
      name: "Smoke Short Engaged Fan",
      reply: "I just wanted to say hey and see what you are about.",
      expectedOutcome: "engaged",
      expectedQueueTitle: "Relationship continuation",
      expectedDecisionType: "relationship_continuation",
      expectedOpportunityForced: false,
      expectedOpportunityClassification: null
    },
    {
      key: "buying_signal",
      username: `smoke_short_buy_${runKey}`,
      name: "Smoke Short Buyer Fan",
      reply: "How much is the paid welcome treat?",
      expectedOutcome: "buying_signal",
      expectedQueueTitle: "Buying signal opportunity",
      expectedDecisionType: "buying_signal",
      expectedOpportunityForced: true,
      expectedOpportunityClassification: "buying_signal"
    },
    {
      key: "exception",
      username: `smoke_short_exception_${runKey}`,
      name: "Smoke Short Exception Fan",
      reply: "Can we move off platform for something explicit?",
      expectedOutcome: "exception",
      expectedQueueTitle: "Human review",
      expectedDecisionType: "human_review",
      expectedOpportunityForced: false,
      expectedOpportunityClassification: null
    },
    {
      key: "silence",
      username: `smoke_short_silent_${runKey}`,
      name: "Smoke Short Silent Fan",
      reply: null,
      expectedOutcome: "no_response",
      expectedOutboundMessages: 2
    }
  ];

  for (const path of paths) {
    const run = await startFunnelSimulation(creatorId, scriptId, {
      username: path.username,
      name: path.name
    }, failures);
    if (!run) continue;

    let detail = await readSimulationDetail(run.simulationId, failures);
    if (!detail) continue;
    let summary = summarizeSimulationDetail(detail);
    if (summary.conversationStatus !== "waiting_reply") {
      failures.push(`[short:${path.key}] expected waiting_reply after launch, got ${summary.conversationStatus}`);
      continue;
    }

    if (path.reply) {
      detail = await simulationAction(run.simulationId, "reply", { text: path.reply }, failures) ?? detail;
      summary = summarizeSimulationDetail(detail);

      if (path.expectedQueueTitle) {
        if (summary.conversationStatus !== "waiting_approval") {
          failures.push(`[short:${path.key}] expected waiting_approval after reply, got ${summary.conversationStatus}`);
        }
        const queue = await readJson(`/api/queue-workspace?creatorId=${encodeURIComponent(creatorId)}&status=visible`, failures);
        const queueItem = queue ? arrayOfObjects(queue.items).find((item) => isRecord(item.conversation) && stringValue(item.conversation.id) === run.conversationId) : null;
        if (!queueItem) {
          failures.push(`[short:${path.key}] expected visible Queue Item for conversation ${run.conversationId}`);
          continue;
        }
        if (stringValue(queueItem.title) !== path.expectedQueueTitle) {
          failures.push(`[short:${path.key}] expected queue title ${path.expectedQueueTitle}, got ${describeValue(queueItem.title)}`);
        }
        if (stringValue(queueItem.metadata?.decision_type) !== path.expectedDecisionType) {
          failures.push(`[short:${path.key}] expected queue decision_type ${path.expectedDecisionType}, got ${describeValue(queueItem.metadata?.decision_type)}`);
        }
        if (Boolean(queueItem.metadata?.opportunity_forced) !== path.expectedOpportunityForced) {
          failures.push(`[short:${path.key}] expected opportunity_forced=${String(path.expectedOpportunityForced)}, got ${describeValue(queueItem.metadata?.opportunity_forced)}`);
        }
        if ((queueItem.metadata?.opportunity_classification ?? null) !== path.expectedOpportunityClassification) {
          failures.push(`[short:${path.key}] expected opportunity_classification ${describeValue(path.expectedOpportunityClassification)}, got ${describeValue(queueItem.metadata?.opportunity_classification)}`);
        }
        const respond = await fetchEndpoint(`/api/queue-items/${encodeURIComponent(stringValue(queueItem.id))}/action`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "respond", actor: "smoke", responseText: `Reviewed ${path.expectedOutcome}` })
        });
        if (respond.status !== 200) {
          failures.push(`[short:${path.key}] queue respond expected HTTP 200, got ${respond.status} - ${trim(respond.text)}`);
          continue;
        }
        detail = await readSimulationDetail(run.simulationId, failures) ?? detail;
        summary = summarizeSimulationDetail(detail);
        if (summary.conversationStatus !== "completed") {
          failures.push(`[short:${path.key}] expected completed after queue respond, got ${summary.conversationStatus}`);
        }
      }
    } else {
      detail = await simulationAction(run.simulationId, "fast-forward", {}, failures) ?? detail;
      summary = summarizeSimulationDetail(detail);
      if (summary.conversationStatus !== "completed") {
        failures.push(`[short:${path.key}] expected completed after reply timeout fast-forward, got ${summary.conversationStatus}`);
      }
      if (arrayOfObjects(detail.outboundMessages).length !== path.expectedOutboundMessages) {
        failures.push(`[short:${path.key}] expected ${path.expectedOutboundMessages} outbound messages, got ${arrayOfObjects(detail.outboundMessages).length}`);
      }
      const queue = await readJson(`/api/queue-workspace?creatorId=${encodeURIComponent(creatorId)}&status=visible`, failures);
      const queueItem = queue ? arrayOfObjects(queue.items).find((item) => isRecord(item.conversation) && stringValue(item.conversation.id) === run.conversationId) : null;
      if (queueItem) {
        failures.push(`[short:${path.key}] expected no queue item for no-response path, got ${describeValue(queueItem.id)}`);
      }
    }

    if (!summary.outcomeSummary.includes(path.expectedOutcome)) {
      failures.push(`[short:${path.key}] expected outcome ${path.expectedOutcome}, got ${summary.outcomeSummary}`);
    }
    notes.push(`[short:${path.key}] status=${summary.conversationStatus} outcome=${summary.outcomeSummary} timeline=${summary.timeline}`);
  }
}

function validateNsp4FunnelShape(creatorScripts: JsonRecord[], funnelScript: JsonRecord, funnelSteps: JsonRecord[], failures: string[]) {
  const duplicates = creatorScripts.filter((script) => stringValue(script.name) === "New Subscriber Funnel");
  if (duplicates.length !== 1) {
    failures.push(`/api/scripts/workspace: expected exactly one New Subscriber Funnel for selected creator, got ${duplicates.length}`);
  }
  if (funnelSteps.length !== 44) {
    failures.push(`/api/scripts/workspace: expected NSP-4 New Subscriber Funnel to have 44 runtime steps, got ${funnelSteps.length}`);
  }
  if (stringValue(funnelScript.action_mode) !== "draft_for_approval" || funnelScript.auto_send_enabled !== false) {
    failures.push("/api/scripts/workspace: expected NSP-4 New Subscriber Funnel to be draft_for_approval with auto_send_enabled=false");
  }

  const workspace = isRecord(funnelScript.builder_config) && isRecord(funnelScript.builder_config.workspace) ? funnelScript.builder_config.workspace : {};
  if (stringValue(workspace.templateVersion) !== "nsp-4") {
    failures.push(`/api/scripts/workspace: expected New Subscriber Funnel templateVersion=nsp-4, got ${describeValue(workspace.templateVersion)}`);
  }
  if (stringValue(workspace.archetypeKey) !== "girl_next_door") {
    failures.push(`/api/scripts/workspace: expected New Subscriber Funnel archetypeKey=girl_next_door, got ${describeValue(workspace.archetypeKey)}`);
  }

  const routeInitial = funnelSteps.find((step) =>
    stringValue(step.step_type) === "branch" &&
    (stringValue(step.step_order) === "2" || stringValue(step.metadata?.label) === "Route Initial Response")
  );
  const routeRules = isRecord(routeInitial?.metadata) && Array.isArray(routeInitial.metadata.branchRules) ? routeInitial.metadata.branchRules : [];
  const requiredRoutes = [
    "warm_enthusiastic",
    "short_low_effort",
    "compliment",
    "flirtatious",
    "curious_about_creator",
    "asks_for_content",
    "purchase_intent",
    "price_objection",
    "not_ready",
    "silent_no_reply",
    "boundary_testing",
    "explicit_or_unsupported_request",
    "off_topic"
  ];
  for (const route of requiredRoutes) {
    if (!routeRules.some((rule) => isRecord(rule) && isRecord(rule.condition) && stringValue(rule.condition.value) === route)) {
      failures.push(`/api/scripts/workspace: New Subscriber route_initial missing route ${route}`);
    }
  }

  const outcomes = new Set(funnelSteps.map((step) => isRecord(step.metadata) ? stringValue(step.metadata.outcomeKey) : "").filter(Boolean));
  for (const outcome of [
    "engaged_relationship",
    "profile_content_exploration",
    "conversion_opportunity_detected",
    "ppv_interest",
    "subscription_upsell_opportunity",
    "one_to_one_opportunity",
    "nurture_later",
    "no_response",
    "closed_disengaged",
    "human_review_required"
  ]) {
    if (!outcomes.has(outcome)) failures.push(`/api/scripts/workspace: New Subscriber Funnel missing terminal outcome ${outcome}`);
  }
}

async function startFunnelSimulation(
  creatorId: string,
  scriptId: string,
  input: { username: string; name: string },
  failures: string[]
) {
  const result = await fetchEndpoint(`/api/creators/${encodeURIComponent(creatorId)}/simulations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      scriptId,
      eventType: "subscriber_created",
      eventPayload: {
        fanId: input.username,
        subscriber: {
          display_name: input.name,
          username: input.username,
          subscription_date: new Date().toISOString(),
          total_spend: 0,
          last_purchase: null,
          relationship_stage: "New",
          conversation_summary: "Smoke acceptance new subscriber"
        }
      },
      subscriber: {
        name: input.name,
        username: input.username,
        subscription_status: "active",
        renewal_state: "new",
        spend_level: "new",
        lifetime_value: 0,
        message_history_summary: "Smoke acceptance new subscriber",
        custom_variables: {
          display_name: input.name,
          nickname: input.name.split(" ")[1] ?? input.name,
          subscription_date: new Date().toISOString(),
          total_spend: 0,
          last_purchase: null,
          relationship_stage: "New",
          conversation_summary: "Smoke acceptance new subscriber"
        }
      },
      variables: {
        subscriber_name: input.name,
        creator_name: "MoonSiren",
        archetype_key: "girl_next_door",
        starter_ppv_title: "Starter PPV",
        starter_ppv_price: "19"
      }
    })
  });

  if (result.status !== 201) {
    failures.push(`/api/creators/:id/simulations: expected HTTP 201, got ${result.status} - ${trim(result.text)}`);
    return null;
  }
  if (!isRecord(result.body)) {
    failures.push("/api/creators/:id/simulations: expected simulation detail object");
    return null;
  }
  const simulation = requireRecord(result.body, "simulation", "/api/creators/:id/simulations", failures);
  const conversation = requireRecord(result.body, "conversation", "/api/creators/:id/simulations", failures);
  if (simulation) {
    requireString(simulation, "id", "/api/creators/:id/simulations.simulation", failures);
    requireString(simulation, "status", "/api/creators/:id/simulations.simulation", failures);
  }
  if (conversation) {
    requireString(conversation, "id", "/api/creators/:id/simulations.conversation", failures);
    requireString(conversation, "status", "/api/creators/:id/simulations.conversation", failures);
  }
  return {
    detail: result.body,
    simulationId: simulation ? stringValue(simulation.id) : "",
    conversationId: conversation ? stringValue(conversation.id) : ""
  };
}

async function driveNsp4FunnelPath(
  run: { detail: JsonRecord; simulationId: string; conversationId: string },
  creatorId: string,
  key: string,
  replies: string[],
  expectedOutcome: string,
  failures: string[],
  notes: string[]
) {
  notes.push(`[acceptance:${key}] simulation=${run.simulationId} conversation=${run.conversationId}`);
  let detail = await approveSimulationDrafts(run.simulationId, creatorId, run.conversationId, failures, notes, key);
  for (const reply of replies) {
    detail = await simulationAction(run.simulationId, "reply", { text: reply }, failures) ?? detail;
    detail = await approveSimulationDrafts(run.simulationId, creatorId, run.conversationId, failures, notes, key) ?? detail;
  }
  if (!detail) return;

  const completed = summarizeSimulationDetail(detail);
  notes.push(`[acceptance:${key}] final status=${completed.conversationStatus} simulation=${completed.simulationStatus} outcome=${completed.outcomeSummary}`);
  notes.push(`[acceptance:${key}] variables=${completed.variableSummary}`);
  notes.push(`[acceptance:${key}] timeline=${completed.timeline}`);
  if (completed.conversationStatus !== "completed" || completed.simulationStatus !== "completed") {
    failures.push(`[acceptance:${key}] expected completed conversation and simulation, got conversation=${completed.conversationStatus} simulation=${completed.simulationStatus}`);
  }
  if (!completed.outcomeSummary.includes(expectedOutcome)) {
    failures.push(`[acceptance:${key}] expected outcome ${expectedOutcome}, got ${completed.outcomeSummary}`);
  }
}

async function approveSimulationDrafts(
  simulationId: string,
  creatorId: string,
  conversationId: string,
  failures: string[],
  notes: string[],
  key: string
) {
  let detail = await readSimulationDetail(simulationId, failures);
  for (let index = 0; index < 8 && detail; index += 1) {
    const summary = summarizeSimulationDetail(detail);
    if (summary.conversationStatus !== "waiting_approval") return detail;
    const queue = await readJson(`/api/queue-workspace?creatorId=${encodeURIComponent(creatorId)}&status=visible`, failures);
    const queueItem = queue ? arrayOfObjects(queue.items).find((item) => isRecord(item.conversation) && stringValue(item.conversation.id) === conversationId) : null;
    if (!queueItem) {
      failures.push(`[acceptance:${key}] expected visible Queue Item for conversation ${conversationId}`);
      return detail;
    }
    const approval = await fetchEndpoint(`/api/queue-items/${encodeURIComponent(stringValue(queueItem.id))}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "approve_ai", actor: "smoke" })
    });
    if (approval.status !== 200) {
      failures.push(`[acceptance:${key}] queue approval expected HTTP 200, got ${approval.status} - ${trim(approval.text)}`);
      return detail;
    }
    notes.push(`[acceptance:${key}] approved queue item ${stringValue(queueItem.id)}`);
    detail = await readSimulationDetail(simulationId, failures);
  }
  return detail;
}

async function simulationAction(simulationId: string, action: "fast-forward" | "reply" | "purchase", body: JsonRecord, failures: string[]) {
  const result = await fetchEndpoint(`/api/simulations/${encodeURIComponent(simulationId)}/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (result.status !== 200) {
    failures.push(`/api/simulations/:id/${action}: expected HTTP 200, got ${result.status} - ${trim(result.text)}`);
    return null;
  }
  if (!isRecord(result.body)) {
    failures.push(`/api/simulations/:id/${action}: expected simulation detail object`);
    return null;
  }
  return result.body;
}

async function readSimulationDetail(simulationId: string, failures: string[]) {
  const result = await fetchEndpoint(`/api/simulations/${encodeURIComponent(simulationId)}`);
  if (result.status !== 200) {
    failures.push(`/api/simulations/:id: expected HTTP 200, got ${result.status} - ${trim(result.text)}`);
    return null;
  }
  return isRecord(result.body) ? result.body : null;
}

function summarizeSimulationDetail(detail: JsonRecord) {
  const simulation = isRecord(detail.simulation) ? detail.simulation : {};
  const conversation = isRecord(detail.conversation) ? detail.conversation : {};
  const outbound = arrayOfObjects(detail.outboundMessages);
  const history = arrayOfObjects(detail.history);
  const variables = isRecord(conversation.variables) ? conversation.variables : {};
  const outcomes = history
    .map((item) => isRecord(item.payload) ? stringValue(item.payload.outcome_key) : "")
    .filter(Boolean);
  return {
    simulationStatus: stringValue(simulation.status),
    conversationStatus: stringValue(conversation.status),
    waitingReason: normalizeWaitingReason(stringValue(conversation.waiting_reason)),
    queueLikeOutboundCount: outbound.filter((message) => stringValue(message.status) === "pending_approval" || stringValue(message.approval_status) === "pending").length,
    outboundSummary: outbound.map((message) => `${stringValue(message.status)}/${stringValue(message.approval_status)}`).join(",") || "none",
    timeline: history.map((item) => stringValue(item.event_type)).join(" > "),
    outcomeSummary: outcomes.join(",") || "none",
    variableSummary: [
      `ai_confidence=${String(variables.ai_confidence ?? "")}`,
      `response_class=${String(variables.response_class ?? "")}`,
      `next_response_class=${String(variables.next_response_class ?? "")}`,
      `purchase_status=${String(variables.purchase_status ?? "")}`,
      `last_purchase=${String(variables.last_purchase ?? "")}`,
      `total_spend=${String(variables.total_spend ?? "")}`,
      `conversation_summary=${String(variables.conversation_summary ?? variables.last_reply_text ?? "")}`
    ].join(" ")
  };
}

function normalizeWaitingReason(value: string) {
  if (value.startsWith("purchase:")) return "purchase_check";
  if (value.startsWith("approval:")) return "approval";
  if (value.startsWith("reply:")) return "reply";
  if (value === "reply_timeout") return "reply";
  if (value.startsWith("delay:")) return "delay";
  return value;
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
