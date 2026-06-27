import {
  BetterFansOperationalClient,
  normalizeChats,
  normalizeCreatorProfile,
  normalizeCreatorSnapshot,
  normalizeSubscribers
} from "@funkmyfans/betterfans-client";
import { calculateRelationshipIntelligence, calculateSubscriberAgencyIntelligence, buildDailyFocusQueue, buildMorningBrief, calculateTaskPriority, generateTaskDrafts, type TaskRuleDraft } from "@funkmyfans/of-rules-engine";
import type {
  ConversationIntent,
  ConversationSentiment,
  MessageScriptActionMode,
  MessageScriptTemplate,
  OfMessageScriptStep,
  ScriptStepTemplate,
  SyncType
} from "@funkmyfans/of-types";
import { summarizeEventType } from "@funkmyfans/of-types";
import { createClient } from "@supabase/supabase-js";

interface Env {
  ASSETS: Fetcher;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  BETTERFANS_API_KEY: string;
  BETTERFANS_BASE_URL?: string;
  BETTERFANS_EVENTS_SHARED_SECRET?: string;
  DEFAULT_BETTERFANS_ACCOUNT_ID?: string;
}

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

type SupabaseClient = ReturnType<typeof createServiceClient>;
type AutomationActionResult = "task_created" | "draft_created" | "sent" | "failed" | "skipped";
interface EventActionContext {
  subscriberId: string | null;
  chatId: string | null;
  relationshipId: string | null;
}

interface ConversationMessage {
  eventId: string | null;
  text: string;
  actor: "subscriber" | "creator";
  occurredAt: string;
  payload: Record<string, unknown>;
}

interface MessageClassificationDraft {
  primary_intent: ConversationIntent;
  confidence: number;
  evidence: Array<{ label: string; value: string }>;
}

interface ConversationIntelligenceDraft {
  rolling_summary: string;
  conversation_sentiment: ConversationSentiment;
  conversation_stage: string;
  relationship_temperature: string;
  engagement_trend: string;
  last_meaningful_message_at: string | null;
  unresolved_topics: string[];
  promises_made: string[];
  important_facts: string[];
  current_intent: ConversationIntent | null;
  current_intent_confidence: number | null;
  current_intent_evidence: Array<{ label: string; value: string }>;
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
  recommended_next_action: string;
  suggested_script: string;
  confidence: number;
  metadata: Record<string, unknown>;
}

interface ConversationIntelligenceProvider {
  name: string;
  classifyMessage(message: ConversationMessage, relationship: Record<string, unknown>): MessageClassificationDraft;
  summarize(input: {
    relationship: Record<string, unknown>;
    messages: ConversationMessage[];
    classifications: MessageClassificationDraft[];
    previous: Record<string, unknown> | null;
  }): ConversationIntelligenceDraft;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (error) {
        return Response.json(
          { error: error instanceof Error ? error.message : "Unexpected Cockpit API error" },
          { status: 500, headers: jsonHeaders }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const supabase = createServiceClient(env);
if (request.method === "GET" && url.pathname === "/api/dashboard") {
  const [creators, snapshots, tasks, events, syncRuns, relationships, contextEvents] = await Promise.all([
    supabase.from("of_creators").select("*").order("created_at", { ascending: false }),
    supabase.from("of_creator_snapshots").select("*").order("snapshot_date", { ascending: false }).limit(30),
    supabase
      .from("of_tasks")
      .select("*, of_creators(username, display_name), of_task_timeline(*)")
      .not("status", "in", "(completed,cancelled,ignored,archived)")
      .order("priority_score", { ascending: false })
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("of_events").select("*").order("created_at", { ascending: false }).limit(20),
    supabase.from("of_sync_runs").select("*").order("started_at", { ascending: false }).limit(20),
    supabase.from("of_subscriber_relationships").select("*, of_relationship_summaries(*), of_conversation_intelligence(*)").order("updated_at", { ascending: false }).limit(50),
    supabase.from("of_context_events").select("*").order("emitted_at", { ascending: false }).limit(50)
  ]);

  assertNoError(creators.error);
  assertNoError(snapshots.error);
  assertNoError(tasks.error);
  assertNoError(events.error);
  assertNoError(syncRuns.error);
  assertNoError(relationships.error);
  assertNoError(contextEvents.error);

  return Response.json(
    {
      creators: creators.data ?? [],
      snapshots: snapshots.data ?? [],
      tasks: tasks.data ?? [],
      events: events.data ?? [],
      syncRuns: syncRuns.data ?? [],
      relationships: relationships.data ?? [],
      contextEvents: contextEvents.data ?? [],
      dailyFocusQueue: buildDailyFocusQueue({ subscribers: relationships.data ?? [] }),
      morningBrief: buildMorningBrief({ subscribers: relationships.data ?? [] })
    },
    { headers: jsonHeaders }
  );
}  


  if (request.method === "GET" && url.pathname === "/api/creators") {
    const result = await supabase
      .from("of_creators")
      .select("*, of_creator_snapshots(*), of_tasks(*)")
      .order("created_at", { ascending: false });
    assertNoError(result.error);
    return Response.json({ creators: result.data ?? [] }, { headers: jsonHeaders });
  }

  const creatorMatch = url.pathname.match(/^\/api\/creators\/([^/]+)$/);
  if (request.method === "GET" && creatorMatch) {
    const creatorId = creatorMatch[1];
    const [creator, snapshots, subscribers, chats, tasks, recommendations, events, syncRuns, relationships, relationshipTimeline, contextEvents] = await Promise.all([
      supabase.from("of_creators").select("*").eq("id", creatorId).single(),
      supabase.from("of_creator_snapshots").select("*").eq("creator_id", creatorId).order("created_at", { ascending: false }).limit(14),
      supabase.from("of_subscribers").select("*").eq("creator_id", creatorId).order("last_sync_at", { ascending: false }).limit(100),
      supabase.from("of_chats").select("*").eq("creator_id", creatorId).order("last_activity_at", { ascending: false, nullsFirst: false }).limit(100),
      supabase.from("of_tasks").select("*, of_task_timeline(*)").eq("creator_id", creatorId).order("priority_score", { ascending: false }),
      supabase.from("of_recommendations").select("*").eq("creator_id", creatorId).order("created_at", { ascending: false }),
      supabase.from("of_events").select("*").eq("creator_id", creatorId).order("created_at", { ascending: false }).limit(100),
      supabase.from("of_sync_runs").select("*").eq("creator_id", creatorId).order("started_at", { ascending: false }).limit(100),
      supabase.from("of_subscriber_relationships").select("*, of_relationship_summaries(*), of_conversation_intelligence(*)").eq("creator_id", creatorId).order("updated_at", { ascending: false }).limit(100),
      supabase.from("of_relationship_timeline").select("*").eq("creator_id", creatorId).order("occurred_at", { ascending: false }).limit(200),
      supabase.from("of_context_events").select("*").eq("creator_id", creatorId).order("emitted_at", { ascending: false }).limit(100)
    ]);
    assertNoError(creator.error);
    assertNoError(snapshots.error);
    assertNoError(subscribers.error);
    assertNoError(chats.error);
    assertNoError(tasks.error);
    assertNoError(recommendations.error);
    assertNoError(events.error);
    assertNoError(syncRuns.error);
    assertNoError(relationships.error);
    assertNoError(relationshipTimeline.error);
    assertNoError(contextEvents.error);
    return Response.json(
      {
        creator: creator.data,
        snapshots: snapshots.data ?? [],
        subscribers: subscribers.data ?? [],
        chats: chats.data ?? [],
        tasks: tasks.data ?? [],
        recommendations: recommendations.data ?? [],
        events: events.data ?? [],
        syncRuns: syncRuns.data ?? [],
        relationships: relationships.data ?? [],
        relationshipTimeline: relationshipTimeline.data ?? [],
        contextEvents: contextEvents.data ?? []
      },
      { headers: jsonHeaders }
    );
  }

  if (request.method === "GET" && url.pathname === "/api/events") {
    const result = await supabase
      .from("of_events")
      .select("*, of_creators(username, display_name)")
      .order("received_at", { ascending: false })
      .limit(100);
    assertNoError(result.error);
    return Response.json({ events: result.data ?? [] }, { headers: jsonHeaders });
  }

  if (request.method === "GET" && url.pathname === "/api/tasks") {
    const result = await listTasks(supabase, url);
    return Response.json({ tasks: result }, { headers: jsonHeaders });
  }

  if (request.method === "GET" && url.pathname === "/api/subscribers") {
    const result = await listSubscribers(supabase, url);
    return Response.json(result, { headers: jsonHeaders });
  }

  if (request.method === "POST" && url.pathname === "/api/subscribers/score-all") {
    const summary = await recalculateAllRelationshipScores(supabase);
    return Response.json(summary, { headers: jsonHeaders });
  }

  if (request.method === "POST" && url.pathname === "/api/subscribers/recalculate-all") {
    const summary = await recalculateAllSubscriberIntelligence(supabase);
    return Response.json(summary, { headers: jsonHeaders });
  }

  const subscriberIntelligenceMatch = url.pathname.match(/^\/api\/subscribers\/([^/]+)\/intelligence$/);
  if (request.method === "GET" && subscriberIntelligenceMatch) {
    const intelligence = await getSubscriberIntelligence(supabase, subscriberIntelligenceMatch[1]);
    return Response.json({ intelligence }, { headers: jsonHeaders });
  }

  const subscriberRecalculateMatch = url.pathname.match(/^\/api\/subscribers\/([^/]+)\/recalculate$/);
  if (request.method === "POST" && subscriberRecalculateMatch) {
    const intelligence = await recalculateSubscriberIntelligence(supabase, subscriberRecalculateMatch[1]);
    return Response.json({ intelligence }, { headers: jsonHeaders });
  }

  const subscriberScoreMatch = url.pathname.match(/^\/api\/subscribers\/([^/]+)\/score$/);
  if (request.method === "POST" && subscriberScoreMatch) {
    const subscriber = await recalculateSubscriberRelationshipScore(supabase, subscriberScoreMatch[1]);
    return Response.json({ subscriber }, { headers: jsonHeaders });
  }

  const subscriberMatch = url.pathname.match(/^\/api\/subscribers\/([^/]+)$/);
  if (request.method === "GET" && subscriberMatch) {
    const result = await getSubscriberDetail(supabase, subscriberMatch[1]);
    return Response.json(result, { headers: jsonHeaders });
  }

  if (request.method === "PATCH" && subscriberMatch) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const subscriber = await updateSubscriberWorkspace(supabase, subscriberMatch[1], body);
    return Response.json({ subscriber }, { headers: jsonHeaders });
  }

  const subscriberTimelineMatch = url.pathname.match(/^\/api\/subscribers\/([^/]+)\/timeline$/);
  if (request.method === "GET" && subscriberTimelineMatch) {
    const detail = await getSubscriberDetail(supabase, subscriberTimelineMatch[1]);
    return Response.json({ timeline: detail.timeline }, { headers: jsonHeaders });
  }

  const subscriberTasksMatch = url.pathname.match(/^\/api\/subscribers\/([^/]+)\/tasks$/);
  if (request.method === "POST" && subscriberTasksMatch) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const task = await createSubscriberManualTask(supabase, subscriberTasksMatch[1], body);
    return Response.json({ task }, { status: 201, headers: jsonHeaders });
  }

  const creatorTasksMatch = url.pathname.match(/^\/api\/creators\/([^/]+)\/tasks$/);
  if (request.method === "GET" && creatorTasksMatch) {
    const tasks = await listCreatorTasks(supabase, creatorTasksMatch[1]);
    return Response.json({ tasks }, { headers: jsonHeaders });
  }

  if (request.method === "POST" && creatorTasksMatch) {
    const summary = await generateCreatorTasks(supabase, creatorTasksMatch[1]);
    return Response.json(summary, { headers: jsonHeaders });
  }

  const generateTasksMatch = url.pathname.match(/^\/api\/creators\/([^/]+)\/tasks\/generate$/);
  if (request.method === "POST" && generateTasksMatch) {
    const summary = await generateCreatorTasks(supabase, generateTasksMatch[1]);
    return Response.json(summary, { headers: jsonHeaders });
  }

  const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (request.method === "PATCH" && taskMatch) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const task = await updateTask(supabase, taskMatch[1], body);
    return Response.json({ task }, { headers: jsonHeaders });
  }

  const creatorScriptsMatch = url.pathname.match(/^\/api\/creators\/([^/]+)\/scripts$/);
  if (request.method === "GET" && creatorScriptsMatch) {
    const scripts = await listCreatorScripts(supabase, creatorScriptsMatch[1]);
    return Response.json({ scripts }, { headers: jsonHeaders });
  }

  if (request.method === "POST" && creatorScriptsMatch) {
    const body = (await request.json().catch(() => ({}))) as Partial<MessageScriptTemplate>;
    const script = await createMessageScript(supabase, creatorScriptsMatch[1], body);
    return Response.json({ script }, { status: 201, headers: jsonHeaders });
  }

  const scriptMatch = url.pathname.match(/^\/api\/scripts\/([^/]+)$/);
  if (request.method === "PATCH" && scriptMatch) {
    if (!isUuid(scriptMatch[1])) {
      return Response.json({ error: "Script id must be a database UUID" }, { status: 400, headers: jsonHeaders });
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const script = await updateMessageScript(supabase, scriptMatch[1], body);
    return Response.json({ script }, { headers: jsonHeaders });
  }

  const scriptStepsMatch = url.pathname.match(/^\/api\/scripts\/([^/]+)\/steps$/);
  if (request.method === "POST" && scriptStepsMatch) {
    if (!isUuid(scriptStepsMatch[1])) {
      return Response.json({ error: "Script id must be a database UUID" }, { status: 400, headers: jsonHeaders });
    }
    const body = (await request.json().catch(() => ({}))) as Partial<ScriptStepTemplate>;
    const step = await createScriptStep(supabase, scriptStepsMatch[1], body);
    return Response.json({ step }, { status: 201, headers: jsonHeaders });
  }

  const scriptStepMatch = url.pathname.match(/^\/api\/script-steps\/([^/]+)$/);
  if (request.method === "PATCH" && scriptStepMatch) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const step = await updateScriptStep(supabase, scriptStepMatch[1], body);
    return Response.json({ step }, { headers: jsonHeaders });
  }

  if (request.method === "DELETE" && scriptStepMatch) {
    const result = await supabase.from("of_message_script_steps").delete().eq("id", scriptStepMatch[1]);
    assertNoError(result.error);
    return Response.json({ ok: true }, { headers: jsonHeaders });
  }

  const eventAutomationMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/run-automations$/);
  if (request.method === "POST" && eventAutomationMatch) {
    if (!isUuid(eventAutomationMatch[1])) {
      return Response.json({ error: "Event id must be a database UUID" }, { status: 400, headers: jsonHeaders });
    }
    const summary = await runAutomationsForEvent(supabase, env, eventAutomationMatch[1]);
    return Response.json(summary, { headers: jsonHeaders });
  }

  const creatorAutomationRunsMatch = url.pathname.match(/^\/api\/creators\/([^/]+)\/automation-runs$/);
  if (request.method === "GET" && creatorAutomationRunsMatch) {
    const runs = await listCreatorAutomationRuns(supabase, creatorAutomationRunsMatch[1]);
    return Response.json({ runs }, { headers: jsonHeaders });
  }

  if (request.method === "GET" && url.pathname === "/api/outbound-messages") {
    const result = await supabase
      .from("of_outbound_messages")
      .select("*, of_creators(username, display_name), of_message_scripts(name)")
      .order("created_at", { ascending: false })
      .limit(200);
    assertNoError(result.error);
    return Response.json({ messages: result.data ?? [] }, { headers: jsonHeaders });
  }

  const outboundMessageMatch = url.pathname.match(/^\/api\/outbound-messages\/([^/]+)$/);
  if (request.method === "PATCH" && outboundMessageMatch) {
    if (!isUuid(outboundMessageMatch[1])) {
      return Response.json({ error: "Outbound message id must be a database UUID" }, { status: 400, headers: jsonHeaders });
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const message = await updateOutboundMessage(supabase, env, outboundMessageMatch[1], body);
    return Response.json({ message }, { headers: jsonHeaders });
  }

  if (request.method === "GET" && url.pathname === "/api/events/stream/status") {
    return Response.json(eventStreamStatus(), { headers: jsonHeaders });
  }

  if (request.method === "POST" && (url.pathname === "/api/events/stream/connect" || url.pathname === "/api/events/stream/disconnect")) {
    return Response.json(eventStreamStatus(), { status: 202, headers: jsonHeaders });
  }

  if (request.method === "POST" && url.pathname === "/api/events/betterfans") {
    if (!isAuthorizedEventIngest(request, env)) {
      return Response.json({ ok: false, error: "Unauthorized event ingest request" }, { status: 401, headers: jsonHeaders });
    }

    const rawPayload = await request.json().catch(() => null);
    const result = await ingestBetterFansEvent(supabase, rawPayload);
    if (result.ok && !result.deduped && result.event?.id) {
      const automations = await runAutomationsForEvent(supabase, env, result.event.id as string);
      return Response.json({ ...result, automations }, { status: 200, headers: jsonHeaders });
    }
    return Response.json(result, { status: result.ok ? 200 : result.statusCode, headers: jsonHeaders });
  }

  const syncMatch = url.pathname.match(/^\/api\/creators\/([^/]+)\/sync\/(profile|stats|subscribers|chats|all)$/);
  if (request.method === "POST" && syncMatch) {
    const creatorId = syncMatch[1];
    const syncType = syncMatch[2] as SyncType;
    const summary = await runAuditedSync(supabase, env, creatorId, syncType);
    return Response.json(summary, { status: summary.status === "failed" ? 500 : 200, headers: jsonHeaders });
  }

  if (request.method === "POST" && url.pathname === "/api/sync") {
    const body = (await request.json().catch(() => ({}))) as { accountId?: string };
    const accountId = body.accountId || env.DEFAULT_BETTERFANS_ACCOUNT_ID;
    if (!accountId) {
      return Response.json({ error: "accountId is required" }, { status: 400, headers: jsonHeaders });
    }

    const client = new BetterFansOperationalClient({
      apiKey: env.BETTERFANS_API_KEY,
      baseUrl: env.BETTERFANS_BASE_URL || undefined
    });
    const profile = await client.getCreatorProfile(accountId);
    const creatorId = await persistCreatorProfile(supabase, accountId, profile);
    return Response.json({ creatorId, syncedAt: new Date().toISOString() }, { headers: jsonHeaders });
  }

  return Response.json({ error: "Not found" }, { status: 404, headers: jsonHeaders });
}

function createServiceClient(env: Env) {
  console.log("SUPABASE_URL:", env.SUPABASE_URL);

  console.log(
    "SERVICE_ROLE_PREFIX:",
    env.SUPABASE_SERVICE_ROLE_KEY
      ? env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)
      : "MISSING"
  );

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase service configuration is missing");
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

async function listTasks(supabase: SupabaseClient, url: URL) {
  let query = supabase
    .from("of_tasks")
    .select("*, of_creators(username, display_name), of_task_timeline(*)")
    .order("priority_score", { ascending: false })
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const creator = url.searchParams.get("creator");
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const taskType = url.searchParams.get("task_type");

  if (creator && creator !== "all") query = query.eq("creator_id", creator);
  if (status && status !== "all") query = query.eq("status", status);
  if (priority && priority !== "all") query = query.eq("priority", priority);
  if (taskType && taskType !== "all") query = query.eq("task_type", taskType);

  const result = await query;
  assertNoError(result.error);
  return result.data ?? [];
}

async function listCreatorTasks(supabase: SupabaseClient, creatorId: string) {
  const result = await supabase
    .from("of_tasks")
    .select("*, of_task_timeline(*)")
    .eq("creator_id", creatorId)
    .order("priority_score", { ascending: false });
  assertNoError(result.error);
  return result.data ?? [];
}

async function listSubscribers(supabase: SupabaseClient, url: URL) {
  let query = supabase
    .from("of_subscriber_relationships")
    .select("*, of_relationship_summaries(*), of_conversation_intelligence(*), of_creators(username, display_name)")
    .limit(500);

  const creator = url.searchParams.get("creator");
  const subscription = url.searchParams.get("subscription");
  const stage = url.searchParams.get("stage");
  const persona = url.searchParams.get("persona");
  const opportunity = url.searchParams.get("opportunity");
  const journey = url.searchParams.get("journey");
  const vip = url.searchParams.get("vip");
  const churn = url.searchParams.get("churn");
  const sort = url.searchParams.get("sort") ?? "relationship_score";

  if (creator && creator !== "all") query = query.eq("creator_id", creator);
  if (subscription === "active") query = query.not("current_subscription_status", "in", "(expired,cancelled,canceled,inactive)");
  if (subscription === "expired") query = query.in("current_subscription_status", ["expired", "cancelled", "canceled", "inactive"]);
  if (stage && stage !== "all") query = query.eq("relationship_state", stage);
  if (persona && persona !== "all") query = query.eq("persona_key", persona);
  if (opportunity && opportunity !== "all") query = query.eq("opportunity_classification", opportunity);
  if (journey && journey !== "all") query = query.eq("journey_stage", journey);
  if (vip === "true") query = query.gte("vip_score", 75);
  if (churn === "true") query = query.gte("churn_risk", 70);

  if (sort === "lifetime_spend") query = query.order("lifetime_spend", { ascending: false });
  else if (sort === "newest") query = query.order("first_seen_at", { ascending: false });
  else if (sort === "last_seen") query = query.order("last_seen_at", { ascending: false, nullsFirst: false });
  else query = query.order("relationship_score", { ascending: false });

  const [subscribers, creators, tasks] = await Promise.all([
    query,
    supabase.from("of_creators").select("*").order("created_at", { ascending: false }),
    supabase
      .from("of_tasks")
      .select("*, of_creators(username, display_name), of_task_timeline(*)")
      .in("status", ["open", "in_progress", "waiting"])
      .limit(1000)
  ]);
  assertNoError(subscribers.error);
  assertNoError(creators.error);
  assertNoError(tasks.error);

  let rows = subscribers.data ?? [];
  if (url.searchParams.get("hasOpenTasks") === "true") {
    const idsWithTasks = new Set((tasks.data ?? []).map((task) => String(task.source_id)).filter(Boolean));
    const subscriberIdsWithTasks = new Set((tasks.data ?? []).map((task) => String(task.subscriber_id)).filter(Boolean));
    rows = rows.filter((subscriber) => idsWithTasks.has(String(subscriber.id)) || subscriberIdsWithTasks.has(String(subscriber.subscriber_id)));
  }
  if (sort === "open_tasks") {
    rows = [...rows].sort((a, b) => subscriberTaskCount(b, tasks.data ?? []) - subscriberTaskCount(a, tasks.data ?? []));
  }

  return {
    creators: creators.data ?? [],
    subscribers: rows,
    tasks: tasks.data ?? []
  };
}

async function getSubscriberDetail(supabase: SupabaseClient, subscriberId: string) {
  if (!isUuid(subscriberId)) throw new Error("Subscriber id must be a database UUID");
  const subscriber = await supabase
    .from("of_subscriber_relationships")
    .select("*, of_relationship_summaries(*), of_conversation_intelligence(*), of_creators(username, display_name)")
    .eq("id", subscriberId)
    .single();
  assertNoError(subscriber.error);
  if (!subscriber.data) throw new Error("Subscriber relationship not found");

  const tasks = await listSubscriberTasks(supabase, subscriber.data);
  const [creator, relationshipTimeline, events] = await Promise.all([
    supabase.from("of_creators").select("*").eq("id", subscriber.data.creator_id).single(),
    supabase.from("of_relationship_timeline").select("*").eq("relationship_id", subscriberId).order("occurred_at", { ascending: false }).limit(100),
    subscriber.data.last_event_id
      ? supabase.from("of_events").select("*").eq("id", subscriber.data.last_event_id).limit(20)
      : Promise.resolve({ data: [], error: null })
  ]);
  assertNoError(creator.error);
  assertNoError(relationshipTimeline.error);
  assertNoError(events.error);

  return {
    subscriber: subscriber.data,
    creator: creator.data ?? null,
    tasks,
    events: events.data ?? [],
    intelligence: firstRelatedRecord(subscriber.data.of_conversation_intelligence),
    timeline: buildSubscriberTimeline(subscriber.data, tasks, relationshipTimeline.data ?? [], events.data ?? [])
  };
}

async function listSubscriberTasks(supabase: SupabaseClient, subscriber: Record<string, unknown>) {
  const [sourceTasks, subscriberTasks] = await Promise.all([
    supabase
      .from("of_tasks")
      .select("*, of_creators(username, display_name), of_task_timeline(*)")
      .eq("creator_id", subscriber.creator_id)
      .eq("source_type", "subscriber")
      .eq("source_id", subscriber.id)
      .limit(200),
    supabase
      .from("of_tasks")
      .select("*, of_creators(username, display_name), of_task_timeline(*)")
      .eq("creator_id", subscriber.creator_id)
      .eq("subscriber_id", subscriber.subscriber_id)
      .limit(200)
  ]);
  assertNoError(sourceTasks.error);
  assertNoError(subscriberTasks.error);

  const byId = new Map<string, Record<string, unknown>>();
  for (const task of [...(sourceTasks.data ?? []), ...(subscriberTasks.data ?? [])]) {
    byId.set(String(task.id), task);
  }
  return [...byId.values()].sort((a, b) => {
    const score = Number(b.priority_score ?? 0) - Number(a.priority_score ?? 0);
    if (score !== 0) return score;
    return new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime();
  });
}

async function updateSubscriberWorkspace(supabase: SupabaseClient, subscriberId: string, body: Record<string, unknown>) {
  if (!isUuid(subscriberId)) throw new Error("Subscriber id must be a database UUID");
  const patch: Record<string, unknown> = {};
  if ("automation_paused" in body) patch.automation_paused = Boolean(body.automation_paused);
  if ("human_takeover" in body) patch.human_takeover = Boolean(body.human_takeover);
  if ("auto_send_enabled" in body) patch.auto_send_enabled = Boolean(body.auto_send_enabled);
  if ("current_workflow" in body) patch.current_workflow = typeof body.current_workflow === "string" && body.current_workflow.trim() ? body.current_workflow.trim() : null;
  if (!Object.keys(patch).length) throw new Error("No subscriber workspace fields to update");

  const result = await supabase
    .from("of_subscriber_relationships")
    .update(patch)
    .eq("id", subscriberId)
    .select("*, of_relationship_summaries(*), of_conversation_intelligence(*), of_creators(username, display_name)")
    .single();
  assertNoError(result.error);
  return result.data;
}

async function createSubscriberManualTask(supabase: SupabaseClient, subscriberId: string, body: Record<string, unknown>) {
  const detail = await getSubscriberDetail(supabase, subscriberId);
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Manual subscriber follow-up";
  const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : "Operator created a manual task from the subscriber workspace.";
  const dueAt = emptyToNull(body.dueAt ?? body.due_at);
  const recommendedAction = typeof body.recommendedAction === "string" && body.recommendedAction.trim() ? body.recommendedAction.trim() : "Review subscriber context and complete the task.";
  const priority = calculateTaskPriority(
    {
      status: "open",
      task_type: "manual_subscriber_task",
      rule_name: "operator.manual_subscriber_task",
      title,
      reason,
      description: reason,
      recommended_action: recommendedAction,
      suggested_action: "manual_follow_up",
      due_at: dueAt
    },
    detail.subscriber
  );

  const inserted = await supabase
    .from("of_tasks")
    .insert({
      creator_id: detail.subscriber.creator_id,
      source_type: "subscriber",
      source_id: null,
      subscriber_id: detail.subscriber.subscriber_id,
      task_type: "manual_subscriber_task",
      rule_name: "operator.manual_subscriber_task",
      rule_version: "OF-2.6",
      priority: priority.priority,
      priority_score: priority.score,
      priority_reason: priority.reason,
      status: "open",
      title,
      description: reason,
      reason,
      evidence: [{ label: "Created from", value: "Subscriber Workspace" }],
      confidence: 100,
      recommended_action: recommendedAction,
      suggested_action: "manual_follow_up",
      suggested_script: null,
      ai_suggestion: {},
      due_at: dueAt,
      resolution_note: null,
      execution_count: 1,
      last_triggered_at: new Date().toISOString(),
      next_eligible_at: new Date().toISOString(),
      source: "operator"
    })
    .select("*, of_creators(username, display_name), of_task_timeline(*)")
    .single();
  assertNoError(inserted.error);
  await recordTaskTimeline(supabase, inserted.data, "task_created", "Task Created", reason, "operator");
  return inserted.data;
}

async function getSubscriberIntelligence(
  supabase: SupabaseClient,
  relationshipId: string
): Promise<Record<string, unknown>> {
  if (!isUuid(relationshipId)) {
    throw new Error("Subscriber id must be a database UUID");
  }

  const intelligenceResult = await supabase
    .from("of_conversation_intelligence")
    .select("*")
    .eq("relationship_id", relationshipId)
    .maybeSingle();
  assertNoError(intelligenceResult.error);

  const classificationsResult = await supabase
    .from("of_message_classifications")
    .select("*")
    .eq("relationship_id", relationshipId)
    .order("created_at", { ascending: false })
    .limit(25);
  assertNoError(classificationsResult.error);

  const summaryVersionsResult = await supabase
    .from("of_conversation_summary_versions")
    .select("*")
    .eq("relationship_id", relationshipId)
    .order("created_at", { ascending: false })
    .limit(10);
  assertNoError(summaryVersionsResult.error);

  return {
    ...(intelligenceResult.data ?? {}),
    classifications: classificationsResult.data ?? [],
    summary_versions: summaryVersionsResult.data ?? []
  };
}
async function recalculateAllSubscriberIntelligence(supabase: SupabaseClient) {
  const relationships = await supabase
    .from("of_subscriber_relationships")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(500);
  assertNoError(relationships.error);

  const summary = { recalculated: 0, errors: [] as string[] };
  for (const relationship of relationships.data ?? []) {
    try {
      await recalculateSubscriberIntelligence(supabase, String(relationship.id));
      summary.recalculated++;
    } catch (error) {
      summary.errors.push(error instanceof Error ? error.message : "Unexpected intelligence recalculation error");
    }
  }
  return summary;
}

async function recalculateAllRelationshipScores(supabase: SupabaseClient, creatorId?: string) {
  let query = supabase
    .from("of_subscriber_relationships")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1000);
  if (creatorId) query = query.eq("creator_id", creatorId);
  const relationships = await query;
  assertNoError(relationships.error);

  const summary = { recalculated: 0, tasksUpdated: 0, errors: [] as string[] };
  for (const relationship of relationships.data ?? []) {
    try {
      const scored = await recalculateSubscriberRelationshipScore(supabase, String(relationship.id));
      summary.recalculated++;
      summary.tasksUpdated += Number(scored.tasksUpdated ?? 0);
    } catch (error) {
      summary.errors.push(error instanceof Error ? error.message : "Unexpected relationship score recalculation error");
    }
  }
  return summary;
}

async function recalculateSubscriberRelationshipScore(supabase: SupabaseClient, subscriberId: string): Promise<Record<string, unknown>> {
  if (!isUuid(subscriberId)) throw new Error("Subscriber id must be a database UUID");
  const relationship = await supabase
    .from("of_subscriber_relationships")
    .select("*, of_relationship_summaries(*), of_conversation_intelligence(*), of_creators(username, display_name)")
    .eq("id", subscriberId)
    .single();
  assertNoError(relationship.error);
  if (!relationship.data) throw new Error("Subscriber relationship not found");

  const [tasks, events] = await Promise.all([
    listSubscriberTasks(supabase, relationship.data),
    loadConversationEvents(supabase, relationship.data)
  ]);
  const intelligence = firstRelatedRecord(relationship.data.of_conversation_intelligence);
  const scores = calculateRelationshipIntelligence({
    relationship: relationship.data,
    tasks,
    events,
    intelligence
  });
  const intelligenceBundle = calculateSubscriberAgencyIntelligence({
    relationship: relationship.data,
    intelligence,
    relationshipScores: scores,
    now: new Date(),
    provider: "deterministic-v1"
  });
  const previousPersona = stringValue(relationship.data.persona_key);
  const previousOpportunity = stringValue(relationship.data.opportunity_classification);
  const previousJourney = stringValue(relationship.data.relationship_stage);
  const patch = {
    ...scores,
    persona_key: intelligenceBundle.persona.key,
    persona_name: intelligenceBundle.persona.name,
    persona_emoji: intelligenceBundle.persona.emoji,
    persona_color: intelligenceBundle.persona.color,
    persona_description: intelligenceBundle.persona.description,
    persona_strategy: intelligenceBundle.persona.recommended_strategy,
    persona_confidence: intelligenceBundle.persona.confidence,
    persona_reason: intelligenceBundle.persona.reason,
    opportunity_classification: intelligenceBundle.opportunity.key,
    opportunity_reason: intelligenceBundle.opportunity.reason,
    operator_briefing: `${intelligenceBundle.operator_briefing.headline}\n\n${intelligenceBundle.operator_briefing.summary}\n\nRecommended next action: ${intelligenceBundle.operator_briefing.recommended_next_action}\nExpected outcome: ${intelligenceBundle.operator_briefing.expected_outcome}\nEstimated revenue opportunity: ${intelligenceBundle.operator_briefing.estimated_revenue_opportunity}`,
    operator_briefing_provider: intelligenceBundle.provider,
    journey_stage: intelligenceBundle.journey_stage,
    journey_stage_reason: intelligenceBundle.journey_stage_reason,
    metadata: {
      ...(isRecord(relationship.data.metadata) ? relationship.data.metadata : {}),
      relationship_intelligence: {
        scored_at: new Date().toISOString(),
        engine: "deterministic-of-3.2",
        persona: intelligenceBundle.persona.key,
        opportunity: intelligenceBundle.opportunity.key,
        journey_stage: intelligenceBundle.journey_stage,
        briefing_provider: intelligenceBundle.provider
      }
    }
  };

  const updated = await supabase
    .from("of_subscriber_relationships")
    .update(patch)
    .eq("id", subscriberId)
    .select("*, of_relationship_summaries(*), of_conversation_intelligence(*), of_creators(username, display_name)")
    .single();
  assertNoError(updated.error);
  const changeRows: Record<string, unknown>[] = [];
  const changeOccurredAt = new Date().toISOString();
  if (previousPersona !== intelligenceBundle.persona.key) {
    changeRows.push({
      creator_id: updated.data.creator_id,
      subscriber_id: updated.data.subscriber_id,
      relationship_id: updated.data.id,
      timeline_type: "persona_change",
      title: "Persona changed",
      detail: `${previousPersona || "unknown"} -> ${intelligenceBundle.persona.key}`,
      actor: "ai",
      occurred_at: changeOccurredAt,
      metadata: {
        previous_persona: previousPersona || null,
        persona: intelligenceBundle.persona.key,
        reason: intelligenceBundle.persona.reason
      }
    });
  }
  if (previousOpportunity !== intelligenceBundle.opportunity.key) {
    changeRows.push({
      creator_id: updated.data.creator_id,
      subscriber_id: updated.data.subscriber_id,
      relationship_id: updated.data.id,
      timeline_type: "opportunity_change",
      title: "Opportunity changed",
      detail: `${previousOpportunity || "unknown"} -> ${intelligenceBundle.opportunity.key}`,
      actor: "ai",
      occurred_at: changeOccurredAt,
      metadata: {
        previous_opportunity: previousOpportunity || null,
        opportunity: intelligenceBundle.opportunity.key,
        reason: intelligenceBundle.opportunity.reason
      }
    });
  }
  if (previousJourney !== intelligenceBundle.journey_stage) {
    changeRows.push({
      creator_id: updated.data.creator_id,
      subscriber_id: updated.data.subscriber_id,
      relationship_id: updated.data.id,
      timeline_type: "journey_transition",
      title: "Journey stage changed",
      detail: `${previousJourney || "unknown"} -> ${intelligenceBundle.journey_stage}`,
      actor: "system",
      occurred_at: changeOccurredAt,
      metadata: {
        previous_stage: previousJourney || null,
        journey_stage: intelligenceBundle.journey_stage,
        reason: intelligenceBundle.journey_stage_reason
      }
    });
  }
  if (changeRows.length) {
    const timelineInsert = await supabase.from("of_relationship_timeline").insert(changeRows);
    assertNoError(timelineInsert.error);
  }
  const tasksUpdated = await updateRelatedTaskPriorities(supabase, updated.data, tasks);
  return { ...updated.data, tasksUpdated, intelligence_bundle: intelligenceBundle };
}

async function updateRelatedTaskPriorities(supabase: SupabaseClient, relationship: Record<string, unknown>, tasks: Record<string, unknown>[]) {
  let updated = 0;
  for (const task of tasks) {
    if (!isActiveTaskStatus(String(task.status ?? ""))) continue;
    const priority = calculateTaskPriority(task, relationship);
    if (Number(task.priority_score ?? 0) === priority.score && task.priority === priority.priority && task.priority_reason === priority.reason) continue;
    const result = await supabase
      .from("of_tasks")
      .update({
        priority: priority.priority,
        priority_score: priority.score,
        priority_reason: priority.reason
      })
      .eq("id", task.id);
    assertNoError(result.error);
    updated++;
  }
  return updated;
}

async function recalculateSubscriberIntelligence(supabase: SupabaseClient, subscriberId: string): Promise<Record<string, unknown>> {
  if (!isUuid(subscriberId)) throw new Error("Subscriber id must be a database UUID");
  const relationship = await supabase
    .from("of_subscriber_relationships")
    .select("*, of_conversation_intelligence(*)")
    .eq("id", subscriberId)
    .single();
  assertNoError(relationship.error);
  if (!relationship.data) throw new Error("Subscriber relationship not found");

  const previous = firstRelatedRecord(relationship.data.of_conversation_intelligence);
  const events = await loadConversationEvents(supabase, relationship.data);
  const messages = events.map(eventToConversationMessage).filter((message): message is ConversationMessage => Boolean(message));
  const provider = conversationIntelligenceProvider();
  const classifications = messages
    .filter((message) => message.actor === "subscriber")
    .map((message) => provider.classifyMessage(message, relationship.data));
  const draft = provider.summarize({ relationship: relationship.data, messages, classifications, previous });
  const sourceEventId = messages.find((message) => message.eventId)?.eventId ?? null;

  const upserted = await supabase
    .from("of_conversation_intelligence")
    .upsert({
      creator_id: relationship.data.creator_id,
      subscriber_id: relationship.data.subscriber_id,
      relationship_id: relationship.data.id,
      rolling_summary: draft.rolling_summary,
      last_summary_at: new Date().toISOString(),
      conversation_sentiment: draft.conversation_sentiment,
      conversation_stage: draft.conversation_stage,
      relationship_temperature: draft.relationship_temperature,
      engagement_trend: draft.engagement_trend,
      last_meaningful_message_at: draft.last_meaningful_message_at,
      unresolved_topics: draft.unresolved_topics,
      promises_made: draft.promises_made,
      important_facts: draft.important_facts,
      current_intent: draft.current_intent,
      current_intent_confidence: draft.current_intent_confidence,
      current_intent_evidence: draft.current_intent_evidence,
      sentiment_score: draft.sentiment_score,
      engagement_score: draft.engagement_score,
      likely_ppv_buyer: draft.likely_ppv_buyer,
      custom_buyer: draft.custom_buyer,
      tipper: draft.tipper,
      renewal_likelihood: draft.renewal_likelihood,
      churn_probability: draft.churn_probability,
      vip_potential: draft.vip_potential,
      whale_potential: draft.whale_potential,
      ai_briefing: draft.ai_briefing,
      recommended_next_action: draft.recommended_next_action,
      suggested_script: draft.suggested_script,
      confidence: draft.confidence,
      provider: provider.name,
      metadata: draft.metadata
    }, { onConflict: "relationship_id" })
    .select("*")
    .single();
  assertNoError(upserted.error);

  const previousVersion = await supabase
    .from("of_conversation_summary_versions")
    .select("summary_version")
    .eq("relationship_id", relationship.data.id)
    .order("summary_version", { ascending: false })
    .limit(1);
  assertNoError(previousVersion.error);
  const version = Number(previousVersion.data?.[0]?.summary_version ?? 0) + 1;
  const insertedVersion = await supabase.from("of_conversation_summary_versions").insert({
    creator_id: relationship.data.creator_id,
    subscriber_id: relationship.data.subscriber_id,
    relationship_id: relationship.data.id,
    rolling_summary: draft.rolling_summary,
    summary_version: version,
    provider: provider.name,
    source_event_id: sourceEventId
  });
  assertNoError(insertedVersion.error);

  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    if (message.actor !== "subscriber" || !message.eventId) continue;
    const classification = classifications.shift();
    if (!classification) continue;
    const insertedClassification = await supabase.from("of_message_classifications").upsert({
      creator_id: relationship.data.creator_id,
      subscriber_id: relationship.data.subscriber_id,
      relationship_id: relationship.data.id,
      source_event_id: message.eventId,
      message_text: message.text,
      primary_intent: classification.primary_intent,
      confidence: classification.confidence,
      evidence: classification.evidence,
      classified_by: provider.name,
      classified_at: message.occurredAt
    }, { onConflict: "source_event_id" });
    assertNoError(insertedClassification.error);
  }

  await recordIntelligenceTimeline(supabase, relationship.data, previous, draft, sourceEventId);
  await updateRelationshipFromIntelligence(supabase, relationship.data, draft);
  await recalculateSubscriberRelationshipScore(supabase, subscriberId);
  return getSubscriberIntelligence(supabase, subscriberId);
}

async function loadConversationEvents(supabase: SupabaseClient, relationship: Record<string, unknown>) {
  const result = await supabase
    .from("of_events")
    .select("*")
    .eq("creator_id", relationship.creator_id)
    .in("event_type", ["chat_message", "transaction_created", "subscriber_created", "subscriber_expired"])
    .order("received_at", { ascending: false, nullsFirst: false })
    .limit(150);
  assertNoError(result.error);
  const fanIds = new Set([
    String(relationship.betterfans_subscriber_id ?? ""),
    String(relationship.username ?? ""),
    String(relationship.subscriber_id ?? "")
  ].filter(Boolean));
  return (result.data ?? [])
    .filter((event) => {
      const payload = isRecord(event.payload) ? event.payload : {};
      const fanId = extractFanId(payload);
      return fanId ? fanIds.has(fanId) : false;
    })
    .reverse();
}

function eventToConversationMessage(event: Record<string, unknown>): ConversationMessage | null {
  if (event.event_type !== "chat_message") return null;
  const payload = isRecord(event.payload) ? event.payload : {};
  const text = extractMessageText(payload);
  if (!text) return null;
  const actor = extractMessageActor(payload);
  return {
    eventId: typeof event.id === "string" ? event.id : null,
    text,
    actor,
    occurredAt: String(event.received_at ?? event.created_at ?? new Date().toISOString()),
    payload
  };
}

function conversationIntelligenceProvider(): ConversationIntelligenceProvider {
  return heuristicConversationIntelligenceProvider;
}

const heuristicConversationIntelligenceProvider: ConversationIntelligenceProvider = {
  name: "heuristic-v1",
  classifyMessage(message) {
    const text = message.text.toLowerCase();
    const checks: Array<{ intent: ConversationIntent; confidence: number; terms: string[]; evidence: string }> = [
      { intent: "custom_request", confidence: 92, terms: ["custom", "special video", "make me", "can you do", "personalized"], evidence: "Asked for personalized or custom content." },
      { intent: "ppv_interest", confidence: 90, terms: ["ppv", "locked", "preview", "video", "bundle", "content"], evidence: "Mentioned purchasable media or PPV-style content." },
      { intent: "buying_signal", confidence: 88, terms: ["buy", "purchase", "send it", "how much", "price", "tip you", "pay"], evidence: "Used purchase-oriented language." },
      { intent: "price_objection", confidence: 86, terms: ["too expensive", "cheaper", "discount", "can't afford", "costs too much"], evidence: "Objected to price or asked for a discount." },
      { intent: "subscription_question", confidence: 84, terms: ["renew", "subscription", "rebill", "expire", "sub"], evidence: "Asked about subscription status or renewal." },
      { intent: "complaint", confidence: 84, terms: ["angry", "annoyed", "scam", "refund", "not happy", "disappointed"], evidence: "Used complaint or dissatisfaction language." },
      { intent: "support", confidence: 80, terms: ["help", "can't open", "problem", "issue", "not working"], evidence: "Asked for help with an issue." },
      { intent: "sexting", confidence: 80, terms: ["naughty", "dirty", "horny", "sexy", "turn me on"], evidence: "Used explicitly intimate language." },
      { intent: "flirting", confidence: 76, terms: ["beautiful", "gorgeous", "cute", "miss you", "babe", "kiss"], evidence: "Used flirtatious language." },
      { intent: "goodbye", confidence: 74, terms: ["bye", "goodbye", "talk later", "see you", "leaving"], evidence: "Signaled ending the conversation." },
      { intent: "greeting", confidence: 72, terms: ["hi", "hello", "hey", "good morning", "good night"], evidence: "Opened with a greeting." }
    ];
    const match = checks.find((check) => check.terms.some((term) => text.includes(term)));
    if (match) {
      return {
        primary_intent: match.intent,
        confidence: match.confidence,
        evidence: [{ label: "Message evidence", value: match.evidence }]
      };
    }
    return {
      primary_intent: "casual_chat",
      confidence: 58,
      evidence: [{ label: "Message evidence", value: "No stronger commercial, support, or objection signal detected." }]
    };
  },
  summarize({ relationship, messages, classifications, previous }) {
    const subscriberMessages = messages.filter((message) => message.actor === "subscriber");
    const latestClassification = classifications.at(-1) ?? null;
    const meaningful = subscriberMessages.filter((message) => message.text.trim().length >= 4);
    const text = subscriberMessages.map((message) => message.text).join(" \n ").toLowerCase();
    const lifetimeSpend = Number(relationship.lifetime_spend ?? 0);
    const purchaseCount = Number(relationship.purchase_count ?? 0);
    const relationshipEngagement = Number(relationship.engagement_score ?? 0);
    const relationshipVip = Number(relationship.vip_score ?? 0);
    const relationshipChurn = Number(relationship.churn_risk ?? 0);
    const sentimentScore = scoreSentiment(text, meaningful.length);
    const engagementScore = clampScore(relationshipEngagement * 0.55 + Math.min(100, meaningful.length * 10) * 0.45);
    const ppvIntent = classifications.some((item) => item.primary_intent === "ppv_interest" || item.primary_intent === "buying_signal");
    const customIntent = classifications.some((item) => item.primary_intent === "custom_request");
    const objection = classifications.some((item) => item.primary_intent === "price_objection" || item.primary_intent === "complaint");
    const likelyPpvBuyer = clampScore((ppvIntent ? 52 : 10) + purchaseCount * 8 + lifetimeSpend / 12 + engagementScore / 4 - (objection ? 15 : 0));
    const customBuyer = clampScore((customIntent ? 58 : 8) + Number(relationship.customs_purchased ?? 0) / 8 + engagementScore / 5);
    const tipper = clampScore(Number(relationship.tips ?? 0) / 8 + purchaseCount * 6 + (text.includes("tip") ? 32 : 0));
    const renewalLikelihood = clampScore(70 - relationshipChurn * 0.45 + engagementScore * 0.35 + (lifetimeSpend > 0 ? 8 : 0));
    const churnProbability = clampScore(relationshipChurn * 0.65 + (sentimentScore < 40 ? 18 : 0) + (engagementScore < 25 ? 15 : 0) + (objection ? 12 : 0));
    const vipPotential = clampScore(relationshipVip * 0.5 + lifetimeSpend / 10 + likelyPpvBuyer * 0.2 + customBuyer * 0.15 + tipper * 0.15);
    const whalePotential = clampScore(lifetimeSpend / 18 + purchaseCount * 7 + likelyPpvBuyer * 0.25 + customBuyer * 0.2 + tipper * 0.15);
    const sentiment = sentimentLabel(sentimentScore, engagementScore, text);
    const temperature = engagementScore >= 70 || likelyPpvBuyer >= 75 ? "hot" : engagementScore >= 40 || likelyPpvBuyer >= 45 ? "warm" : "cold";
    const stage = latestClassification?.primary_intent ? labelForIntent(latestClassification.primary_intent) : String(relationship.relationship_stage ?? "unknown");
    const trend = engagementScore > Number(previous?.engagement_score ?? relationshipEngagement) + 8 ? "rising" : engagementScore < Number(previous?.engagement_score ?? relationshipEngagement) - 8 ? "declining" : "steady";
    const facts = extractImportantFacts(subscriberMessages);
    const unresolved = extractTopics(text, ["custom", "price", "renewal", "video", "bundle", "help", "refund"]);
    const promises = extractPromises(messages);
    const rollingSummary = buildRollingSummary(relationship, subscriberMessages, latestClassification, facts, likelyPpvBuyer, renewalLikelihood, churnProbability);
    const recommended = recommendationFromScores(latestClassification?.primary_intent ?? null, likelyPpvBuyer, customBuyer, churnProbability, renewalLikelihood);
    const script = suggestedScriptFromIntent(latestClassification?.primary_intent ?? null, likelyPpvBuyer, customBuyer, churnProbability, renewalLikelihood);

    return {
      rolling_summary: rollingSummary,
      conversation_sentiment: sentiment,
      conversation_stage: stage,
      relationship_temperature: temperature,
      engagement_trend: trend,
      last_meaningful_message_at: meaningful.at(-1)?.occurredAt ?? null,
      unresolved_topics: unresolved,
      promises_made: promises,
      important_facts: facts,
      current_intent: latestClassification?.primary_intent ?? null,
      current_intent_confidence: latestClassification?.confidence ?? null,
      current_intent_evidence: latestClassification?.evidence ?? [],
      sentiment_score: sentimentScore,
      engagement_score: engagementScore,
      likely_ppv_buyer: likelyPpvBuyer,
      custom_buyer: customBuyer,
      tipper,
      renewal_likelihood: renewalLikelihood,
      churn_probability: churnProbability,
      vip_potential: vipPotential,
      whale_potential: whalePotential,
      ai_briefing: buildAiBriefing(relationship, rollingSummary, likelyPpvBuyer, renewalLikelihood, churnProbability, recommended, script),
      recommended_next_action: recommended,
      suggested_script: script,
      confidence: clampScore(55 + Math.min(30, meaningful.length * 4) + (latestClassification ? 10 : 0)),
      metadata: {
        message_count: messages.length,
        subscriber_message_count: subscriberMessages.length,
        provider_notes: "Deterministic OF-3.0 heuristic provider. No autonomous replies generated."
      }
    };
  }
};

async function recordIntelligenceTimeline(
  supabase: SupabaseClient,
  relationship: Record<string, unknown>,
  previous: Record<string, unknown> | null,
  draft: ConversationIntelligenceDraft,
  sourceEventId: string | null
) {
  const base = {
    creator_id: relationship.creator_id,
    subscriber_id: relationship.subscriber_id,
    relationship_id: relationship.id,
    source_event_id: sourceEventId,
    actor: "ai",
    occurred_at: new Date().toISOString()
  };
  const rows: Record<string, unknown>[] = [
    {
      ...base,
      timeline_type: "summary_refreshed",
      title: "Summary refreshed",
      detail: draft.rolling_summary,
      metadata: { confidence: draft.confidence }
    }
  ];
  if (previous?.current_intent !== draft.current_intent && draft.current_intent) {
    rows.push({
      ...base,
      timeline_type: draft.current_intent === "buying_signal" || draft.current_intent === "ppv_interest" ? "buying_signal_detected" : "intent_changed",
      title: draft.current_intent === "buying_signal" || draft.current_intent === "ppv_interest" ? "Buying signal detected" : "Intent changed",
      detail: `${String(previous?.current_intent ?? "unknown")} -> ${draft.current_intent}`,
      metadata: { confidence: draft.current_intent_confidence }
    });
  }
  if (previous?.conversation_sentiment !== draft.conversation_sentiment) {
    rows.push({
      ...base,
      timeline_type: "sentiment_changed",
      title: "Sentiment changed",
      detail: `${String(previous?.conversation_sentiment ?? "unknown")} -> ${draft.conversation_sentiment}`,
      metadata: { sentiment_score: draft.sentiment_score }
    });
  }
  if (Number(previous?.vip_potential ?? 0) < 75 && draft.vip_potential >= 75) {
    rows.push({
      ...base,
      timeline_type: "vip_promoted",
      title: "VIP promoted",
      detail: `VIP potential reached ${draft.vip_potential}/100.`,
      metadata: { vip_potential: draft.vip_potential, whale_potential: draft.whale_potential }
    });
  }
  if (Number(previous?.churn_probability ?? 0) < 70 && draft.churn_probability >= 70) {
    rows.push({
      ...base,
      timeline_type: "churn_warning",
      title: "Churn warning",
      detail: `Churn probability reached ${draft.churn_probability}/100.`,
      metadata: { churn_probability: draft.churn_probability }
    });
  }
  const inserted = await supabase.from("of_relationship_timeline").insert(rows);
  assertNoError(inserted.error);
}

async function updateRelationshipFromIntelligence(supabase: SupabaseClient, relationship: Record<string, unknown>, draft: ConversationIntelligenceDraft) {
  const patch: Record<string, unknown> = {
    engagement_score: Math.max(Number(relationship.engagement_score ?? 0), draft.engagement_score),
    vip_score: Math.max(Number(relationship.vip_score ?? 0), draft.vip_potential),
    churn_risk: Math.max(Number(relationship.churn_risk ?? 0), draft.churn_probability),
    recommended_next_action: draft.recommended_next_action,
    metadata: {
      ...(isRecord(relationship.metadata) ? relationship.metadata : {}),
      conversation_intelligence: {
        current_intent: draft.current_intent,
        sentiment: draft.conversation_sentiment,
        suggested_script: draft.suggested_script,
        confidence: draft.confidence
      }
    }
  };
  const result = await supabase.from("of_subscriber_relationships").update(patch).eq("id", relationship.id);
  assertNoError(result.error);
}

function buildSubscriberTimeline(
  subscriber: Record<string, unknown>,
  tasks: Record<string, unknown>[],
  relationshipTimeline: Record<string, unknown>[],
  events: Record<string, unknown>[]
) {
  const items = [
    {
      id: `${subscriber.id}:created`,
      source: "sync",
      type: "relationship_created",
      title: "Relationship Created",
      detail: "Subscriber relationship profile was created.",
      actor: "system",
      occurred_at: String(subscriber.created_at),
      metadata: {}
    },
    {
      id: `${subscriber.id}:updated`,
      source: "sync",
      type: "relationship_updated",
      title: "Relationship Updated",
      detail: `State is ${String(subscriber.relationship_state ?? "unknown").replaceAll("_", " ")}.`,
      actor: "system",
      occurred_at: String(subscriber.updated_at),
      metadata: {}
    },
    ...relationshipTimeline.map((item) => ({
      id: String(item.id),
      source: "relationship",
      type: String(item.timeline_type),
      title: String(item.title),
      detail: typeof item.detail === "string" ? item.detail : null,
      actor: String(item.actor ?? "system"),
      occurred_at: String(item.occurred_at ?? item.created_at),
      metadata: isRecord(item.metadata) ? item.metadata : {}
    })),
    ...tasks.flatMap((task) => {
      const timeline = Array.isArray(task.of_task_timeline) ? task.of_task_timeline as Record<string, unknown>[] : [];
      const created = {
        id: `${task.id}:task`,
        source: "task",
        type: String(task.task_type),
        title: String(task.title),
        detail: String(task.reason ?? task.description ?? "Task created."),
        actor: "rules_engine",
        occurred_at: String(task.created_at),
        metadata: { task_id: task.id, status: task.status }
      };
      return [
        created,
        ...timeline.map((item) => ({
          id: String(item.id),
          source: "task",
          type: String(item.event_type),
          title: String(item.title),
          detail: typeof item.detail === "string" ? item.detail : null,
          actor: String(item.actor ?? "system"),
          occurred_at: String(item.created_at),
          metadata: { task_id: task.id, from_status: item.from_status, to_status: item.to_status }
        }))
      ];
    }),
    ...events.map((event) => ({
      id: String(event.id),
      source: "event",
      type: String(event.event_type),
      title: summarizeEventType(String(event.event_type)),
      detail: String(event.processing_status ?? "processed"),
      actor: "betterfans",
      occurred_at: String(event.received_at ?? event.created_at),
      metadata: isRecord(event.payload) ? event.payload : {}
    }))
  ];

  return items
    .filter((item) => item.occurred_at && item.occurred_at !== "null" && item.occurred_at !== "undefined")
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
}

function subscriberTaskCount(subscriber: Record<string, unknown>, tasks: Record<string, unknown>[]) {
  return tasks.filter((task) =>
    (task.source_type === "subscriber" && task.source_id === subscriber.id) || task.subscriber_id === subscriber.subscriber_id
  ).length;
}

async function updateTask(supabase: SupabaseClient, taskId: string, body: Record<string, unknown>) {
  const allowedStatuses = new Set(["open", "in_progress", "waiting", "completed", "cancelled", "ignored", "archived"]);
  const allowedPriorities = new Set(["low", "medium", "high", "urgent"]);
  const patch: Record<string, unknown> = {};
  const current = await supabase.from("of_tasks").select("*").eq("id", taskId).single();
  assertNoError(current.error);
  if (!current.data) throw new Error("Task not found");
  const previousStatus = String(current.data.status);
  const actor = typeof body.actor === "string" && body.actor.trim() ? body.actor.trim() : "operator";

  if (typeof body.status === "string") {
    if (!allowedStatuses.has(body.status)) throw new Error("Invalid task status");
    patch.status = body.status;
    if (body.status === "in_progress" && !current.data.started_at) patch.started_at = new Date().toISOString();
    if (body.status === "completed") {
      patch.completed_at = new Date().toISOString();
      patch.completed_by = actor;
    }
    if (body.status === "cancelled") {
      patch.cancelled_at = new Date().toISOString();
      patch.cancelled_by = actor;
    }
    if (body.status === "archived") patch.archived_at = new Date().toISOString();
    if (body.status === "open" && previousStatus !== "open") {
      patch.completed_at = null;
      patch.cancelled_at = null;
      patch.archived_at = null;
    }
  }

  if (typeof body.priority === "string") {
    if (!allowedPriorities.has(body.priority)) throw new Error("Invalid task priority");
    patch.priority = body.priority;
  }

  if ("due_at" in body) patch.due_at = emptyToNull(body.due_at);
  if ("resolution_note" in body) patch.resolution_note = typeof body.resolution_note === "string" ? body.resolution_note : null;
  if ("ignore_reason" in body) patch.ignore_reason = typeof body.ignore_reason === "string" ? body.ignore_reason : null;
  if ("assigned_to" in body) patch.assigned_to = typeof body.assigned_to === "string" ? body.assigned_to : null;
  if (body.viewed === true) patch.viewed_at = new Date().toISOString();

  const result = await supabase.from("of_tasks").update(patch).eq("id", taskId).select("*, of_creators(username, display_name), of_task_timeline(*)").single();
  assertNoError(result.error);
  if (body.viewed === true) {
    await recordTaskTimeline(supabase, result.data, "viewed", "Viewed", "Operator opened the task detail panel.", actor);
  }
  if (typeof body.assigned_to === "string") {
    await recordTaskTimeline(supabase, result.data, "assigned", "Assigned", `Assigned to ${body.assigned_to}.`, actor);
  }
  if (typeof body.status === "string" && body.status !== previousStatus) {
    await recordTaskTimeline(
      supabase,
      result.data,
      body.status === "completed" ? "completed" : body.status === "cancelled" ? "cancelled" : body.status === "ignored" ? "ignored" : previousStatus === "completed" ? "reopened" : "status_changed",
      body.status === "completed" ? "Completed" : body.status === "cancelled" ? "Cancelled" : body.status === "ignored" ? "Ignored" : previousStatus === "completed" ? "Reopened" : "Status Changed",
      `${previousStatus} -> ${body.status}`,
      actor,
      previousStatus,
      body.status
    );
  }
  return result.data;
}

async function generateCreatorTasks(supabase: SupabaseClient, creatorId: string) {
const [creator, subscribers, chats, events] = await Promise.all([
  supabase.from("of_creators").select("id").eq("id", creatorId).single(),
  supabase.from("of_subscriber_relationships").select("*").eq("creator_id", creatorId).limit(500),
  supabase.from("of_chats").select("*").eq("creator_id", creatorId).limit(500),
  supabase.from("of_events").select("*").eq("creator_id", creatorId).in("event_type", ["transaction_created", "chat_message"]).limit(250)
]);
  assertNoError(creator.error);
  assertNoError(subscribers.error);
  assertNoError(chats.error);
  assertNoError(events.error);

  const drafts = generateTaskDrafts({
    subscribers: subscribers.data ?? [],
    chats: chats.data ?? [],
    events: events.data ?? []
  });
  const relationshipsById = new Map((subscribers.data ?? []).map((subscriber) => [String(subscriber.id), subscriber]));

  const summary = { created: 0, skipped: 0, duplicates: 0, errors: [] as string[] };
  for (const draft of drafts) {
    try {
      const duplicate = await findActiveDuplicateTask(supabase, creatorId, draft);
      if (duplicate) {
        summary.duplicates++;
        continue;
      }

      const priority = calculateTaskPriority(draft, relationshipsById.get(String(draft.source_id)));
      const inserted = await supabase.from("of_tasks").insert({
        creator_id: creatorId,
        source_type: draft.source_type,
        source_id: draft.source_id,
        task_type: draft.task_type,
        rule_name: draft.rule_name,
        rule_version: draft.rule_version,
        priority: priority.priority,
        priority_score: priority.score,
        priority_reason: priority.reason,
        status: draft.status,
        title: draft.title,
        description: draft.description,
        reason: draft.reason,
        evidence: draft.evidence,
        confidence: draft.confidence,
        recommended_action: draft.recommended_action,
        suggested_action: draft.suggested_action,
        suggested_script: draft.suggested_script,
        ai_suggestion: draft.ai_suggestion,
        due_at: draft.due_at,
        resolution_note: null,
        execution_count: 1,
        last_triggered_at: new Date().toISOString(),
        cooldown_until: draft.cooldown_hours > 0 ? new Date(Date.now() + draft.cooldown_hours * 60 * 60 * 1000).toISOString() : null,
        next_eligible_at: draft.cooldown_hours > 0 ? new Date(Date.now() + draft.cooldown_hours * 60 * 60 * 1000).toISOString() : null,
        source: "rules_engine"
      }).select("*").single();
      if (inserted.error?.code === "23505") {
        summary.duplicates++;
        continue;
      }
      assertNoError(inserted.error);
      await recordTaskTimeline(supabase, inserted.data, "task_created", "Task Created", draft.reason, "rules_engine");
      summary.created++;
    } catch (error) {
      summary.errors.push(error instanceof Error ? error.message : "Unexpected task generation error");
    }
  }

return {
  ...summary,
  skipped: summary.skipped,
  evaluated: drafts.length
};
}

async function findActiveDuplicateTask(supabase: SupabaseClient, creatorId: string, draft: TaskRuleDraft) {
  const result = await supabase
    .from("of_tasks")
    .select("id")
    .eq("creator_id", creatorId)
    .eq("source_type", draft.source_type)
    .eq("source_id", draft.source_id)
    .eq("task_type", draft.task_type)
    .eq("rule_name", draft.rule_name)
    .in("status", ["open", "in_progress", "waiting"])
    .limit(1);
  assertNoError(result.error);
  return Boolean(result.data?.length);
}

async function recordTaskTimeline(
  supabase: SupabaseClient,
  task: Record<string, unknown>,
  eventType: string,
  title: string,
  detail: string | null,
  actor: string,
  fromStatus?: string,
  toStatus?: string
) {
  const inserted = await supabase.from("of_task_timeline").insert({
    task_id: task.id,
    creator_id: task.creator_id,
    event_type: eventType,
    actor,
    from_status: fromStatus ?? null,
    to_status: toStatus ?? (typeof task.status === "string" ? task.status : null),
    title,
    detail,
    metadata: {}
  });
  assertNoError(inserted.error);
}

async function listCreatorScripts(supabase: SupabaseClient, creatorId: string) {
  const scripts = await supabase.from("of_message_scripts").select("*").eq("creator_id", creatorId).order("created_at", { ascending: false });
  assertNoError(scripts.error);
  const scriptIds = (scripts.data ?? []).map((script) => script.id as string);
  const steps = scriptIds.length
    ? await supabase.from("of_message_script_steps").select("*").in("script_id", scriptIds).order("step_order", { ascending: true })
    : { data: [], error: null };
  assertNoError(steps.error);

  const stepsByScript = new Map<string, OfMessageScriptStep[]>();
  for (const step of (steps.data ?? []) as OfMessageScriptStep[]) {
    const existing = stepsByScript.get(step.script_id) ?? [];
    existing.push(step);
    stepsByScript.set(step.script_id, existing);
  }

  return (scripts.data ?? []).map((script) => ({
    ...script,
    steps: stepsByScript.get(script.id as string) ?? []
  }));
}

async function createMessageScript(supabase: SupabaseClient, creatorId: string, body: Partial<MessageScriptTemplate>) {
  if (!body.name?.trim()) throw new Error("Script name is required");
  if (!body.triggerEventType?.trim()) throw new Error("Script triggerEventType is required");
  const legacyBody = body as Partial<MessageScriptTemplate> & { action_mode?: unknown };
  const actionMode = parseActionMode(body.actionMode ?? legacyBody.action_mode, "draft_for_approval");

  const inserted = await supabase
    .from("of_message_scripts")
    .insert({
      creator_id: creatorId,
      name: body.name.trim(),
      trigger_event_type: body.triggerEventType.trim(),
      status: "inactive",
      action_mode: actionMode,
      auto_send_enabled: Boolean(body.autoSendEnabled),
      requires_approval: body.requiresApproval ?? actionMode !== "auto_send",
      cooldown_hours: nonNegativeInteger(body.cooldownHours, 24),
      max_sends_per_fan: nonNegativeInteger(body.maxSendsPerFan, 1)
    })
    .select("*")
    .single();
  assertNoError(inserted.error);

  const script = inserted.data;
  if (body.steps?.length) {
    await insertScriptTemplateSteps(supabase, script.id as string, body.steps);
  }

  return (await listCreatorScripts(supabase, creatorId)).find((item) => item.id === script.id) ?? script;
}

async function updateMessageScript(supabase: SupabaseClient, scriptId: string, body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.trigger_event_type === "string") patch.trigger_event_type = body.trigger_event_type.trim();
  if (typeof body.triggerEventType === "string") patch.trigger_event_type = body.triggerEventType.trim();
  if (typeof body.status === "string") {
    if (!["active", "inactive"].includes(body.status)) throw new Error("Invalid script status");
    patch.status = body.status;
  }
  if (typeof body.auto_send_enabled === "boolean") patch.auto_send_enabled = body.auto_send_enabled;
  if (typeof body.autoSendEnabled === "boolean") patch.auto_send_enabled = body.autoSendEnabled;
  if (typeof body.requires_approval === "boolean") patch.requires_approval = body.requires_approval;
  if (typeof body.requiresApproval === "boolean") patch.requires_approval = body.requiresApproval;
  if ("action_mode" in body) patch.action_mode = parseActionMode(body.action_mode, "draft_for_approval");
  if ("actionMode" in body) patch.action_mode = parseActionMode(body.actionMode, "draft_for_approval");
  if ("cooldown_hours" in body) patch.cooldown_hours = nonNegativeInteger(body.cooldown_hours, 24);
  if ("cooldownHours" in body) patch.cooldown_hours = nonNegativeInteger(body.cooldownHours, 24);
  if ("max_sends_per_fan" in body) patch.max_sends_per_fan = nonNegativeInteger(body.max_sends_per_fan, 1);
  if ("maxSendsPerFan" in body) patch.max_sends_per_fan = nonNegativeInteger(body.maxSendsPerFan, 1);

  const result = await supabase.from("of_message_scripts").update(patch).eq("id", scriptId).select("*").single();
  assertNoError(result.error);
  return result.data;
}

async function insertScriptTemplateSteps(supabase: SupabaseClient, scriptId: string, steps: ScriptStepTemplate[]) {
  const idMap = new Map<string, string>();
  for (const step of steps) {
    if (step.id) idMap.set(step.id, isUuid(step.id) ? step.id : crypto.randomUUID());
  }

  const rows = steps.map((step) => {
    const id = step.id ? idMap.get(step.id) : undefined;
    return {
      ...(id ? { id } : {}),
      script_id: scriptId,
      step_order: nonNegativeInteger(step.order, 0),
      step_type: step.type,
      message_body: step.body ?? null,
      delay_minutes: step.delayMinutes ?? null,
      condition_key: step.condition?.key ?? null,
      condition_value: step.condition?.value ?? null,
      next_step_id: step.nextStepId ? idMap.get(step.nextStepId) ?? (isUuid(step.nextStepId) ? step.nextStepId : null) : null,
      fallback_step_id: step.fallbackStepId ? idMap.get(step.fallbackStepId) ?? (isUuid(step.fallbackStepId) ? step.fallbackStepId : null) : null
    };
  });

  const result = await supabase.from("of_message_script_steps").insert(rows);
  assertNoError(result.error);
}

async function createScriptStep(supabase: SupabaseClient, scriptId: string, body: Partial<ScriptStepTemplate>) {
  const result = await supabase
    .from("of_message_script_steps")
    .insert({
      script_id: scriptId,
      step_order: nonNegativeInteger(body.order, 0),
      step_type: body.type ?? "message",
      message_body: body.body ?? null,
      delay_minutes: body.delayMinutes ?? null,
      condition_key: body.condition?.key ?? null,
      condition_value: body.condition?.value ?? null,
      next_step_id: body.nextStepId && isUuid(body.nextStepId) ? body.nextStepId : null,
      fallback_step_id: body.fallbackStepId && isUuid(body.fallbackStepId) ? body.fallbackStepId : null
    })
    .select("*")
    .single();
  assertNoError(result.error);
  return result.data;
}

async function updateScriptStep(supabase: SupabaseClient, stepId: string, body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  if ("order" in body) patch.step_order = nonNegativeInteger(body.order, 0);
  if ("step_order" in body) patch.step_order = nonNegativeInteger(body.step_order, 0);
  if (typeof body.type === "string") patch.step_type = body.type;
  if (typeof body.step_type === "string") patch.step_type = body.step_type;
  if ("body" in body) patch.message_body = typeof body.body === "string" ? body.body : null;
  if ("message_body" in body) patch.message_body = typeof body.message_body === "string" ? body.message_body : null;
  if ("delayMinutes" in body) patch.delay_minutes = body.delayMinutes == null ? null : nonNegativeInteger(body.delayMinutes, 0);
  if ("delay_minutes" in body) patch.delay_minutes = body.delay_minutes == null ? null : nonNegativeInteger(body.delay_minutes, 0);
  if (isRecord(body.condition)) {
    patch.condition_key = typeof body.condition.key === "string" ? body.condition.key : null;
    patch.condition_value = typeof body.condition.value === "string" ? body.condition.value : null;
  }
  if ("condition_key" in body) patch.condition_key = typeof body.condition_key === "string" ? body.condition_key : null;
  if ("condition_value" in body) patch.condition_value = typeof body.condition_value === "string" ? body.condition_value : null;
  if ("nextStepId" in body) patch.next_step_id = typeof body.nextStepId === "string" && isUuid(body.nextStepId) ? body.nextStepId : null;
  if ("next_step_id" in body) patch.next_step_id = typeof body.next_step_id === "string" && isUuid(body.next_step_id) ? body.next_step_id : null;
  if ("fallbackStepId" in body) patch.fallback_step_id = typeof body.fallbackStepId === "string" && isUuid(body.fallbackStepId) ? body.fallbackStepId : null;
  if ("fallback_step_id" in body) patch.fallback_step_id = typeof body.fallback_step_id === "string" && isUuid(body.fallback_step_id) ? body.fallback_step_id : null;

  const result = await supabase.from("of_message_script_steps").update(patch).eq("id", stepId).select("*").single();
  assertNoError(result.error);
  return result.data;
}

async function runAutomationsForEvent(supabase: SupabaseClient, env: Env, eventId: string) {
  await applyRelationshipEvent(supabase, eventId);
  const event = await supabase.from("of_events").select("*").eq("id", eventId).single();
  assertNoError(event.error);
  if (!event.data) throw new Error("Event not found");

  const payload = event.data.payload;
  const fanId = isRecord(payload) ? extractFanId(payload) : null;
  if (!fanId) {
    return { eventId, matched: 0, queued: 0, skipped: 0, errors: ["Event payload did not include a fan identifier"] };
  }
  const eventContext = await loadEventActionContext(supabase, event.data, fanId);
  if (event.data.event_type === "chat_message" && eventContext.relationshipId) {
    await recalculateSubscriberIntelligence(supabase, eventContext.relationshipId);
  }

  const scripts = await supabase
    .from("of_message_scripts")
    .select("*, of_message_script_steps(*)")
    .eq("creator_id", event.data.creator_id)
    .eq("trigger_event_type", event.data.event_type)
    .eq("status", "active");
  assertNoError(scripts.error);

  const summary = { eventId, matched: scripts.data?.length ?? 0, queued: 0, skipped: 0, errors: [] as string[] };
  for (const script of scripts.data ?? []) {
    try {
      const result = await runAutomationForScript(supabase, env, script, event.data, fanId);
      if (result === "skipped") summary.skipped++;
      else summary.queued++;
    } catch (error) {
      summary.errors.push(error instanceof Error ? error.message : "Unexpected automation error");
    }
  }
  return summary;
}

async function runAutomationForScript(
  supabase: SupabaseClient,
  env: Env,
  script: Record<string, unknown>,
  event: Record<string, unknown>,
  fanId: string
): Promise<AutomationActionResult> {
  const duplicate = await supabase
    .from("of_automation_runs")
    .select("id")
    .eq("script_id", script.id)
    .eq("source_event_id", event.id)
    .limit(1);
  assertNoError(duplicate.error);
  if (duplicate.data?.length) return "skipped";

  const actionMode = scriptActionMode(script);
  const skipReason = await automationSkipReason(supabase, script, fanId);
  const run = await supabase
    .from("of_automation_runs")
    .insert({
      creator_id: event.creator_id,
      script_id: script.id,
      fan_id: fanId,
      source_event_id: event.id,
      action_mode: actionMode,
      status: skipReason ? "skipped" : "running",
      completed_at: skipReason ? new Date().toISOString() : null,
      error_message: skipReason
    })
    .select("*")
    .single();

  if (run.error?.code === "23505") return "skipped";
  assertNoError(run.error);
  if (skipReason) return "skipped";

  const context = await loadEventActionContext(supabase, event, fanId);
  let actionResult: AutomationActionResult;
  if (actionMode === "task_only") {
    actionResult = await executeTaskOnlyAction(supabase, script, event, run.data.id as string, fanId, context);
  } else {
    actionResult = await executeMessageAction(supabase, env, script, event, run.data.id as string, fanId, actionMode);
  }

  await recordAutomationTimeline(supabase, script, event, run.data.id as string, fanId, actionMode, actionResult, context);
  await completeAutomationRun(supabase, run.data.id as string, actionResult === "failed" ? "failed" : "completed", actionResult === "failed" ? "BetterFans message delivery failed" : null);
  return actionResult;
}

async function executeTaskOnlyAction(
  supabase: SupabaseClient,
  script: Record<string, unknown>,
  event: Record<string, unknown>,
  runId: string,
  fanId: string,
  context: EventActionContext
): Promise<AutomationActionResult> {
  const title = script.name ? String(script.name) : `Handle ${String(event.event_type ?? "event")}`;
  const relationship = context.relationshipId
    ? await supabase.from("of_subscriber_relationships").select("*").eq("id", context.relationshipId).maybeSingle()
    : { data: null, error: null };
  assertNoError(relationship.error);
  const priority = calculateTaskPriority(
    {
      status: "open",
      due_at: new Date().toISOString(),
      task_type: `automation.${String(event.event_type ?? "event")}`,
      rule_name: title,
      title,
      reason: `Event action matched ${String(event.event_type ?? "event")} and requires operator review.`,
      description: `Automation ${runId} created a task for fan ${fanId}.`,
      recommended_action: "Review the event context and complete the scripted action manually.",
      suggested_action: "review_task"
    },
    relationship.data
  );
  const inserted = await supabase.from("of_tasks").insert({
    creator_id: event.creator_id,
    source_type: "event",
    source_id: event.id,
    source_event_id: event.id,
    subscriber_id: context.subscriberId,
    chat_id: context.chatId,
    task_type: `automation.${String(event.event_type ?? "event")}`,
    rule_name: title,
    rule_version: "event_actions_v1",
    priority: priority.priority,
    priority_score: priority.score,
    priority_reason: priority.reason,
    status: "open",
    title,
    description: `Automation ${runId} created a task for fan ${fanId}.`,
    reason: `Event action matched ${String(event.event_type ?? "event")} and requires operator review.`,
    evidence: [
      { label: "Fan", value: fanId },
      { label: "Automation run", value: runId },
      { label: "Source event", value: String(event.id ?? "unknown") }
    ],
    confidence: 88,
    recommended_action: "Review the event context and complete the scripted action manually.",
    suggested_action: "review_task",
    suggested_script: script.name ? String(script.name) : null,
    ai_suggestion: {
      suggested_script: script.name ? String(script.name) : null,
      confidence: 70,
      expected_outcome: "Keep automation human-reviewed."
    },
    due_at: new Date().toISOString(),
    resolution_note: null,
    execution_count: 1,
    last_triggered_at: new Date().toISOString(),
    next_eligible_at: new Date().toISOString(),
    source: "event"
  }).select("*").single();

  if (inserted.error?.code === "23505") return "skipped";
  assertNoError(inserted.error);
  await recordTaskTimeline(supabase, inserted.data, "task_created", "Task Created", `Automation ${runId} created this task.`, "automation");
  return "task_created";
}

async function executeMessageAction(
  supabase: SupabaseClient,
  env: Env,
  script: Record<string, unknown>,
  event: Record<string, unknown>,
  runId: string,
  fanId: string,
  actionMode: MessageScriptActionMode
): Promise<AutomationActionResult> {
  const steps = ((script.of_message_script_steps as OfMessageScriptStep[] | undefined) ?? []).sort((a, b) => a.step_order - b.step_order);
  const firstMessage = steps.find((step) => ["message", "follow_up", "question"].includes(step.step_type) && step.message_body?.trim());
  if (!firstMessage?.message_body) {
    await completeAutomationRun(supabase, runId, "skipped", "Script has no message step to queue");
    return "skipped";
  }

  const isAutoSend = actionMode === "auto_send";
  const outbound = await supabase
    .from("of_outbound_messages")
    .insert({
    creator_id: event.creator_id,
    fan_id: fanId,
    script_id: script.id,
    automation_run_id: runId,
    source_event_id: event.id,
    generated_text: firstMessage.message_body,
    message_body: firstMessage.message_body,
    draft_text: firstMessage.message_body,
    final_text: isAutoSend ? firstMessage.message_body : null,
    status: isAutoSend ? "queued" : "pending_approval",
    approval_status: isAutoSend ? "not_required" : "pending",
    sent_at: null,
    failed_at: null,
    failure_reason: null,
    error_message: null
    })
    .select("*")
    .single();
  assertNoError(outbound.error);

  if (!isAutoSend) return "draft_created";

  const sent = await sendOutboundMessage(supabase, env, outbound.data.id as string, firstMessage.message_body);
  return sent.status === "sent" ? "sent" : "failed";
}

async function loadEventActionContext(supabase: SupabaseClient, event: Record<string, unknown>, fanId: string): Promise<EventActionContext> {
  const creatorId = String(event.creator_id ?? "");
  const payload = isRecord(event.payload) ? event.payload : {};
  const platformChatId = findString(payload, "chatId", "chat_id", "platform_chat_id") ?? findNestedString(payload, ["chat", "id"]);

  const [subscribers, chats] = await Promise.all([
    supabase
      .from("of_subscribers")
      .select("id, betterfans_subscriber_id, platform_subscriber_id, username")
      .eq("creator_id", creatorId)
      .limit(500),
    supabase
      .from("of_chats")
      .select("id, platform_chat_id, platform_user_id, fan_username")
      .eq("creator_id", creatorId)
      .limit(500)
  ]);

  assertNoError(subscribers.error);
  assertNoError(chats.error);

  const subscriber = (subscribers.data ?? []).find((item) =>
    item.betterfans_subscriber_id === fanId || item.platform_subscriber_id === fanId || item.username === fanId
  );
  const chat = (chats.data ?? []).find((item) =>
    item.platform_chat_id === platformChatId || item.platform_user_id === fanId || item.fan_username === fanId
  );
  let relationshipId: string | null = null;
  if (subscriber?.id) {
    const relationship = await supabase
      .from("of_subscriber_relationships")
      .select("id")
      .eq("creator_id", creatorId)
      .eq("subscriber_id", subscriber.id)
      .limit(1);
    assertNoError(relationship.error);
    relationshipId = typeof relationship.data?.[0]?.id === "string" ? relationship.data[0].id : null;
  }

  return {
    subscriberId: typeof subscriber?.id === "string" ? subscriber.id : null,
    chatId: typeof chat?.id === "string" ? chat.id : null,
    relationshipId
  };
}

async function applyRelationshipEvent(supabase: SupabaseClient, eventId: string) {
  const existing = await supabase
    .from("of_relationship_timeline")
    .select("id")
    .eq("source_event_id", eventId)
    .limit(1);
  assertNoError(existing.error);
  if (existing.data?.length) return;

  const result = await supabase.rpc("of_apply_relationship_event", { p_event_id: eventId });
  assertNoError(result.error);
}

async function recordAutomationTimeline(
  supabase: SupabaseClient,
  script: Record<string, unknown>,
  event: Record<string, unknown>,
  runId: string,
  fanId: string,
  actionMode: MessageScriptActionMode,
  actionResult: AutomationActionResult,
  context: EventActionContext
) {
  if (!context.relationshipId) return;

  const inserted = await supabase.from("of_relationship_timeline").insert({
    creator_id: event.creator_id,
    subscriber_id: context.subscriberId,
    relationship_id: context.relationshipId,
    source_event_id: event.id,
    timeline_type: "automation",
    title: script.name ? String(script.name) : "Automation action",
    detail: `${actionMode}: ${actionResult} for fan ${fanId}`,
    actor: "automation",
    occurred_at: new Date().toISOString(),
    metadata: {
      automation_run_id: runId,
      action_mode: actionMode,
      action_result: actionResult
    }
  });
  assertNoError(inserted.error);
}

async function automationSkipReason(supabase: SupabaseClient, script: Record<string, unknown>, fanId: string) {
  const maxSends = Number(script.max_sends_per_fan ?? 1);
  if (maxSends > 0) {
    const sendCount = await supabase
      .from("of_outbound_messages")
      .select("id", { count: "exact", head: true })
      .eq("script_id", script.id)
      .eq("fan_id", fanId)
      .not("status", "in", "(rejected,failed)");
    assertNoError(sendCount.error);
    if ((sendCount.count ?? 0) >= maxSends) return "Max sends per fan reached";
  }

  const cooldownHours = Number(script.cooldown_hours ?? 0);
  if (cooldownHours > 0) {
    const cutoff = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();
    const recent = await supabase
      .from("of_outbound_messages")
      .select("id")
      .eq("script_id", script.id)
      .eq("fan_id", fanId)
      .gte("created_at", cutoff)
      .not("status", "in", "(rejected,failed)")
      .limit(1);
    assertNoError(recent.error);
    if (recent.data?.length) return "Cooldown is still active";
  }

  return null;
}

async function completeAutomationRun(supabase: SupabaseClient, runId: string, status: "completed" | "skipped" | "failed", errorMessage: string | null) {
  const result = await supabase
    .from("of_automation_runs")
    .update({ status, completed_at: new Date().toISOString(), error_message: errorMessage })
    .eq("id", runId);
  assertNoError(result.error);
}

async function listCreatorAutomationRuns(supabase: SupabaseClient, creatorId: string) {
  const result = await supabase
    .from("of_automation_runs")
    .select("*, of_message_scripts(name, trigger_event_type)")
    .eq("creator_id", creatorId)
    .order("started_at", { ascending: false })
    .limit(100);
  assertNoError(result.error);
  return result.data ?? [];
}

async function updateOutboundMessage(supabase: SupabaseClient, env: Env, messageId: string, body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  if (typeof body.draft_text === "string") patch.draft_text = body.draft_text.trim();
  if (typeof body.final_text === "string") patch.final_text = body.final_text.trim();
  if (typeof body.approved_by === "string") patch.approved_by = body.approved_by.trim() || "operator";

  if (body.approval_status === "approved") {
    const current = await supabase.from("of_outbound_messages").select("*").eq("id", messageId).single();
    assertNoError(current.error);
    if (!current.data) throw new Error("Outbound message not found");
    if (current.data.status !== "pending_approval") throw new Error("Only pending approval messages can be approved");

    const finalText =
      typeof patch.final_text === "string" && patch.final_text
        ? patch.final_text
        : typeof body.draft_text === "string" && body.draft_text.trim()
          ? body.draft_text.trim()
          : typeof current.data.final_text === "string" && current.data.final_text.trim()
            ? current.data.final_text.trim()
            : typeof current.data.draft_text === "string" && current.data.draft_text.trim()
              ? current.data.draft_text.trim()
              : typeof current.data.message_body === "string" && current.data.message_body.trim()
                ? current.data.message_body.trim()
          : null;
    if (!finalText) throw new Error("Approved outbound messages require final text");
    patch.approval_status = "approved";
    patch.status = "queued";
    patch.final_text = finalText;
    patch.approved_by = typeof patch.approved_by === "string" && patch.approved_by ? patch.approved_by : "operator";

    const queued = await supabase
      .from("of_outbound_messages")
      .update(patch)
      .eq("id", messageId)
      .select("*")
      .single();
    assertNoError(queued.error);
    const sent = await sendOutboundMessage(supabase, env, messageId, finalText);
    return hydrateOutboundMessage(supabase, sent.id as string);
  } else if (body.approval_status === "rejected") {
    patch.approval_status = "rejected";
    patch.status = "rejected";
    patch.approved_by = typeof patch.approved_by === "string" && patch.approved_by ? patch.approved_by : "operator";
  } else if (body.status === "failed") {
    patch.status = "failed";
    patch.failed_at = new Date().toISOString();
    patch.failure_reason = typeof body.failure_reason === "string" ? body.failure_reason : typeof body.error_message === "string" ? body.error_message : "Marked failed by operator";
    patch.error_message = patch.failure_reason;
  }

  const result = await supabase
    .from("of_outbound_messages")
    .update(patch)
    .eq("id", messageId)
    .select("*, of_creators(username, display_name), of_message_scripts(name)")
    .single();
  assertNoError(result.error);
  return result.data;
}

async function sendOutboundMessage(supabase: SupabaseClient, env: Env, messageId: string, finalText: string) {
  const sending = await supabase
    .from("of_outbound_messages")
    .update({
      status: "sending",
      final_text: finalText,
      error_message: null,
      failure_reason: null,
      failed_at: null
    })
    .eq("id", messageId)
    .select("*")
    .single();
  assertNoError(sending.error);
  if (!sending.data) throw new Error("Outbound message not found");

  const creator = await supabase
    .from("of_creators")
    .select("betterfans_account_id")
    .eq("id", sending.data.creator_id)
    .single();
  assertNoError(creator.error);
  const accountId = creator.data?.betterfans_account_id;
  if (!accountId) throw new Error("Creator is missing a BetterFans account id");

  const client = new BetterFansOperationalClient({
    apiKey: env.BETTERFANS_API_KEY,
    baseUrl: env.BETTERFANS_BASE_URL || undefined
  });

  try {
    console.log("[outbound] sending BetterFans message", {
      messageId,
      creatorAccountId: accountId,
      subscriberId: sending.data.fan_id
    });
    const delivered = await client.sendMessage(accountId as string, sending.data.fan_id as string, finalText);
    const sent = await supabase
      .from("of_outbound_messages")
      .update({
        status: "sent",
        provider_message_id: delivered.providerMessageId,
        sent_at: new Date().toISOString(),
        failed_at: null,
        failure_reason: null,
        error_message: null
      })
      .eq("id", messageId)
      .select("*")
      .single();
    assertNoError(sent.error);
    return sent.data;
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : "Unexpected BetterFans send failure";
    console.error("[outbound] BetterFans message failed", {
      messageId,
      creatorAccountId: accountId,
      subscriberId: sending.data.fan_id,
      error: failureReason
    });
    const failed = await supabase
      .from("of_outbound_messages")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        failure_reason: failureReason,
        error_message: failureReason
      })
      .eq("id", messageId)
      .select("*")
      .single();
    assertNoError(failed.error);
    return failed.data;
  }
}

async function hydrateOutboundMessage(supabase: SupabaseClient, messageId: string) {
  const result = await supabase
    .from("of_outbound_messages")
    .select("*, of_creators(username, display_name), of_message_scripts(name)")
    .eq("id", messageId)
    .single();
  assertNoError(result.error);
  return result.data;
}

async function runAuditedSync(supabase: SupabaseClient, env: Env, creatorId: string, syncType: SyncType) {
  const syncRun = await supabase
    .from("of_sync_runs")
    .insert({ creator_id: creatorId, sync_type: syncType, status: "running", records_processed: 0 })
    .select("*")
    .single();
  assertNoError(syncRun.error);

  const runId = syncRun.data.id as string;
  try {
    const creator = await loadCreatorForSync(supabase, creatorId);
    const client = new BetterFansOperationalClient({
      apiKey: env.BETTERFANS_API_KEY,
      baseUrl: env.BETTERFANS_BASE_URL || undefined
    });
    const recordsProcessed = await executeSync(supabase, client, creatorId, creator.betterfans_account_id, syncType);
    const completed = await completeSyncRun(supabase, runId, "success", recordsProcessed);
    return { syncRun: completed, status: "success", recordsProcessed };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected sync failure";
    const failed = await failSyncRun(supabase, runId, message);
    return { syncRun: failed, status: "failed", recordsProcessed: 0, error: message };
  }
}

async function executeSync(
  supabase: SupabaseClient,
  client: BetterFansOperationalClient,
  creatorId: string,
  accountId: string,
  syncType: SyncType
): Promise<number> {
  if (syncType === "profile") {
    const profile = await client.getCreatorProfile(accountId);
    await persistCreatorProfile(supabase, accountId, profile, creatorId);
    return 1;
  }

  if (syncType === "stats") {
    const stats = await client.getStatsOverview(accountId);
    return persistCreatorSnapshot(supabase, creatorId, stats);
  }

  if (syncType === "subscribers") {
    const subscribers = await client.getSubscribers(accountId);
    const subscriberCount = await persistSubscribers(supabase, creatorId, subscribers);
    await recalculateAllRelationshipScores(supabase, creatorId);
    return subscriberCount;
  }

  if (syncType === "chats") {
    const chats = await client.getChats(accountId);
    return persistChats(supabase, creatorId, chats);
  }

  const profile = await client.getCreatorProfile(accountId);
  await persistCreatorProfile(supabase, accountId, profile, creatorId);
  const [stats, subscribers, chats] = await Promise.all([
    client.getStatsOverview(accountId),
    client.getSubscribers(accountId),
    client.getChats(accountId)
  ]);
  const snapshotCount = await persistCreatorSnapshot(supabase, creatorId, stats, profile, subscribers, chats);
  const subscriberCount = await persistSubscribers(supabase, creatorId, subscribers);
  const chatCount = await persistChats(supabase, creatorId, chats);
  await recalculateAllRelationshipScores(supabase, creatorId);
  return 1 + snapshotCount + subscriberCount + chatCount;
}

async function persistCreatorProfile(supabase: SupabaseClient, accountId: string, profile: unknown, creatorId?: string): Promise<string> {
  const data = normalizeCreatorProfile(accountId, profile);
  const creatorPayload = {
    platform_provider: "betterfans",
    betterfans_account_id: data.betterfans_account_id,
    username: data.username,
    display_name: data.display_name ?? null,
    bio: data.bio ?? null,
    location: data.location ?? null,
    status: data.status ?? "connected",
    onboarding_status: data.onboarding_status ?? "ready",
    active: data.active ?? true,
    last_sync_at: data.last_sync_at ?? new Date().toISOString()
  };

  const query = creatorId
    ? supabase.from("of_creators").update(creatorPayload).eq("id", creatorId).select("id").single()
    : supabase.from("of_creators").upsert(creatorPayload, { onConflict: "betterfans_account_id" }).select("id").single();
  const creator = await query;
  assertNoError(creator.error);
  if (!creator.data) throw new Error("Creator profile sync did not return an id");
  return creator.data.id as string;
}

async function persistCreatorSnapshot(
  supabase: SupabaseClient,
  creatorId: string,
  stats: unknown,
  profile?: unknown,
  subscribers?: unknown,
  chats?: unknown
): Promise<number> {
  const snapshot = normalizeCreatorSnapshot(stats, profile, subscribers, chats);
  const result = await supabase.from("of_creator_snapshots").insert({
    creator_id: creatorId,
    snapshot_date: snapshot.snapshot_date,
    subscribers_count: snapshot.subscribers_count ?? 0,
    active_subscribers: snapshot.active_subscribers ?? 0,
    expired_subscribers: snapshot.expired_subscribers ?? 0,
    revenue: snapshot.revenue ?? 0,
    chat_count: snapshot.chat_count ?? 0,
    priority_chat_count: snapshot.priority_chat_count ?? 0,
    posts_count: snapshot.posts_count ?? 0
  });
  assertNoError(result.error);

  await touchCreatorSync(supabase, creatorId);
  return 1;
}

async function persistSubscribers(supabase: SupabaseClient, creatorId: string, payload: unknown): Promise<number> {
  const subscribers = normalizeSubscribers(payload);
  if (!subscribers.length) {
    await touchCreatorSync(supabase, creatorId);
    return 0;
  }

  const now = new Date().toISOString();
  const result = await supabase.from("of_subscribers").upsert(
    subscribers.map((subscriber) => {
      const betterfansSubscriberId = subscriber.betterfans_subscriber_id || subscriber.platform_subscriber_id;
      return {
        creator_id: creatorId,
        betterfans_subscriber_id: betterfansSubscriberId,
        platform_subscriber_id: subscriber.platform_subscriber_id || betterfansSubscriberId,
        username: subscriber.username ?? null,
        display_name: subscriber.display_name ?? null,
        status: subscriber.status ?? subscriber.subscription_status ?? null,
        subscription_status: subscriber.subscription_status ?? subscriber.status ?? null,
        renewal_date: emptyToNull(subscriber.renewal_date ?? subscriber.renews_at),
        renews_at: emptyToNull(subscriber.renews_at ?? subscriber.renewal_date),
        expires_at: emptyToNull(subscriber.expires_at),
        total_spend: subscriber.total_spend ?? null,
        last_seen_at: emptyToNull(subscriber.last_seen_at),
        raw_payload: subscriber.raw_payload ?? {},
        last_sync_at: now
      };
    }),
    { onConflict: "creator_id,betterfans_subscriber_id" }
  );
  assertNoError(result.error);

  await touchCreatorSync(supabase, creatorId);
  return subscribers.length;
}

async function persistChats(supabase: SupabaseClient, creatorId: string, payload: unknown): Promise<number> {
  const chats = normalizeChats(payload);
  if (!chats.length) {
    await touchCreatorSync(supabase, creatorId);
    return 0;
  }

  const now = new Date().toISOString();
  const result = await supabase.from("of_chats").upsert(
    chats.map((chat) => ({
      creator_id: creatorId,
      platform_chat_id: chat.platform_chat_id,
      platform_user_id: chat.platform_user_id ?? null,
      fan_username: chat.fan_username ?? null,
      fan_display_name: chat.fan_display_name ?? null,
      last_activity_at: emptyToNull(chat.last_activity_at ?? chat.last_message_at),
      last_message_at: emptyToNull(chat.last_message_at ?? chat.last_activity_at),
      unread: chat.unread ?? false,
      unread_count: chat.unread_count ?? (chat.unread ? 1 : 0),
      priority: chat.priority ?? false,
      raw_payload: chat.raw_payload ?? {},
      last_sync_at: now
    })),
    { onConflict: "creator_id,platform_chat_id" }
  );
  assertNoError(result.error);

  await touchCreatorSync(supabase, creatorId);
  return chats.length;
}

async function loadCreatorForSync(supabase: SupabaseClient, creatorId: string): Promise<{ betterfans_account_id: string }> {
  const creator = await supabase.from("of_creators").select("betterfans_account_id").eq("id", creatorId).single();
  assertNoError(creator.error);
  const accountId = creator.data?.betterfans_account_id;
  if (!accountId) throw new Error("Creator is missing a BetterFans account id");
  return { betterfans_account_id: accountId as string };
}

async function touchCreatorSync(supabase: SupabaseClient, creatorId: string) {
  const result = await supabase.from("of_creators").update({ last_sync_at: new Date().toISOString() }).eq("id", creatorId);
  assertNoError(result.error);
}

async function completeSyncRun(supabase: SupabaseClient, runId: string, status: "success", recordsProcessed: number) {
  const result = await supabase
    .from("of_sync_runs")
    .update({ status, completed_at: new Date().toISOString(), records_processed: recordsProcessed, error_message: null })
    .eq("id", runId)
    .select("*")
    .single();
  assertNoError(result.error);
  return result.data;
}

async function failSyncRun(supabase: SupabaseClient, runId: string, errorMessage: string) {
  const result = await supabase
    .from("of_sync_runs")
    .update({ status: "failed", completed_at: new Date().toISOString(), records_processed: 0, error_message: errorMessage })
    .eq("id", runId)
    .select("*")
    .single();
  assertNoError(result.error);
  return result.data;
}

async function ingestBetterFansEvent(supabase: SupabaseClient, rawPayload: unknown) {
  if (!isRecord(rawPayload)) {
    return { ok: false, statusCode: 400, error: "Event payload must be a JSON object" };
  }

  const receivedAt = new Date().toISOString();
  const accountId = findString(rawPayload, "accountId", "account_id", "betterfans_account_id", "onlyfansUserId") ?? findNestedString(rawPayload, ["event", "accountId"]);
  const eventType = findString(rawPayload, "eventType", "event_type", "type") ?? findNestedString(rawPayload, ["event", "eventType"]);
  const providerEventId = findString(rawPayload, "providerEventId", "provider_event_id", "id", "eventId") ?? findNestedString(rawPayload, ["event", "id"]);

  if (!accountId) {
    return { ok: false, statusCode: 400, error: "BetterFans account id is required" };
  }

  if (!eventType) {
    return { ok: false, statusCode: 400, error: "Event type is required" };
  }

  const creator = await supabase.from("of_creators").select("id").eq("betterfans_account_id", accountId).single();
  if (creator.error || !creator.data) {
    return { ok: false, statusCode: 404, error: `No creator is connected for BetterFans account ${accountId}` };
  }

  const eventPayload = {
    creator_id: creator.data.id,
    provider: "betterfans",
    provider_event_id: providerEventId,
    event_type: eventType,
    payload: rawPayload,
    received_at: findString(rawPayload, "receivedAt", "received_at") ?? receivedAt,
    processed_at: receivedAt,
    processing_status: "processed",
    processing_error: null
  };

  const inserted = await supabase.from("of_events").insert(eventPayload).select("*").single();
  if (inserted.error) {
    if (inserted.error.code === "23505" && providerEventId) {
      const existing = await supabase
        .from("of_events")
        .select("*")
        .eq("provider", "betterfans")
        .eq("provider_event_id", providerEventId)
        .single();
      assertNoError(existing.error);
      return {
        ok: true,
        deduped: true,
        event: existing.data,
        summary: summarizeEventType(eventType)
      };
    }

    const failed = await supabase
      .from("of_events")
      .insert({
        ...eventPayload,
        provider_event_id: providerEventId ? `${providerEventId}:failed:${crypto.randomUUID()}` : null,
        processed_at: receivedAt,
        processing_status: "failed",
        processing_error: inserted.error.message
      })
      .select("*")
      .single();
    assertNoError(failed.error);
    return {
      ok: false,
      statusCode: 500,
      event: failed.data,
      error: inserted.error.message,
      summary: summarizeEventType(eventType)
    };
  }

  return {
    ok: true,
    deduped: false,
    event: inserted.data,
    summary: summarizeEventType(eventType)
  };
}

function eventStreamStatus() {
  return {
    connectionStatus: "receiver_ready",
    transport: "webhook",
    persistentWebSocket: "external_process_required",
    message:
      "Cloudflare Worker requests cannot reliably host a durable BetterFans WebSocket. Use the betterfans-client event stream wrapper in a long-running process and forward events to POST /api/events/betterfans."
  };
}

function isAuthorizedEventIngest(request: Request, env: Env) {
  if (!env.BETTERFANS_EVENTS_SHARED_SECRET) return true;
  return request.headers.get("x-betterfans-event-secret") === env.BETTERFANS_EVENTS_SHARED_SECRET;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function findString(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function findNestedString(record: Record<string, unknown>, path: string[]) {
  let current: unknown = record;
  for (const part of path) {
    if (!isRecord(current)) return null;
    current = current[part];
  }
  if (typeof current === "string" && current.trim()) return current;
  if (typeof current === "number" && Number.isFinite(current)) return String(current);
  return null;
}

function extractFanId(record: Record<string, unknown>) {
  return (
    findString(record, "fanId", "fan_id", "subscriberId", "subscriber_id", "userId", "user_id", "platform_user_id", "username", "fan") ??
    findNestedString(record, ["fan", "id"]) ??
    findNestedString(record, ["fan", "username"]) ??
    findNestedString(record, ["subscriber", "id"]) ??
    findNestedString(record, ["subscriber", "username"]) ??
    findNestedString(record, ["user", "id"]) ??
    findNestedString(record, ["user", "username"])
  );
}

function extractMessageText(record: Record<string, unknown>) {
  return (
    findString(record, "text", "body", "messageText", "message_text", "content") ??
    findNestedString(record, ["message", "text"]) ??
    findNestedString(record, ["message", "body"]) ??
    findNestedString(record, ["chat", "last_message"])
  );
}

function extractMessageActor(record: Record<string, unknown>): "subscriber" | "creator" {
  const actor = (findString(record, "actor", "sender_type", "senderType") ?? findNestedString(record, ["message", "sender_type"]) ?? "subscriber").toLowerCase();
  return actor === "creator" || actor === "operator" || actor === "agency" ? "creator" : "subscriber";
}

function firstRelatedRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return isRecord(value[0]) ? value[0] : null;
  return isRecord(value) ? value : null;
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isActiveTaskStatus(status: string) {
  return status === "open" || status === "in_progress" || status === "waiting";
}

function scoreSentiment(text: string, messageCount: number) {
  const positive = countMatches(text, ["love", "great", "amazing", "yes", "excited", "beautiful", "perfect", "thanks", "want"]);
  const negative = countMatches(text, ["angry", "annoyed", "refund", "scam", "bad", "hate", "expensive", "problem", "can't"]);
  return clampScore(50 + positive * 8 - negative * 10 + Math.min(12, messageCount * 2));
}

function countMatches(text: string, terms: string[]) {
  return terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
}

function sentimentLabel(score: number, engagementScore: number, text: string): ConversationSentiment {
  if (text.includes("angry") || text.includes("refund") || text.includes("not happy")) return "frustrated";
  if (text.includes("maybe") || text.includes("not sure") || text.includes("too expensive")) return "hesitant";
  if (score >= 78 && engagementScore >= 70) return "high_engagement";
  if (score >= 75) return "excited";
  if (score >= 58) return "positive";
  if (score <= 32) return "negative";
  if (engagementScore <= 20) return "cold";
  return "neutral";
}

function labelForIntent(intent: ConversationIntent) {
  return intent.replaceAll("_", " ");
}

function extractImportantFacts(messages: ConversationMessage[]) {
  const facts = new Set<string>();
  for (const message of messages) {
    const text = message.text.trim();
    const location = text.match(/\b(?:from|live in|based in)\s+([A-Z][A-Za-z\s]{2,32})/);
    if (location?.[1]) facts.add(`From ${location[1].trim()}`);
    const likes = text.match(/\b(?:like|love|enjoy)\s+([^.!?]{3,48})/i);
    if (likes?.[1]) facts.add(`Enjoys ${likes[1].trim()}`);
  }
  return [...facts].slice(0, 8);
}

function extractTopics(text: string, topics: string[]) {
  return topics.filter((topic) => text.includes(topic)).slice(0, 8);
}

function extractPromises(messages: ConversationMessage[]) {
  return messages
    .filter((message) => message.actor === "creator" && /\b(i will|i'll|send you|set aside|promise)\b/i.test(message.text))
    .map((message) => message.text.slice(0, 140))
    .slice(-5);
}

function buildRollingSummary(
  relationship: Record<string, unknown>,
  messages: ConversationMessage[],
  latestClassification: MessageClassificationDraft | null,
  facts: string[],
  likelyPpvBuyer: number,
  renewalLikelihood: number,
  churnProbability: number
) {
  const name = String(relationship.display_name ?? relationship.username ?? relationship.betterfans_subscriber_id ?? "Subscriber");
  const joined = relationship.first_seen_at ? `Joined ${relativeDate(String(relationship.first_seen_at))}.` : "Join date unknown.";
  const intent = latestClassification ? `Current intent appears to be ${labelForIntent(latestClassification.primary_intent)}.` : "No clear current intent yet.";
  const recent = messages.at(-1)?.text ? `Latest meaningful note: "${messages.at(-1)?.text.slice(0, 120)}"` : "No subscriber messages available yet.";
  const factLine = facts.length ? `Important facts: ${facts.join("; ")}.` : "No important personal facts captured yet.";
  return `${name}. ${joined} ${intent} ${recent} ${factLine} PPV likelihood ${likelyPpvBuyer}/100, renewal ${renewalLikelihood}/100, churn ${churnProbability}/100.`;
}

function buildAiBriefing(
  relationship: Record<string, unknown>,
  summary: string,
  ppv: number,
  renewal: number,
  churn: number,
  recommendation: string,
  script: string
) {
  const spend = Number(relationship.lifetime_spend ?? 0);
  return [
    "Summary",
    "",
    summary,
    "",
    "Likelihood",
    "",
    `${probabilityLabel(ppv)} PPV`,
    `${probabilityLabel(renewal)} Renewal`,
    `${probabilityLabel(churn)} Churn`,
    spend >= 500 ? "High VIP potential" : "Monitor VIP potential",
    "",
    "Recommended",
    "",
    recommendation,
    script
  ].join("\n");
}

function probabilityLabel(score: number) {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function recommendationFromScores(intent: ConversationIntent | null, ppv: number, custom: number, churn: number, renewal: number) {
  if (churn >= 70) return "Prioritise retention outreach before upsell.";
  if (intent === "price_objection") return "Acknowledge price concern and offer a lower-friction option.";
  if (custom >= 70) return "Qualify custom request and prepare a custom offer.";
  if (ppv >= 70) return "Send a human-reviewed PPV follow-up.";
  if (renewal >= 70) return "Keep the conversation warm for renewal.";
  return "Continue relationship-building conversation.";
}

function suggestedScriptFromIntent(intent: ConversationIntent | null, ppv: number, custom: number, churn: number, renewal: number) {
  if (churn >= 70) return "Returning Subscriber Re-engagement";
  if (intent === "greeting") return "New Subscriber Welcome";
  if (custom >= 70 || intent === "custom_request") return "Custom Request Qualifier";
  if (ppv >= 70 || intent === "ppv_interest" || intent === "buying_signal") return "PPV Interest Follow-up";
  if (renewal >= 70) return "Expiring Subscriber Retention Offer";
  return "Welcome Script B";
}

function relativeDate(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const days = Math.max(0, Math.floor(diffMs / 86400000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function scriptActionMode(script: Record<string, unknown>): MessageScriptActionMode {
  if (script.action_mode === "auto_send") {
    return script.auto_send_enabled === false ? "draft_for_approval" : "auto_send";
  }
  if (script.action_mode === "task_only" || script.action_mode === "draft_for_approval") return script.action_mode;
  if (script.auto_send_enabled === true && script.requires_approval === false) return "auto_send";
  return "draft_for_approval";
}

function parseActionMode(value: unknown, fallback: MessageScriptActionMode): MessageScriptActionMode {
  if (value === "task_only" || value === "draft_for_approval" || value === "auto_send") return value;
  if (value == null || value === "") return fallback;
  throw new Error("Invalid script action mode");
}

function nonNegativeInteger(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : fallback;
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error("Expected a non-negative integer");
  return parsed;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function emptyToNull(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? null : value ?? null;
}

function assertNoError(error: { message: string; code?: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}
