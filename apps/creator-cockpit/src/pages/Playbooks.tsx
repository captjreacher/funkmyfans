import "@xyflow/react/dist/style.css";

import {
  BadgeAlert,
  BadgeDollarSign,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  CircleHelp,
  Filter,
  Gem,
  GitBranch,
  Hourglass,
  Map as MapIcon,
  MessageCircleMore,
  MessageSquareText,
  Package,
  PanelBottomClose,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  PauseCircle,
  Play,
  Plus,
  RefreshCw,
  Route,
  Save,
  ScanText,
  Send,
  Sparkles,
  Split,
  Tags,
  TimerOff,
  UserCheck,
  UsersRound,
  Workflow
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DragEvent, MouseEvent, ReactNode } from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps
} from "@xyflow/react";
import type {
  JourneyGraph,
  JourneyNode,
  JourneyNodeCapability,
  OfMessageScript,
  PlaybookJourney,
  QueueWorkspaceItemSummary,
  ScriptVisualBuilderConfig,
  ScriptVisualBuilderConnection,
  ScriptVisualBuilderNode,
  ScriptVisualBuilderNodeCategory,
  ScriptVisualBuilderNodeType
} from "@funkmyfans/of-types";
import {
  applyQueueItemAction,
  createCreatorScript,
  fetchQueueWorkspace,
  fetchScript,
  fetchScriptsWorkspace,
  fetchScriptJourney,
  saveScriptJourney,
  fetchSimulationDetail,
  saveScriptBuilder,
  simulationPurchase,
  simulationReply,
  startSimulation,
  updateScript,
  type SimulationDetailData,
  type ScriptsWorkspaceData
} from "../lib/api";
import {
  compileBuilderFlow,
  createBuilderNode,
  flowFromConversationFlow,
  getNodeRegistryEntry,
  nodeCategoryLabels,
  nodeRegistry,
  numberValue,
  stringValue,
  validateBuilderFlow,
  type FlowValidationIssue
} from "../lib/flowBuilder";
import { JourneyCanvas } from "../components/journey/JourneyCanvas";
import { JourneyNodeDrawer } from "../components/journey/JourneyNodeDrawer";
import { buildPlaybookJourney } from "../lib/journeyExamples";
import { channelLabel } from "../lib/journey";
import { deriveJourneyCapabilities } from "../lib/journeyContracts";

const libraryTabs = ["Template Library", "Drafts", "Active", "Archived"] as const;
type LibraryTab = (typeof libraryTabs)[number];
type InspectorTab = "properties" | "validation" | "variables";

type BuilderSession = {
  script: OfMessageScript;
  flow: ScriptVisualBuilderConfig;
  loadedAt: number;
};

type FlowNodeData = {
  label: string;
  type: ScriptVisualBuilderNodeType;
  category: ScriptVisualBuilderNodeCategory;
  icon: string;
  config: Record<string, unknown>;
  summary: string;
  issues: number;
  validationState: "valid" | "warning" | "error";
  validationMessage?: string;
  simulationState?: BuilderSimulationStepState;
  dimmed?: boolean;
  routeSummary?: NodeRouteSummary[];
  routeCollapsed?: boolean;
  routeCount?: number;
  onInlineEdit?: (nodeId: string, patch: Partial<ScriptVisualBuilderNode>) => void;
  onQuickAdd?: (sourceNodeId: string, type: ScriptVisualBuilderNodeType, sourceHandle?: string | null) => void;
  onToggleRoutes?: (nodeId: string) => void;
};
type NodeRouteSummary = {
  key: string;
  label: string;
  destinationLabel: string;
  destinationCount: number;
  validationState: "valid" | "warning" | "error";
};
type FlowNodeValidationState = FlowNodeData["validationState"];
type BuilderSimulationStepState = "pending" | "running" | "completed" | "waiting_queue" | "failed";
type BuilderSimulationTimelineItem = {
  id: string;
  stepId: string | null;
  label: string;
  detail: string;
  state: BuilderSimulationStepState;
  at: string | null;
};

type FlowNode = Node<FlowNodeData, "flowNode">;
type FlowEdge = Edge<{ label?: string; dimmed?: boolean }>;
type FlowEdgeInput = {
  id?: string;
  source: string;
  target: string;
  label?: string;
  sourceHandle?: string | null;
};
type FlowHistorySnapshot = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  selectedEdgeIds: string[];
};
type BuilderPanelState = {
  leftPanelOpen: boolean;
  inspectorOpen: boolean;
  simulationPanelOpen: boolean;
};
const fallbackRouteKey = "fallback";
const builderPanelStorageKey = "fmf.builderPanels.v1";

const iconMap: Record<string, LucideIcon> = {
  BadgeAlert,
  BadgeDollarSign,
  Bot,
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  Filter,
  Gem,
  GitBranch,
  Hourglass,
  MessageCircleMore,
  MessageSquareText,
  Package,
  PauseCircle,
  RefreshCw,
  Route,
  ScanText,
  Sparkles,
  Split,
  Tags,
  TimerOff,
  UserCheck,
  UsersRound,
  Workflow
};

const nodeTypes = { flowNode: FlowNodeCard };
const quickStepTemplates: Array<{ label: string; type: ScriptVisualBuilderNodeType }> = [
  { label: "Welcome message", type: "message" },
  { label: "Ask question", type: "ask_question" },
  { label: "Draft AI reply", type: "draft_reply" },
  { label: "Human approval", type: "approve" },
  { label: "PPV offer", type: "ppv_offer" },
  { label: "Follow-up", type: "delay" },
  { label: "End", type: "end" }
];

export function Playbooks({
  onOpenSimulations,
  onOpenBuilder
}: {
  onOpenSimulations?: (scriptId?: string) => void;
  onOpenBuilder?: () => void;
}) {
  const [workspace, setWorkspace] = useState<ScriptsWorkspaceData | null>(null);
  const [tab, setTab] = useState<LibraryTab>("Template Library");
  const [builderSession, setBuilderSession] = useState<BuilderSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatorFilter, setCreatorFilter] = useState<string>("all");

  useEffect(() => {
    void loadWorkspace();
  }, []);

  const scripts = workspace?.scripts ?? [];
  const filteredScripts = useMemo(() => {
    let list = scripts;
    if (tab === "Active") list = list.filter((script) => script.status === "active" && !script.builder_config?.workspace?.archivedAt);
    else if (tab === "Drafts") list = list.filter((script) => script.status !== "active" && !script.builder_config?.workspace?.archivedAt);
    else if (tab === "Archived") list = list.filter((script) => Boolean(script.builder_config?.workspace?.archivedAt));
    if (creatorFilter !== "all") list = list.filter((script) => script.creator_id === creatorFilter);
    return list;
  }, [scripts, tab, creatorFilter]);

  async function loadWorkspace(preferredId?: string) {
    try {
      const result = await fetchScriptsWorkspace();
      setWorkspace(result);
      if (preferredId) {
        const script = result.scripts.find((item) => item.id === preferredId);
        if (script) {
          const detail = await fetchScript(script.id);
          onOpenBuilder?.();
          setBuilderSession({ script: detail.script, flow: flowFromConversationFlow(detail.script), loadedAt: Date.now() });
        }
      }
      setError(null);
    } catch (loadError) {
      setError(errorMessage(loadError, "Unable to load playbooks"));
    }
  }

  async function createFlow(template?: OfMessageScript) {
    setBusy(true);
    try {
      const hydratedTemplate = template ? (await fetchScript(template.id)).script : undefined;
      const creatorId = hydratedTemplate?.creator_id ?? workspace?.creators[0]?.id;
      if (!creatorId) {
        setError("Connect a creator before creating a conversation flow.");
        return;
      }
      const response = await createCreatorScript(creatorId, {
        name: hydratedTemplate ? `${hydratedTemplate.name.replace(/\bScript\b/g, "Flow")} Draft` : "New Conversation Flow",
        description: hydratedTemplate?.description ?? "Conversation flow ready for builder configuration.",
        triggerEventType: hydratedTemplate?.trigger_event_type ?? "manual",
        autoSendEnabled: false,
        requiresApproval: true,
        actionMode: hydratedTemplate?.action_mode ?? "draft_for_approval",
        cooldownHours: hydratedTemplate?.cooldown_hours ?? 24,
        maxSendsPerFan: hydratedTemplate?.max_sends_per_fan ?? 1,
        folderName: hydratedTemplate?.folder_name ?? "Playbooks",
        category: hydratedTemplate?.category ?? "General",
        tags: hydratedTemplate?.tags?.length ? hydratedTemplate.tags : ["playbook", "flow"],
        builderConfig: {
          schemaVersion: 1,
          variables: hydratedTemplate?.builder_config?.variables ?? [
            { key: "subscriber_name", label: "Subscriber Name", defaultValue: "there" },
            { key: "creator_name", label: "Creator Name", defaultValue: "creator" }
          ],
          workspace: {
            archivedAt: null,
            execution: { mode: "immediate" },
            ai: { mode: "draft_only" },
            approval: { mode: "always_approve" },
            conditions: [],
            ...hydratedTemplate?.builder_config?.workspace
          }
        },
        steps: hydratedTemplate?.steps?.length
          ? hydratedTemplate.steps.map((step, index) => ({
              id: step.id,
              order: index,
              type: step.step_type,
              body: step.message_body ?? undefined,
              delayMinutes: step.delay_minutes ?? undefined,
              nextStepId: step.next_step_id ?? undefined,
              fallbackStepId: step.fallback_step_id ?? undefined,
              metadata: step.metadata
            }))
          : [{ order: 0, type: "message", body: "Hey {{subscriber_name}}, I wanted to reach out personally." }]
      });
      const result = await fetchScriptsWorkspace();
      setWorkspace(result);
      onOpenBuilder?.();
      setBuilderSession({ script: response.script, flow: flowFromConversationFlow(response.script), loadedAt: Date.now() });
      setError(null);
    } catch (createError) {
      setError(errorMessage(createError, "Unable to create conversation flow"));
    } finally {
      setBusy(false);
    }
  }

  async function saveFlow(session: BuilderSession, flow: ScriptVisualBuilderConfig, publish = false) {
    const issues = validateBuilderFlow(flow);
    const blocking = issues.filter((issue) => issue.severity === "error");
    if (blocking.length) {
      setError(`Resolve ${blocking.length} validation error${blocking.length === 1 ? "" : "s"} before saving.`);
      return false;
    }
    setBusy(true);
    try {
      const response = await saveScriptBuilder(session.script.id, compileBuilderFlow(session.script, flow));
      const nextScript = publish ? (await updateScript(response.script.id, { status: "active" })).script : response.script;
      await loadWorkspace(nextScript.id);
      setBuilderSession({ script: nextScript, flow: flowFromConversationFlow(nextScript), loadedAt: Date.now() });
      setError(null);
      return true;
    } catch (saveError) {
      setError(errorMessage(saveError, "Unable to save conversation flow"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function setFlowStatus(status: OfMessageScript["status"]) {
    if (!builderSession) return;
    setBusy(true);
    try {
      const result = await updateScript(builderSession.script.id, { status });
      await loadWorkspace(result.script.id);
      setBuilderSession({ script: result.script, flow: flowFromConversationFlow(result.script), loadedAt: Date.now() });
      setError(null);
    } catch (statusError) {
      setError(errorMessage(statusError, "Unable to update flow status"));
    } finally {
      setBusy(false);
    }
  }

  async function openBuilder(script: OfMessageScript) {
    try {
      const detail = await fetchScript(script.id);
      onOpenBuilder?.();
      setBuilderSession({ script: detail.script, flow: flowFromConversationFlow(detail.script), loadedAt: Date.now() });
      setError(null);
    } catch (openError) {
      setError(errorMessage(openError, "Unable to open conversation flow"));
    }
  }

  if (builderSession) {
    return (
      <PlaybookJourneyWorkspace
        session={builderSession}
        workspace={workspace}
        busy={busy}
        error={error}
        onBack={() => setBuilderSession(null)}
        onSave={(flow) => void saveFlow(builderSession, flow)}
        onPublish={(flow) => void saveFlow(builderSession, flow, true)}
        onSimulate={() => onOpenSimulations?.(builderSession.script.id)}
        onStatusChange={(status) => void setFlowStatus(status)}
      />
    );
  }

  return (
    <main className="animate-in-soft space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Playbooks</div>
          <h2 className="mt-1 text-2xl font-semibold text-white">Journeys</h2>
          <p className="mt-1 max-w-2xl text-sm text-blue-100/60">
            Each creator&rsquo;s automation as a journey between bounded capabilities. Open a journey to see its node map; drill into a node for detail. The technical step builder now lives one level down, inside a node.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void loadWorkspace()} className="inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50 hover:border-blue-300/40">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
          <button type="button" onClick={() => void createFlow()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-45">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New journey
          </button>
        </div>
      </header>

      {error ? <div className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <div className="premium-card flex flex-col gap-3 rounded-xl p-3 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex gap-1 overflow-x-auto rounded-lg bg-[#0b1c30]/60 p-1">
          {libraryTabs.map((item) => (
            <button key={item} type="button" onClick={() => setTab(item)} className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${tab === item ? "selected-glow text-white" : "text-blue-100/64 hover:bg-[#1A3655]/55 hover:text-white"}`}>
              {item}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-[#0b1c30]/60 px-3 py-2 text-sm text-blue-100/72">
            <Filter className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <span className="sr-only">Filter by creator</span>
            <select value={creatorFilter} onChange={(event) => setCreatorFilter(event.target.value)} className="bg-transparent text-sm font-semibold text-white outline-none">
              <option value="all" className="bg-[#0b1c30]">All creators</option>
              {(workspace?.creators ?? []).map((creator) => (
                <option key={creator.id} value={creator.id} className="bg-[#0b1c30]">
                  {creator.display_name || creator.username}
                </option>
              ))}
            </select>
          </label>
          <span className="whitespace-nowrap text-xs font-medium text-blue-100/50">{filteredScripts.length} shown</span>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filteredScripts.map((script) => (
          <article key={script.id} className="premium-card group flex flex-col gap-3 rounded-xl p-4 transition hover:border-cyan-300/40">
            <button type="button" onClick={() => void openBuilder(script)} className="min-w-0 text-left">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
                  <Route className="h-3.5 w-3.5" aria-hidden="true" />
                  Journey
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(script)}`}>{script.builder_config?.workspace?.archivedAt ? "archived" : script.status}</span>
              </div>
              <div className="mt-2 truncate text-base font-semibold text-white">{flowLabel(script.name)}</div>
              <div className="mt-1 line-clamp-2 text-xs text-blue-100/55">{script.description ?? script.category ?? "No description"}</div>
            </button>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-blue-100/60">
              <span className="inline-flex items-center gap-1"><UsersRound className="h-3.5 w-3.5 text-blue-100/45" aria-hidden="true" />{creatorLabel(workspace, script.creator_id)}</span>
              <span className="inline-flex items-center gap-1"><Route className="h-3.5 w-3.5 text-blue-100/45" aria-hidden="true" />{script.trigger_event_type}</span>
            </div>
            <div className="mt-auto flex gap-2">
              <button type="button" onClick={() => void openBuilder(script)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950">
                <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Open journey
              </button>
              <button type="button" onClick={() => void createFlow(script)} disabled={busy} className="rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-xs font-semibold text-blue-50 disabled:opacity-45">
                Duplicate
              </button>
            </div>
          </article>
        ))}
        {!filteredScripts.length ? <div className="premium-card rounded-xl px-4 py-10 text-center text-sm text-blue-100/58 sm:col-span-2 xl:col-span-3">No journeys in this view.</div> : null}
      </section>
    </main>
  );
}

function PlaybookJourneyWorkspace({
  session,
  workspace,
  busy,
  error,
  onBack,
  onSave,
  onPublish,
  onSimulate,
  onStatusChange
}: {
  session: BuilderSession;
  workspace: ScriptsWorkspaceData | null;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onSave: (flow: ScriptVisualBuilderConfig) => void;
  onPublish: (flow: ScriptVisualBuilderConfig) => void;
  onSimulate: () => void;
  onStatusChange: (status: OfMessageScript["status"]) => void;
}) {
  const [drill, setDrill] = useState<{ scriptId: string; label: string } | null>(null);
  const [drillSession, setDrillSession] = useState<BuilderSession | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);
  const [journey, setJourney] = useState<PlaybookJourney | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [draftGraph, setDraftGraph] = useState<JourneyGraph | null>(null);
  const [baselineGraphJson, setBaselineGraphJson] = useState("");
  const [journeyLoading, setJourneyLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [journeyError, setJourneyError] = useState<string | null>(null);

  const creatorName = useMemo(() => creatorLabel(workspace, session.script.creator_id), [workspace, session.script.creator_id]);

  // Load the persisted journey; fall back to the NODE-1B derivation when none
  // exists (or if the backend is unreachable) so playbooks always open.
  useEffect(() => {
    let cancelled = false;
    setJourneyLoading(true);
    setJourneyError(null);
    setDraftGraph(null);
    void (async () => {
      let loaded: PlaybookJourney;
      let fromServer = false;
      try {
        const result = await fetchScriptJourney(session.script.id);
        if (result.journey) {
          loaded = result.journey;
          fromServer = true;
        } else {
          loaded = buildPlaybookJourney(session.script, creatorName);
        }
      } catch {
        loaded = buildPlaybookJourney(session.script, creatorName);
      }
      if (cancelled) return;
      setJourney(loaded);
      setPersisted(fromServer);
      setBaselineGraphJson(JSON.stringify(loaded.graph));
      setJourneyLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session.script, creatorName]);

  const openNode = useMemo<JourneyNode | null>(() => journey?.graph.nodes.find((node) => node.id === openNodeId) ?? null, [journey, openNodeId]);

  // NODE-1E: derive capability contracts for the current journey. The only
  // evidence consulted is referenced-script existence (checked against the
  // loaded workspace scripts + this playbook's own script). No runtime or
  // operational health is read. Memoised on journey identity + evidence so the
  // canvas keeps node identity stable across drags.
  const knownScriptIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of workspace?.scripts ?? []) ids.add(item.id);
    ids.add(session.script.id);
    return ids;
  }, [workspace, session.script.id]);

  const sourceChannelLabel = useMemo(() => {
    const channels = (journey?.graph.nodes ?? []).filter((node) => node.class === "channel");
    if (channels.length !== 1) return undefined;
    const channel = channels[0];
    if (channel.class !== "channel") return undefined;
    const base = channelLabel(channel.config.channel);
    return channel.config.accountLabel ? `${base} · ${channel.config.accountLabel}` : base;
  }, [journey]);

  const capabilityById = useMemo<Record<string, JourneyNodeCapability>>(
    () =>
      journey
        ? deriveJourneyCapabilities(journey.graph.nodes, {
            scriptExists: (id) => knownScriptIds.has(id),
            sourceChannelLabel
          })
        : {},
    [journey, knownScriptIds, sourceChannelLabel]
  );

  const dirty = Boolean(draftGraph) && JSON.stringify(draftGraph) !== baselineGraphJson;
  const canSave = !journeyLoading && Boolean(journey) && (dirty || !persisted);

  async function handleSaveJourney() {
    if (!journey) return;
    setSaving(true);
    setJourneyError(null);
    try {
      const payload: PlaybookJourney = { ...journey, graph: draftGraph ?? journey.graph };
      const result = await saveScriptJourney(session.script.id, payload);
      setJourney(result.journey);
      setPersisted(true);
      setBaselineGraphJson(JSON.stringify(result.journey.graph));
      setDraftGraph(result.journey.graph);
    } catch (saveErr) {
      setJourneyError(errorMessage(saveErr, "Unable to save journey"));
    } finally {
      setSaving(false);
    }
  }

  // Resolve the drill session from the node's nodeFlowRef. When the reference is
  // the playbook's own script (the case today) reuse the parent session so its
  // save/publish/simulate/status wiring is untouched; otherwise load that script.
  useEffect(() => {
    if (!drill) {
      setDrillSession(null);
      setDrillLoading(false);
      return;
    }
    if (drill.scriptId === session.script.id) {
      setDrillSession(session);
      setDrillLoading(false);
      return;
    }
    let cancelled = false;
    setDrillLoading(true);
    void (async () => {
      try {
        const detail = await fetchScript(drill.scriptId);
        if (cancelled) return;
        setDrillSession({ script: detail.script, flow: flowFromConversationFlow(detail.script), loadedAt: Date.now() });
      } catch (err) {
        if (cancelled) return;
        setJourneyError(errorMessage(err, "Unable to open node flow"));
        setDrill(null);
      } finally {
        if (!cancelled) setDrillLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [drill, session]);

  function openNodeFlow(node: JourneyNode) {
    const ref = node.nodeFlowRef;
    if (!ref || ref.kind !== "script") return;
    // Fold unsaved journey positions into the in-memory journey so returning from
    // the node flow restores them (unsaved changes are not lost on drill).
    if (draftGraph) setJourney((prev) => (prev ? { ...prev, graph: draftGraph } : prev));
    setOpenNodeId(null);
    setDrill({ scriptId: ref.scriptId, label: node.label });
  }

  function openPrimaryNodeFlow() {
    const primary =
      journey?.graph.nodes.find(
        (node) => node.class === "conversation" && node.nodeFlowRef?.kind === "script" && node.nodeFlowRef.scriptId === session.script.id
      ) ?? journey?.graph.nodes.find((node) => node.nodeFlowRef?.kind === "script");
    if (primary) {
      openNodeFlow(primary);
      return;
    }
    if (draftGraph) setJourney((prev) => (prev ? { ...prev, graph: draftGraph } : prev));
    setDrill({ scriptId: session.script.id, label: flowLabel(session.script.name) });
  }

  async function saveReferencedFlow(scriptId: string, flow: ScriptVisualBuilderConfig, publish: boolean) {
    if (!drillSession) return;
    const blocking = validateBuilderFlow(flow).filter((issue) => issue.severity === "error");
    if (blocking.length) {
      setJourneyError(`Resolve ${blocking.length} validation error${blocking.length === 1 ? "" : "s"} before saving.`);
      return;
    }
    try {
      const response = await saveScriptBuilder(scriptId, compileBuilderFlow(drillSession.script, flow));
      const next = publish ? (await updateScript(response.script.id, { status: "active" })).script : response.script;
      setDrillSession({ script: next, flow: flowFromConversationFlow(next), loadedAt: Date.now() });
      setJourneyError(null);
    } catch (err) {
      setJourneyError(errorMessage(err, "Unable to save node flow"));
    }
  }

  async function updateReferencedStatus(scriptId: string, status: OfMessageScript["status"]) {
    try {
      const result = await updateScript(scriptId, { status });
      setDrillSession({ script: result.script, flow: flowFromConversationFlow(result.script), loadedAt: Date.now() });
      setJourneyError(null);
    } catch (err) {
      setJourneyError(errorMessage(err, "Unable to update node flow status"));
    }
  }

  // Drill-down: enter one bounded node's existing Node Flow, then return to the
  // same journey context (the load effect stays keyed on the playbook script, so
  // returning does not re-derive the journey).
  if (drill) {
    const isParentFlow = drill.scriptId === session.script.id;
    return (
      <main className="animate-in-soft flex h-full min-h-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex min-w-0 items-center gap-2 text-sm text-blue-100/60">
            <button type="button" onClick={() => setDrill(null)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 font-semibold text-blue-50 hover:border-blue-300/40">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Journey
            </button>
            <span className="text-blue-100/30">/</span>
            <span className="truncate font-medium text-white">{journey?.title ?? flowLabel(session.script.name)}</span>
            <span className="text-blue-100/30">/</span>
            <span className="inline-flex items-center gap-1.5 truncate text-cyan-300">
              <Workflow className="h-3.5 w-3.5" aria-hidden="true" />
              Node flow: {drill.label}
            </span>
          </nav>
          <button type="button" onClick={() => setDrill(null)} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Return to journey
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {drillLoading || !drillSession ? (
            <div className="flex h-full items-center justify-center text-sm text-blue-100/55">Loading node flow…</div>
          ) : (
            <ReactFlowProvider>
              <ConversationFlowBuilder
                session={drillSession}
                workspace={workspace}
                busy={busy}
                error={error}
                onBack={() => setDrill(null)}
                onSave={isParentFlow ? onSave : (flow) => void saveReferencedFlow(drill.scriptId, flow, false)}
                onPublish={isParentFlow ? onPublish : (flow) => void saveReferencedFlow(drill.scriptId, flow, true)}
                onSimulate={onSimulate}
                onStatusChange={isParentFlow ? onStatusChange : (status) => void updateReferencedStatus(drill.scriptId, status)}
              />
            </ReactFlowProvider>
          )}
        </div>
      </main>
    );
  }

  const statusLabel = session.script.builder_config?.workspace?.archivedAt ? "archived" : session.script.status;
  const saveStateLabel = saving ? "Saving…" : dirty ? "Unsaved changes" : persisted ? "Saved" : "Not saved yet";

  return (
    <main className="animate-in-soft flex h-full min-h-0 flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50 hover:border-blue-300/40">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Journeys
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              <Route className="h-3.5 w-3.5" aria-hidden="true" />
              Journey
            </div>
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-semibold text-white">{journey?.title ?? flowLabel(session.script.name)}</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone(session.script)}`}>{statusLabel}</span>
            </div>
            <div className="truncate text-xs text-blue-100/55">{creatorName}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-blue-100/55">{saveStateLabel}</span>
          <button type="button" onClick={() => void handleSaveJourney()} disabled={!canSave || saving} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-45">
            <Save className="h-4 w-4" aria-hidden="true" />
            Save journey
          </button>
          <button type="button" onClick={onSimulate} className="inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50 hover:border-blue-300/40">
            <Play className="h-4 w-4" aria-hidden="true" />
            Simulate
          </button>
          <button type="button" onClick={openPrimaryNodeFlow} className="inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50 hover:border-blue-300/40">
            <Workflow className="h-4 w-4" aria-hidden="true" />
            Open node flow
          </button>
        </div>
      </header>

      {journeyError || error ? <div className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{journeyError ?? error}</div> : null}

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl premium-card">
        {journeyLoading || !journey ? (
          <div className="flex h-full items-center justify-center text-sm text-blue-100/55">Loading journey…</div>
        ) : (
          <>
            <JourneyCanvas
              key={session.script.id}
              journey={journey}
              onOpenNode={setOpenNodeId}
              onGraphChange={setDraftGraph}
              capabilityById={capabilityById}
              onDrillNode={(id) => {
                const node = journey.graph.nodes.find((item) => item.id === id);
                if (node) openNodeFlow(node);
              }}
            />
            <JourneyNodeDrawer
              node={openNode}
              capability={openNode ? capabilityById[openNode.id] : null}
              onClose={() => setOpenNodeId(null)}
              onOpenNodeFlow={(node) => openNodeFlow(node)}
            />
          </>
        )}
      </div>

      <p className="px-1 text-xs text-blue-100/50">
        Journey view shows bounded capabilities. Open a node to work inside its existing flow, then return here &mdash; runtime execution is unchanged.
      </p>
    </main>
  );
}

function ConversationFlowBuilder({
  session,
  workspace,
  busy,
  error,
  onBack,
  onSave,
  onPublish,
  onSimulate,
  onStatusChange
}: {
  session: BuilderSession;
  workspace: ScriptsWorkspaceData | null;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onSave: (flow: ScriptVisualBuilderConfig) => void;
  onPublish: (flow: ScriptVisualBuilderConfig) => void;
  onSimulate: () => void;
  onStatusChange: (status: OfMessageScript["status"]) => void;
}) {
  const initialIssues = useMemo(() => validateBuilderFlow(session.flow), [session.flow]);
  const [nodes, setNodes] = useState<FlowNode[]>(() => toReactFlowNodes(session.flow, initialIssues));
  const [edges, setEdges] = useState<FlowEdge[]>(() => toReactFlowEdges(session.flow));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(session.flow.selectedNodeId ?? session.flow.nodes[0]?.id ?? null);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("properties");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [historyPast, setHistoryPast] = useState<FlowHistorySnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<FlowHistorySnapshot[]>([]);
  const [branchDisclosure, setBranchDisclosure] = useState<Record<string, boolean>>({});
  const [simulationDetail, setSimulationDetail] = useState<SimulationDetailData | null>(null);
  const [simulationQueueItem, setSimulationQueueItem] = useState<QueueWorkspaceItemSummary | null>(null);
  const [simulationBusy, setSimulationBusy] = useState<string | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [manualReplyText, setManualReplyText] = useState("Manual operator reply for this simulation.");
  const [panelState, setPanelState] = useState<BuilderPanelState>(() => readBuilderPanelState());
  const [pathFocusEnabled, setPathFocusEnabled] = useState(false);
  const [miniMapOpen, setMiniMapOpen] = useState(false);
  const { screenToFlowPosition, getViewport, fitView } = useReactFlow();

  const flow = useMemo(() => fromReactFlow(nodes, edges, selectedNodeId, getViewport()), [edges, getViewport, nodes, selectedNodeId]);
  const validation = useMemo(() => validateBuilderFlow(flow), [flow]);
  const selectedBuilderNode = flow.nodes.find((node) => node.id === selectedNodeId) ?? flow.nodes[0] ?? null;
  const simulationTimeline = useMemo(() => buildSimulationTimeline(simulationDetail, flow), [flow, simulationDetail]);
  const simulationStates = useMemo(() => buildSimulationStepStates(flow, simulationDetail, simulationQueueItem), [flow, simulationDetail, simulationQueueItem]);
  const focusedPathNodeIds = useMemo(
    () => (pathFocusEnabled ? focusedPathFromSelection(nodes, edges, selectedNodeId, selectedEdgeIds) : null),
    [edges, nodes, pathFocusEnabled, selectedEdgeIds, selectedNodeId]
  );
  const deleteKeyCode = useMemo(() => ["Backspace", "Delete"], []);
  const multiSelectionKeyCode = useMemo(() => ["Shift"], []);
  const builderGridTemplate = `${panelState.leftPanelOpen ? "250px " : ""}minmax(0,1fr)${panelState.inspectorOpen ? " 420px" : ""}`;

  const currentSnapshot = useCallback(
    (): FlowHistorySnapshot => ({
      nodes: cloneNodes(nodes),
      edges: cloneEdges(edges),
      selectedNodeId,
      selectedEdgeIds: [...selectedEdgeIds]
    }),
    [edges, nodes, selectedEdgeIds, selectedNodeId]
  );

  const pushHistory = useCallback(() => {
    setHistoryPast((current) => [...current.slice(-49), currentSnapshot()]);
    setHistoryFuture([]);
  }, [currentSnapshot]);

  useEffect(() => {
    const nextFlow = flowFromConversationFlow(session.script);
    const nextIssues = validateBuilderFlow(nextFlow);
    setNodes(toReactFlowNodes(nextFlow, nextIssues));
    setEdges(toReactFlowEdges(nextFlow));
    setSelectedNodeId(nextFlow.selectedNodeId ?? nextFlow.nodes[0]?.id ?? null);
    setSelectedEdgeIds([]);
    setBranchDisclosure(
      nextFlow.nodes.reduce((acc, node) => {
        if (isBranchNodeType(node.type)) acc[node.id] = false;
        return acc;
      }, {} as Record<string, boolean>)
    );
    setHistoryPast([]);
    setHistoryFuture([]);
    setSimulationDetail(null);
    setSimulationQueueItem(null);
    setSimulationError(null);
  }, [session.script]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => fitView({ padding: 0.12, duration: 350 }));
    return () => window.cancelAnimationFrame(frame);
  }, [fitView, session.loadedAt]);

  useEffect(() => {
    try {
      window.localStorage.setItem(builderPanelStorageKey, JSON.stringify(panelState));
    } catch {
      // Panel persistence is a convenience; ignore storage failures.
    }
  }, [panelState]);

  const restoreSnapshot = useCallback((snapshot: FlowHistorySnapshot) => {
    setNodes(cloneNodes(snapshot.nodes));
    setEdges(cloneEdges(snapshot.edges));
    setSelectedNodeId(snapshot.selectedNodeId);
    setSelectedEdgeIds([...snapshot.selectedEdgeIds]);
  }, []);

  const undo = useCallback(() => {
    setHistoryPast((past) => {
      const previous = past.at(-1);
      if (!previous) return past;
      setHistoryFuture((future) => [currentSnapshot(), ...future.slice(0, 49)]);
      restoreSnapshot(previous);
      return past.slice(0, -1);
    });
  }, [currentSnapshot, restoreSnapshot]);

  const redo = useCallback(() => {
    setHistoryFuture((future) => {
      const next = future[0];
      if (!next) return future;
      setHistoryPast((past) => [...past.slice(-49), currentSnapshot()]);
      restoreSnapshot(next);
      return future.slice(1);
    });
  }, [currentSnapshot, restoreSnapshot]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"))) {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [redo, undo]);

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      if (changes.some((change) => change.type === "remove")) pushHistory();
      setNodes((current) => applyNodeChanges(changes, current));
    },
    [pushHistory, setNodes]
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<FlowEdge>[]) => {
      if (changes.some((change) => change.type === "remove")) pushHistory();
      setEdges((current) => applyEdgeChanges(changes, current));
    },
    [pushHistory, setEdges]
  );
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    pushHistory();
    setEdges((current) =>
      addEdge(
        buildFlowEdge({
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle
        }),
        current
      )
    );
  }, [pushHistory]);

  const updateNodeInline = useCallback((nodeId: string, patch: Partial<ScriptVisualBuilderNode>) => {
    pushHistory();
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId) return node;
        const nextBuilder = {
          id: node.id,
          type: node.data.type,
          label: patch.label ?? node.data.label,
          category: node.data.category,
          x: node.position.x,
          y: node.position.y,
          config: patch.config ?? node.data.config
        };
        return toReactFlowNode(nextBuilder, validation);
      })
    );
  }, [pushHistory, validation]);

  const toggleBranchDisclosure = useCallback((nodeId: string) => {
    setBranchDisclosure((current) => ({ ...current, [nodeId]: !current[nodeId] }));
  }, []);

  function updateSelectedNode(patch: Partial<ScriptVisualBuilderNode>) {
    if (!selectedBuilderNode) return;
    pushHistory();
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== selectedBuilderNode.id) return node;
        const nextBuilder = { ...selectedBuilderNode, ...patch, config: patch.config ?? selectedBuilderNode.config };
        return toReactFlowNode(nextBuilder, validation);
      })
    );
  }

  function addNode(type: ScriptVisualBuilderNodeType, position = { x: 180, y: 180 }) {
    const builderNode = createAuthoringStep(type, position);
    pushHistory();
    setNodes((current) => [...current, toReactFlowNode(builderNode, validation)]);
    setSelectedNodeId(builderNode.id);
    setSelectedEdgeIds([]);
    setInspectorTab("properties");
    setPanelState((current) => ({ ...current, inspectorOpen: true }));
  }

  const quickAddStep = useCallback((sourceNodeId: string, type: ScriptVisualBuilderNodeType, sourceHandle?: string | null) => {
    const sourceNode = nodes.find((node) => node.id === sourceNodeId);
    if (!sourceNode) return;
    const position = {
      x: sourceNode.position.x + 300,
      y: sourceNode.position.y + routeHandleOffset(sourceNode.data.config, sourceHandle)
    };
    const builderNode = createAuthoringStep(type, position);
    const edge = buildFlowEdge({
      source: sourceNodeId,
      target: builderNode.id,
      sourceHandle: sourceHandle ?? null
    });
    pushHistory();
    setNodes((current) => [...current, toReactFlowNode(builderNode, validation)]);
    setEdges((current) => addEdge(edge, current));
    setSelectedNodeId(builderNode.id);
    setSelectedEdgeIds([]);
    setInspectorTab("properties");
    setPanelState((current) => ({ ...current, inspectorOpen: true }));
  }, [nodes, pushHistory, validation]);

  const renderedNodes = useMemo(
    () => {
      const nodeById = new Map(nodes.map((item) => [item.id, item]));
      return nodes.map((node) => {
        const routeSummary = routeSummaryForNode(node, flow.connections, validation, nodeById);
        return withAuthoringData(
          node,
          validation,
          {
            onInlineEdit: updateNodeInline,
            onQuickAdd: quickAddStep,
            onToggleRoutes: toggleBranchDisclosure,
            routeSummary,
            routeCollapsed: isBranchNodeType(node.data.type) ? !Boolean(branchDisclosure[node.id]) : false,
            routeCount: routeSummary.length
          },
          simulationStates.get(node.id),
          Boolean(focusedPathNodeIds && !focusedPathNodeIds.has(node.id))
        );
      });
    },
    [branchDisclosure, flow.connections, flow.nodes, focusedPathNodeIds, nodes, quickAddStep, simulationStates, toggleBranchDisclosure, updateNodeInline, validation]
  );
  const renderedEdges = useMemo(
    () => edges.map((edge) => withEdgeFocusState(edge, focusedPathNodeIds)),
    [edges, focusedPathNodeIds]
  );

  const onBuilderNodeDragStart = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const onBuilderNodeDoubleClick = useCallback((_: MouseEvent, node: FlowNode) => {
    setSelectedNodeId((current) => (current === node.id ? current : node.id));
    setSelectedEdgeIds((current) => (current.length ? [] : current));
    setInspectorTab("properties");
    setEditingNodeId(node.id);
    setPanelState((current) => ({ ...current, inspectorOpen: true }));
  }, []);

  const onBuilderNodeClick = useCallback((_: MouseEvent, node: FlowNode) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeIds([]);
    setInspectorTab("properties");
    setEditingNodeId(node.id);
    setPanelState((current) => (current.inspectorOpen ? current : { ...current, inspectorOpen: true }));
  }, []);

  const onBuilderEdgeDoubleClick = useCallback((event: MouseEvent, edge: FlowEdge) => {
    event.preventDefault();
    pushHistory();
    setEdges((current) => current.filter((item) => item.id !== edge.id));
    setSelectedEdgeIds((current) => (current.length ? [] : current));
  }, [pushHistory]);

  const onBuilderSelectionChange = useCallback(({ nodes: selectedNodes, edges: selectedEdges }: { nodes: FlowNode[]; edges: FlowEdge[] }) => {
    const nextNodeId = selectedNodes[0]?.id ?? null;
    const nextEdgeIds = selectedEdges.map((edge) => edge.id);
    setSelectedNodeId((current) => (current === nextNodeId ? current : nextNodeId));
    setSelectedEdgeIds((current) => (sameStringArray(current, nextEdgeIds) ? current : nextEdgeIds));
    if (nextNodeId) {
      setInspectorTab("properties");
      setEditingNodeId(nextNodeId);
      setPanelState((current) => (current.inspectorOpen ? current : { ...current, inspectorOpen: true }));
    } else if (!nextEdgeIds.length) {
      setEditingNodeId(null);
      setPanelState((current) => ({ ...current, inspectorOpen: false }));
    }
  }, []);

  const isValidBuilderConnection = useCallback(
    (connection: Connection | FlowEdge) => Boolean(connection.source && connection.target && connection.source !== connection.target),
    []
  );

  function handleDragStart(event: DragEvent<HTMLButtonElement>, type: ScriptVisualBuilderNodeType) {
    event.dataTransfer.setData("application/funkmyfans-node", type);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/funkmyfans-node") as ScriptVisualBuilderNodeType;
    if (!type) return;
    addNode(type, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function deleteSelected() {
    if (!selectedNodeId && !selectedEdgeIds.length) return;
    pushHistory();
    setNodes((current) => (selectedNodeId ? current.filter((node) => node.id !== selectedNodeId) : current));
    setEdges((current) => current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId && !selectedEdgeIds.includes(edge.id)));
    setSelectedNodeId(null);
    setSelectedEdgeIds([]);
  }

  function arrangeSteps() {
    pushHistory();
    const arranged = arrangeFlowNodes(nodes, edges);
    setNodes(arranged);
    window.requestAnimationFrame(() => fitView({ padding: 0.12, duration: 350 }));
  }

  async function runBuilderSimulation() {
    setPanelState((current) => ({ ...current, simulationPanelOpen: true }));
    setSimulationBusy("run");
    try {
      const result = await startSimulation(session.script.creator_id, {
        scriptId: session.script.id,
        eventType: triggerEventType(flow, session.script),
        subscriber: defaultBuilderSimulationSubscriber(),
        variables: {
          subscriber_name: "Mason",
          creator_name: creatorLabel(workspace, session.script.creator_id),
          fan: { name: "Mason", total_spend: 180, last_purchase: null },
          creator: { name: creatorLabel(workspace, session.script.creator_id) },
          journey: { source: "builder_simulation" },
          conversation: { summary: "Builder simulation run" }
        }
      });
      await setSimulationResult(result);
      setSimulationError(null);
      void pollSimulation(result.simulation.id);
    } catch (runError) {
      setSimulationError(errorMessage(runError, "Unable to run builder simulation"));
    } finally {
      setSimulationBusy(null);
    }
  }

  async function runSimulationAction(action: string, runner: () => Promise<SimulationDetailData>) {
    if (!simulationDetail?.simulation.id) return;
    setPanelState((current) => ({ ...current, simulationPanelOpen: true }));
    setSimulationBusy(action);
    try {
      const result = await runner();
      await setSimulationResult(result);
      setSimulationError(null);
      void pollSimulation(result.simulation.id);
    } catch (actionError) {
      setSimulationError(errorMessage(actionError, "Unable to update builder simulation"));
    } finally {
      setSimulationBusy(null);
    }
  }

  async function runQueueAction(action: "approve_ai" | "respond" | "ignore") {
    if (!simulationQueueItem) {
      setSimulationError("No active queue approval is available for this simulation.");
      return;
    }
    await runSimulationAction(action, async () => {
      await applyQueueItemAction(simulationQueueItem.id, action, {
        actor: "operator",
        responseText: action === "respond" ? manualReplyText : undefined,
        note: action === "ignore" ? "Ignored from builder simulation." : undefined
      });
      return fetchSimulationDetail(simulationDetail!.simulation.id);
    });
  }

  async function setSimulationResult(result: SimulationDetailData) {
    setSimulationDetail(result);
    if (result.conversation?.id) {
      const queueWorkspace = await fetchQueueWorkspace({ status: "visible" });
      const item = queueWorkspace.items.find((entry) => entry.conversation?.id === result.conversation?.id && entry.status !== "resolved") ?? null;
      setSimulationQueueItem(item);
    } else {
      setSimulationQueueItem(null);
    }
  }

  async function pollSimulation(simulationId: string) {
    for (let index = 0; index < 4; index += 1) {
      await delay(900);
      try {
        const result = await fetchSimulationDetail(simulationId);
        await setSimulationResult(result);
        if (result.simulation.status !== "running" && result.conversation?.status !== "running") return;
      } catch {
        return;
      }
    }
  }

  return (
    <main className="animate-in-soft flex min-h-[calc(100vh-9rem)] flex-col rounded-lg border border-blue-500/18 bg-[#071423]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-blue-500/18 bg-[#0B1828]/95 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-white">{flowLabel(session.script.name)}</div>
            <div className="truncate text-xs text-blue-100/58">{creatorLabel(workspace, session.script.creator_id)} · {session.script.trigger_event_type} · {session.script.status}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <BuilderPanelToggle
            active={panelState.leftPanelOpen}
            activeLabel="Hide Steps"
            inactiveLabel="Steps"
            activeIcon={PanelLeftClose}
            inactiveIcon={PanelLeftOpen}
            onClick={() => setPanelState((current) => ({ ...current, leftPanelOpen: !current.leftPanelOpen }))}
          />
          <BuilderPanelToggle
            active={panelState.inspectorOpen}
            activeLabel="Hide Properties"
            inactiveLabel="Properties"
            activeIcon={PanelRightClose}
            inactiveIcon={PanelRightOpen}
            onClick={() => setPanelState((current) => ({ ...current, inspectorOpen: !current.inspectorOpen }))}
          />
          <BuilderPanelToggle
            active={panelState.simulationPanelOpen}
            activeLabel="Hide Execution"
            inactiveLabel="Execution"
            activeIcon={PanelBottomClose}
            inactiveIcon={PanelBottomOpen}
            onClick={() => setPanelState((current) => ({ ...current, simulationPanelOpen: !current.simulationPanelOpen }))}
          />
          <button type="button" onClick={undo} disabled={!historyPast.length || busy} className="rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50 disabled:opacity-45">
            Undo
          </button>
          <button type="button" onClick={redo} disabled={!historyFuture.length || busy} className="rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50 disabled:opacity-45">
            Redo
          </button>
          <button type="button" onClick={deleteSelected} disabled={(!selectedNodeId && !selectedEdgeIds.length) || busy} className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100 disabled:opacity-45">
            Delete
          </button>
          <button type="button" onClick={arrangeSteps} disabled={busy} className="rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50 disabled:opacity-45">
            Arrange
          </button>
          <button type="button" onClick={() => setPathFocusEnabled((current) => !current)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${pathFocusEnabled ? "border-cyan-300/28 bg-cyan-400/12 text-cyan-100" : "border-blue-400/20 bg-[#102338]/72 text-blue-50"}`}>
            <Route className="h-4 w-4" aria-hidden="true" />
            Focus Path
          </button>
          <button type="button" onClick={() => setMiniMapOpen((current) => !current)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${miniMapOpen ? "border-cyan-300/28 bg-cyan-400/12 text-cyan-100" : "border-blue-400/20 bg-[#102338]/72 text-blue-50"}`}>
            <MapIcon className="h-4 w-4" aria-hidden="true" />
            Map
          </button>
          <button type="button" onClick={() => onSave(flow)} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-45">
            <Save className="h-4 w-4" aria-hidden="true" />
            {busy ? "Saving..." : "Save"}
          </button>
          <button type="button" onClick={onSimulate} className="inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-[#102338]/72 px-4 py-2 text-sm font-semibold text-blue-50">
            <Play className="h-4 w-4" aria-hidden="true" />
            Open Simulations
          </button>
          <button type="button" onClick={() => void runBuilderSimulation()} disabled={busy || Boolean(simulationBusy)} className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-400/14 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-45">
            <Play className="h-4 w-4" aria-hidden="true" />
            {simulationBusy === "run" ? "Running..." : "Run Simulation"}
          </button>
          <button type="button" onClick={() => onStatusChange(session.script.status === "active" ? "inactive" : "active")} disabled={busy} className="rounded-lg border border-blue-400/20 bg-[#102338]/72 px-4 py-2 text-sm font-semibold text-blue-50 disabled:opacity-45">
            {session.script.status === "active" ? "Deactivate" : "Activate"}
          </button>
          <button type="button" onClick={() => onPublish(flow)} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/25 bg-emerald-400/14 px-4 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-45">
            <Send className="h-4 w-4" aria-hidden="true" />
            Publish
          </button>
        </div>
      </div>

      {error ? <div className="shrink-0 border-b border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: builderGridTemplate }}>
        {panelState.leftPanelOpen ? <NodeLibrary onDragStart={handleDragStart} onAddNode={addNode} /> : null}

        <section className="relative min-h-[560px] min-w-0 overflow-hidden bg-[#06111d]" onDrop={handleDrop} onDragOver={handleDragOver}>
          <ReactFlow<FlowNode, FlowEdge>
            className="h-full w-full"
            nodes={renderedNodes}
            edges={renderedEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onBuilderNodeClick}
            onNodeDragStart={onBuilderNodeDragStart}
            onNodeDoubleClick={onBuilderNodeDoubleClick}
            onEdgeDoubleClick={onBuilderEdgeDoubleClick}
            onSelectionChange={onBuilderSelectionChange}
            isValidConnection={isValidBuilderConnection}
            fitView
            deleteKeyCode={deleteKeyCode}
            multiSelectionKeyCode={multiSelectionKeyCode}
          >
            <Background variant={BackgroundVariant.Dots} color="rgba(59,130,246,.30)" gap={24} size={1} />
            {miniMapOpen ? <MiniMap pannable zoomable nodeStrokeWidth={3} nodeColor={(node) => categoryColor((node.data as Partial<FlowNodeData>).category)} /> : null}
            <Controls />
          </ReactFlow>
        </section>

        {panelState.inspectorOpen ? (
          <Inspector
            tab={inspectorTab}
            onTabChange={setInspectorTab}
            node={selectedBuilderNode}
            flow={flow}
            validation={validation}
            onUpdateNode={updateSelectedNode}
            editingNodeId={editingNodeId}
            onEditingHandled={() => setEditingNodeId(null)}
            onClose={() => setPanelState((current) => ({ ...current, inspectorOpen: false }))}
          />
        ) : null}
      </div>

      {panelState.simulationPanelOpen ? (
        <BuilderSimulationDebugger
          detail={simulationDetail}
          queueItem={simulationQueueItem}
          timeline={simulationTimeline}
          busy={simulationBusy}
          error={simulationError}
          manualReplyText={manualReplyText}
          onManualReplyTextChange={setManualReplyText}
          onApproveAi={() => void runQueueAction("approve_ai")}
          onManualReply={() => void runQueueAction("respond")}
          onIgnore={() => void runQueueAction("ignore")}
          onPurchaseSuccess={() => void runSimulationAction("purchase_success", () => simulationPurchase(simulationDetail!.simulation.id, true))}
          onPurchaseFailure={() => void runSimulationAction("purchase_failure", () => simulationPurchase(simulationDetail!.simulation.id, false))}
          onSendReply={() => void runSimulationAction("reply", () => simulationReply(simulationDetail!.simulation.id, manualReplyText))}
          onHide={() => setPanelState((current) => ({ ...current, simulationPanelOpen: false }))}
        />
      ) : null}
    </main>
  );
}

function BuilderPanelToggle({
  active,
  activeLabel,
  inactiveLabel,
  activeIcon: ActiveIcon,
  inactiveIcon: InactiveIcon,
  onClick
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  activeIcon: LucideIcon;
  inactiveIcon: LucideIcon;
  onClick: () => void;
}) {
  const Icon = active ? ActiveIcon : InactiveIcon;
  const label = active ? activeLabel : inactiveLabel;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${active ? "border-cyan-300/28 bg-cyan-400/12 text-cyan-100" : "border-blue-400/20 bg-[#102338]/72 text-blue-50"}`}
      title={label}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function NodeLibrary({ onDragStart, onAddNode }: { onDragStart: (event: DragEvent<HTMLButtonElement>, type: ScriptVisualBuilderNodeType) => void; onAddNode: (type: ScriptVisualBuilderNodeType) => void }) {
  const grouped = useMemo(
    () =>
      nodeRegistry.reduce(
        (acc, node) => {
          if (!acc[node.category]) acc[node.category] = [];
          acc[node.category].push(node);
          return acc;
        },
        {} as Record<ScriptVisualBuilderNodeCategory, typeof nodeRegistry>
      ),
    []
  );
  return (
    <aside className="min-h-0 overflow-y-auto border-r border-blue-500/18 bg-[#081524] p-3">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">Step Library</div>
      <div className="space-y-4">
        {(Object.keys(nodeCategoryLabels) as ScriptVisualBuilderNodeCategory[]).map((category) => (
          <div key={category}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-100/48">{nodeCategoryLabels[category]}</div>
            <div className="space-y-2">
              {(grouped[category] ?? []).map((node) => {
                const Icon = iconMap[node.icon] ?? Sparkles;
                return (
                  <button
                    key={node.type}
                    type="button"
                    draggable
                    onDragStart={(event) => onDragStart(event, node.type)}
                    onDoubleClick={() => onAddNode(node.type)}
                    className="flex w-full items-center gap-3 rounded-lg border border-blue-500/15 bg-[#102338]/62 p-3 text-left hover:border-cyan-300/35 hover:bg-[#15314E]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan-300/10 text-cyan-200">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">{node.label}</span>
                      <span className="block truncate text-xs text-blue-100/52">{node.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function Inspector({
  tab,
  onTabChange,
  node,
  flow,
  validation,
  onUpdateNode,
  editingNodeId,
  onEditingHandled,
  onClose
}: {
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  node: ScriptVisualBuilderNode | null;
  flow: ScriptVisualBuilderConfig;
  validation: FlowValidationIssue[];
  onUpdateNode: (patch: Partial<ScriptVisualBuilderNode>) => void;
  editingNodeId: string | null;
  onEditingHandled: () => void;
  onClose: () => void;
}) {
  const nodeIssues = node ? validation.filter((issue) => issue.nodeId === node.id) : [];
  return (
    <aside className="min-h-0 overflow-y-auto border-l border-blue-500/18 bg-[#081524] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">Step Editor</div>
          <div className="mt-1 text-sm text-blue-100/58">Edit the selected step without losing the canvas context.</div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-xs font-semibold text-blue-50">
          Close
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg border border-blue-500/18 bg-[#0D1B2A]/65 p-1">
        {(["properties", "validation", "variables"] as InspectorTab[]).map((item) => (
          <button key={item} type="button" onClick={() => onTabChange(item)} className={`rounded-md px-2 py-2 text-xs font-semibold capitalize ${tab === item ? "selected-glow text-white" : "text-blue-100/62"}`}>
            {item}
          </button>
        ))}
      </div>

      {tab === "properties" ? (
        node ? <PropertiesPanel node={node} issues={nodeIssues} onUpdateNode={onUpdateNode} shouldFocusName={editingNodeId === node.id} onFocusHandled={onEditingHandled} /> : <EmptyInspector>Select a step to edit its settings.</EmptyInspector>
      ) : null}
      {tab === "validation" ? <ValidationPanel validation={validation} /> : null}
      {tab === "variables" ? <VariablesPanel flow={flow} /> : null}
    </aside>
  );
}

function BuilderSimulationDebugger({
  detail,
  queueItem,
  timeline,
  busy,
  error,
  manualReplyText,
  onManualReplyTextChange,
  onApproveAi,
  onManualReply,
  onIgnore,
  onPurchaseSuccess,
  onPurchaseFailure,
  onSendReply,
  onHide
}: {
  detail: SimulationDetailData | null;
  queueItem: QueueWorkspaceItemSummary | null;
  timeline: BuilderSimulationTimelineItem[];
  busy: string | null;
  error: string | null;
  manualReplyText: string;
  onManualReplyTextChange: (value: string) => void;
  onApproveAi: () => void;
  onManualReply: () => void;
  onIgnore: () => void;
  onPurchaseSuccess: () => void;
  onPurchaseFailure: () => void;
  onSendReply: () => void;
  onHide: () => void;
}) {
  const canAct = Boolean(detail?.simulation.id) && !busy;
  const waitingForPurchase = detail?.conversation?.waiting_reason?.includes("purchase") ?? false;
  return (
    <section className="shrink-0 border-t border-blue-500/18 bg-[#081524] p-4">
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Execution Timeline</div>
              <div className="mt-1 text-xs text-blue-100/56">
                {detail ? `${detail.simulation.status} / ${detail.conversation?.status ?? "no conversation"}` : "Run a builder simulation to watch steps execute."}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {detail ? <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${simulationStateTone(statusToSimulationState(detail.conversation?.status, detail.simulation.status))}`}>{detail.conversation?.status ?? detail.simulation.status}</span> : null}
              <button type="button" onClick={onHide} className="inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-xs font-semibold text-blue-50">
                <PanelBottomClose className="h-4 w-4" aria-hidden="true" />
                Hide
              </button>
            </div>
          </div>

          {error ? <div className="mt-3 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</div> : null}

          <div className="mt-4 grid max-h-56 gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
            {timeline.map((item) => (
              <div key={item.id} className={`rounded-lg border px-3 py-2 ${simulationTimelineTone(item.state)}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-xs font-semibold uppercase tracking-[0.12em]">{item.state.replaceAll("_", " ")}</div>
                  <div className="shrink-0 text-[11px] opacity-70">{formatSimulationTime(item.at)}</div>
                </div>
                <div className="mt-1 truncate text-sm font-semibold">{item.label}</div>
                <div className="mt-1 line-clamp-2 text-xs opacity-75">{item.detail}</div>
              </div>
            ))}
            {!timeline.length ? <div className="text-sm text-blue-100/58">No execution events yet.</div> : null}
          </div>
        </div>

        <div className="rounded-lg border border-blue-500/18 bg-[#0D1B2A]/65 p-3">
          <div className="text-sm font-semibold text-white">Simulation Controls</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={onSendReply} disabled={!canAct} className="rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50 disabled:opacity-45">
              Send Reply
            </button>
            <button type="button" onClick={onPurchaseSuccess} disabled={!canAct || !waitingForPurchase} className="rounded-lg border border-emerald-300/25 bg-emerald-400/14 px-3 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-45">
              Purchase Success
            </button>
            <button type="button" onClick={onPurchaseFailure} disabled={!canAct || !waitingForPurchase} className="rounded-lg border border-rose-300/25 bg-rose-400/14 px-3 py-2 text-sm font-semibold text-rose-100 disabled:opacity-45">
              Purchase Failure
            </button>
            <button type="button" onClick={onApproveAi} disabled={!canAct || !queueItem} className="rounded-lg border border-cyan-300/25 bg-cyan-400/14 px-3 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-45">
              Approve AI
            </button>
            <button type="button" onClick={onManualReply} disabled={!canAct || !queueItem} className="rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50 disabled:opacity-45">
              Manual Reply
            </button>
            <button type="button" onClick={onIgnore} disabled={!canAct || !queueItem} className="rounded-lg border border-amber-300/25 bg-amber-400/14 px-3 py-2 text-sm font-semibold text-amber-100 disabled:opacity-45">
              Ignore
            </button>
          </div>
          <textarea
            value={manualReplyText}
            onChange={(event) => onManualReplyTextChange(event.target.value)}
            className="nodrag mt-3 min-h-20 w-full resize-none rounded-lg border border-blue-400/18 bg-[#06111d]/80 px-3 py-2 text-sm text-blue-50 outline-none focus:border-cyan-300/50"
          />
          <div className="mt-2 text-xs text-blue-100/56">
            {queueItem ? `Queue item waiting: ${queueItem.title}` : waitingForPurchase ? "Flow is waiting at purchase check." : "Queue controls activate when approval is required."}
          </div>
        </div>
      </div>
    </section>
  );
}

function PropertiesPanel({
  node,
  issues,
  onUpdateNode,
  shouldFocusName,
  onFocusHandled
}: {
  node: ScriptVisualBuilderNode;
  issues: FlowValidationIssue[];
  onUpdateNode: (patch: Partial<ScriptVisualBuilderNode>) => void;
  shouldFocusName: boolean;
  onFocusHandled: () => void;
}) {
  const entry = getNodeRegistryEntry(node.type);
  const Icon = iconMap[entry.icon] ?? Sparkles;
  const nameInputRef = useCallback(
    (element: HTMLInputElement | null) => {
      if (!element || !shouldFocusName) return;
      element.focus();
      element.select();
      onFocusHandled();
    },
    [onFocusHandled, shouldFocusName]
  );
  const updateConfig = (patch: Record<string, unknown>) => onUpdateNode({ config: { ...node.config, ...patch } });
  const renderedAdvancedKeys = new Set<string>(["body", "approvalNote", "destination", "queueName", "conditionKey", "conditionValue", "delayMinutes", "scheduleLabel", "outcomeKey", "outcomeLabel", "terminalType", "price", "title"]);
  const hasBodyField = ["message", "ask_question", "wait", "draft_reply", "generate_response", "analyse_conversation", "classify_intent", "pause"].includes(node.type);
  const hasCommerceBody = node.type === "ppv_offer" || node.type === "bundle" || node.type === "custom_content" || node.type === "renew_subscription";
  const hasOutcomeMetadata = node.type === "end" || node.type === "approve" || node.type === "assign" || node.type === "escalate" || node.type === "pause";
  const hasTimingSettings = node.type === "delay" || node.type === "expiry" || node.type === "schedule" || node.type === "wait";
  const hasRoutingSettings = node.type === "switch" || isBranchNodeType(node.type);
  return (
    <div className="space-y-4">
      <div className="mt-4 rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200">
          <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{entry.label}</div>
            <div className="truncate text-xs text-blue-100/52">{nodeCategoryLabels[entry.category]}</div>
          </div>
        </div>
        <div className="mt-3 rounded-full border border-blue-400/18 bg-[#102338]/72 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-100/80">
          {node.type}
        </div>
        <Field label="Step name">
          <input ref={nameInputRef} value={node.label} onChange={(event) => onUpdateNode({ label: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
        </Field>
      </div>

      <div className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">Content</div>
        <div className="mt-3 space-y-4">
          {hasBodyField ? (
            <Field label={node.type === "ask_question" ? "Question prompt" : node.type === "draft_reply" ? "Draft prompt" : "Message / prompt"}>
              <textarea
                value={stringValue(node.config.body)}
                onChange={(event) => updateConfig({ body: event.target.value })}
                rows={8}
                className="command-card w-full rounded-lg px-3 py-2 text-sm"
              />
            </Field>
          ) : null}
          {node.type === "ppv_offer" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Offer title">
                <input value={stringValue(node.config.title)} onChange={(event) => updateConfig({ title: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
              </Field>
              <Field label="Price">
                <input type="number" value={numberValue(node.config.price)} onChange={(event) => updateConfig({ price: Number(event.target.value) })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
              </Field>
              <Field label="Offer message">
                <textarea value={stringValue(node.config.body)} onChange={(event) => updateConfig({ body: event.target.value })} rows={6} className="command-card w-full rounded-lg px-3 py-2 text-sm md:col-span-2" />
              </Field>
            </div>
          ) : null}
          {node.type === "approve" ? (
            <Field label="Approval prompt">
              <textarea value={stringValue(node.config.approvalNote)} onChange={(event) => updateConfig({ approvalNote: event.target.value })} rows={6} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
            </Field>
          ) : null}
          {hasCommerceBody && node.type !== "ppv_offer" ? (
            <Field label="Commerce prompt">
              <textarea value={stringValue(node.config.body)} onChange={(event) => updateConfig({ body: event.target.value })} rows={6} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
            </Field>
          ) : null}
        </div>
      </div>

      {hasRoutingSettings ? (
        <div className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">Routing</div>
          <div className="mt-3 space-y-4">
            {node.type === "switch" ? (
              <>
                <Field label="Routing variable">
                  <input value={stringValue(node.config.conditionKey)} onChange={(event) => updateConfig({ conditionKey: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
                </Field>
                <SwitchRoutesPanel node={node} onUpdateNode={onUpdateNode} />
              </>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Condition key">
                  <input value={stringValue(node.config.conditionKey)} onChange={(event) => updateConfig({ conditionKey: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
                </Field>
                <Field label="Condition value">
                  <input value={stringValue(node.config.conditionValue)} onChange={(event) => updateConfig({ conditionValue: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
                </Field>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {hasTimingSettings ? (
        <div className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">Timing</div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {node.type === "delay" || node.type === "expiry" ? (
              <Field label={node.type === "expiry" ? "Expiry minutes" : "Delay minutes"}>
                <input type="number" value={numberValue(node.config.delayMinutes)} onChange={(event) => updateConfig({ delayMinutes: Number(event.target.value) })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
              </Field>
            ) : null}
            {node.type === "schedule" ? (
              <Field label="Schedule label">
                <input value={stringValue(node.config.scheduleLabel)} onChange={(event) => updateConfig({ scheduleLabel: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
              </Field>
            ) : null}
          </div>
        </div>
      ) : null}

      {hasOutcomeMetadata ? (
        <div className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">Outcome</div>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <Field label="Outcome key">
              <input value={stringValue(node.config.outcomeKey)} onChange={(event) => updateConfig({ outcomeKey: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
            </Field>
            <Field label="Outcome label">
              <input value={stringValue(node.config.outcomeLabel)} onChange={(event) => updateConfig({ outcomeLabel: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
            </Field>
            <Field label="Terminal type">
              <input value={stringValue(node.config.terminalType)} onChange={(event) => updateConfig({ terminalType: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
            </Field>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-4">
        <details open={false}>
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">Advanced settings</summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {entry.configurationSchema
              .filter((field) => !renderedAdvancedKeys.has(field.key))
              .map((field) => (
                <Field key={field.key} label={field.label}>
                  {field.input === "textarea" ? (
                    <textarea value={stringValue(node.config[field.key])} onChange={(event) => updateConfig({ [field.key]: event.target.value })} rows={4} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
                  ) : field.input === "number" ? (
                    <input type="number" value={numberValue(node.config[field.key])} onChange={(event) => updateConfig({ [field.key]: Number(event.target.value) })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
                  ) : field.input === "select" ? (
                    <select value={stringValue(node.config[field.key])} onChange={(event) => updateConfig({ [field.key]: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-sm">
                      {(field.options ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input value={stringValue(node.config[field.key])} onChange={(event) => updateConfig({ [field.key]: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
                  )}
                </Field>
              ))}
          </div>
        </details>
      </div>

      {issues.length ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">Validation</div>
          {issues.map((issue) => (
            <IssueRow key={issue.message} issue={issue} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ValidationPanel({ validation }: { validation: FlowValidationIssue[] }) {
  const errors = validation.filter((issue) => issue.severity === "error").length;
  return (
    <div className="mt-4">
      <div className="rounded-lg border border-blue-500/15 bg-[#0D1B2A]/65 p-3">
        <div className="text-sm font-semibold text-white">{errors ? `${errors} blocking issue${errors === 1 ? "" : "s"}` : "Ready to save"}</div>
        <div className="mt-1 text-xs text-blue-100/58">{validation.length} total validation notes</div>
      </div>
      <div className="mt-3 space-y-2">
        {validation.map((issue) => <IssueRow key={`${issue.nodeId ?? "flow"}-${issue.message}`} issue={issue} />)}
        {!validation.length ? <div className="text-sm text-blue-100/58">No validation issues.</div> : null}
      </div>
    </div>
  );
}

function VariablesPanel({ flow }: { flow: ScriptVisualBuilderConfig }) {
  const variables = Array.from(
    new Set(
      flow.nodes
        .flatMap((node) => Object.values(node.config).map((value) => stringValue(value)))
        .flatMap((value) => [...value.matchAll(/\{\{([^}]+)\}\}/g)].map((match) => match[1].trim()))
        .filter(Boolean)
    )
  );
  return (
    <div className="mt-4 space-y-2">
      {variables.map((variable) => (
        <div key={variable} className="rounded-lg border border-blue-500/15 bg-[#0D1B2A]/65 px-3 py-2 text-sm text-blue-50">{variable}</div>
      ))}
      {!variables.length ? <div className="text-sm text-blue-100/58">No template variables detected in this flow.</div> : null}
    </div>
  );
}

function FlowNodeCard({ id, data, selected }: NodeProps<FlowNode>) {
  const Icon = iconMap[data.icon] ?? Sparkles;
  const color = categoryColor(data.category);
  const isBranch = isBranchNodeType(data.type);
  const isSwitch = data.type === "switch";
  const canReceive = data.type !== "trigger";
  const canSend = data.type !== "end";
  const [quickAddHandle, setQuickAddHandle] = useState<string | null | false>(false);
  const validationTone = validationToneClass(data.validationState);
  const simulationClass = data.simulationState ? simulationNodeClass(data.simulationState) : "";
  const routes = data.routeSummary ?? [];
  const collapsed = data.routeCollapsed ?? (isBranch || isSwitch);
  const visibleRoutes = collapsed ? routes.slice(0, Math.min(2, routes.length)) : routes;
  const hiddenRouteCount = Math.max(0, routes.length - visibleRoutes.length);
  return (
    <div
      className={`relative w-[220px] rounded-2xl border border-blue-500/18 bg-[#0D1B2A] p-3 shadow-[0_18px_48px_rgba(0,0,0,.28)] ${selected ? "ring-2 ring-cyan-300/45" : ""} ${simulationClass} ${data.dimmed ? "opacity-30" : ""}`}
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      {canReceive ? <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-[#06111d]" style={{ background: color }} /> : null}
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${color}1f`, color }}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{data.label}</div>
              <div className="truncate text-[11px] uppercase tracking-[0.12em] text-blue-100/56">{data.summary}</div>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${validationTone}`} title={data.validationMessage}>
              {data.validationState}
            </span>
          </div>
        </div>
      </div>
      {data.simulationState ? (
        <div className={`mt-2 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${simulationStateTone(data.simulationState)}`}>
          {data.simulationState.replaceAll("_", " ")}
        </div>
      ) : null}
      {canSend && isBranch ? (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/50">
              {collapsed ? "Branch family collapsed" : "Branch family expanded"}
            </div>
            <button
              type="button"
              onClick={() => data.onToggleRoutes?.(id)}
              className="nodrag rounded-full border border-blue-400/18 bg-[#102338]/72 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-50 hover:border-cyan-300/35 hover:text-white"
            >
              {collapsed ? "Expand" : "Collapse"}
            </button>
          </div>
          <div className="space-y-1.5">
            {visibleRoutes.map((route, index) => (
              <div key={route.key} className="relative flex items-center justify-between gap-2 rounded-lg border border-blue-500/14 bg-[#071423]/70 px-2 py-1.5">
                <Handle
                  id={route.key}
                  type="source"
                  position={Position.Right}
                  className="!h-3 !w-3 !border-2 !border-[#06111d]"
                  style={{ top: 16 + index * 54, background: route.validationState === "error" ? "#fb7185" : "#a78bfa" }}
                />
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-semibold text-white">{route.label}</div>
                  <div className="truncate text-[10px] text-blue-100/52">
                    {route.destinationCount > 1 ? `${route.destinationCount} destinations` : route.destinationLabel}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${validationToneClass(route.validationState)}`}>
                    {route.validationState}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuickAddHandle(quickAddHandle === route.key ? false : route.key)}
                    className="nodrag rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan-100 hover:bg-cyan-400/16"
                  >
                    + step
                  </button>
                </div>
              </div>
            ))}
            {collapsed && hiddenRouteCount > 0 ? <div className="text-[11px] text-blue-100/52">+{hiddenRouteCount} more routes hidden</div> : null}
          </div>
        </div>
      ) : null}
      {canSend && !isBranch ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/50">Primary flow continues</div>
          <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-[#06111d]" style={{ background: color }} />
          <button
            type="button"
            onClick={() => setQuickAddHandle(quickAddHandle === null ? false : null)}
            className="nodrag rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan-100 hover:bg-cyan-400/16"
          >
            + step
          </button>
        </div>
      ) : null}
      {quickAddHandle !== false ? (
        <QuickAddMenu
          onSelect={(type) => {
            data.onQuickAdd?.(id, type, quickAddHandle);
            setQuickAddHandle(false);
          }}
        />
      ) : null}
    </div>
  );
}

function InlineStepEditor({ nodeId, data }: { nodeId: string; data: FlowNodeData }) {
  if (data.type === "trigger" || data.type === "end") {
    return <div className="mt-2 truncate text-xs text-blue-100/58">{data.summary}</div>;
  }

  if (data.type === "switch") {
    return (
      <div className="mt-2 grid gap-2">
        <input
          value={stringValue(data.config.conditionKey)}
          onChange={(event) => data.onInlineEdit?.(nodeId, { config: { ...data.config, conditionKey: event.target.value } })}
          className="nodrag rounded-md border border-blue-400/14 bg-[#06111d]/80 px-2 py-1.5 text-xs font-semibold text-white outline-none focus:border-cyan-300/50"
          aria-label="Routing variable"
          placeholder="response_class"
        />
        <div className="text-[11px] text-blue-100/58">{routeCasesFromConfig(data.config).length} cases plus fallback</div>
      </div>
    );
  }

  if (isBranchNodeType(data.type)) {
    return (
      <div className="mt-2 grid gap-2">
        <input
          value={stringValue(data.config.conditionKey)}
          onChange={(event) => data.onInlineEdit?.(nodeId, { config: { ...data.config, conditionKey: event.target.value } })}
          className="nodrag rounded-md border border-blue-400/14 bg-[#06111d]/80 px-2 py-1.5 text-xs font-semibold text-white outline-none focus:border-cyan-300/50"
          aria-label="Condition label"
          placeholder="condition label"
        />
        <input
          value={stringValue(data.config.conditionValue)}
          onChange={(event) => data.onInlineEdit?.(nodeId, { config: { ...data.config, conditionValue: event.target.value } })}
          className="nodrag rounded-md border border-blue-400/14 bg-[#06111d]/80 px-2 py-1.5 text-xs text-blue-50 outline-none focus:border-cyan-300/50"
          aria-label="Condition value"
          placeholder="condition value"
        />
      </div>
    );
  }

  if (data.type === "ppv_offer") {
    return (
      <div className="mt-2 grid gap-2">
        <input
          value={stringValue(data.config.title)}
          onChange={(event) => data.onInlineEdit?.(nodeId, { config: { ...data.config, title: event.target.value } })}
          className="nodrag rounded-md border border-blue-400/14 bg-[#06111d]/80 px-2 py-1.5 text-xs font-semibold text-white outline-none focus:border-cyan-300/50"
          aria-label="Offer title"
          placeholder="offer title"
        />
        <InlineTextArea nodeId={nodeId} data={data} field="body" label="Message content" />
      </div>
    );
  }

  if (data.type === "approve") return <InlineTextArea nodeId={nodeId} data={data} field="approvalNote" label="Prompt text" />;
  if (typeof data.config.body === "string") return <InlineTextArea nodeId={nodeId} data={data} field="body" label={data.category === "ai" ? "Prompt text" : "Message content"} />;
  return <div className="mt-2 truncate text-xs text-blue-100/58">{data.summary}</div>;
}

function InlineTextArea({ nodeId, data, field, label }: { nodeId: string; data: FlowNodeData; field: string; label: string }) {
  return (
    <textarea
      value={stringValue(data.config[field])}
      onChange={(event) => data.onInlineEdit?.(nodeId, { config: { ...data.config, [field]: event.target.value } })}
      rows={3}
      className="nodrag nowheel mt-2 w-full resize-none rounded-md border border-blue-400/14 bg-[#06111d]/80 px-2 py-1.5 text-xs leading-5 text-blue-50 outline-none focus:border-cyan-300/50"
      aria-label={label}
      placeholder={label}
    />
  );
}

function QuickAddButton({ onClick, className }: { onClick: () => void; className: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`nodrag absolute z-20 flex h-7 w-7 items-center justify-center rounded-full border border-cyan-300/35 bg-[#0D1B2A] text-cyan-100 shadow-[0_8px_24px_rgba(0,0,0,.35)] hover:bg-[#15314E] ${className}`}
      aria-label="Add next step"
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function QuickAddMenu({ onSelect }: { onSelect: (type: ScriptVisualBuilderNodeType) => void }) {
  return (
    <div className="nodrag absolute left-full top-8 z-30 ml-3 w-52 rounded-lg border border-blue-400/20 bg-[#081524] p-2 shadow-[0_20px_60px_rgba(0,0,0,.45)]">
      <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">Next step</div>
      <div className="grid gap-1">
        {quickStepTemplates.map((template) => (
          <button key={template.label} type="button" onClick={() => onSelect(template.type)} className="rounded-md px-2 py-2 text-left text-xs font-semibold text-blue-50 hover:bg-[#15314E]">
            {template.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function toReactFlowNodes(flow: ScriptVisualBuilderConfig, validation: FlowValidationIssue[]): FlowNode[] {
  return flow.nodes.map((node) => toReactFlowNode(node, validation));
}

function toReactFlowNode(node: ScriptVisualBuilderNode, validation: FlowValidationIssue[]): FlowNode {
  const entry = getNodeRegistryEntry(node.type);
  return {
    id: node.id,
    type: "flowNode",
    position: { x: node.x, y: node.y },
    selected: false,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: {
      label: node.label || entry.label,
      type: node.type,
      category: entry.category,
      icon: entry.icon,
      config: node.config,
      summary: nodeSummary(node),
      issues: validation.filter((issue) => issue.nodeId === node.id).length,
      validationState: nodeValidationState(node.id, validation),
      validationMessage: validation.find((issue) => issue.nodeId === node.id)?.message
    }
  };
}

function toReactFlowEdges(flow: ScriptVisualBuilderConfig): FlowEdge[] {
  return flow.connections.map((connection) => buildFlowEdge({
    id: connection.id,
    source: connection.from,
    target: connection.to,
    label: connection.label,
    sourceHandle: connection.label ?? null
  }));
}

function fromReactFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  selectedNodeId: string | null,
  viewport: { x: number; y: number; zoom: number }
): ScriptVisualBuilderConfig {
  return {
    schemaVersion: 1,
    selectedNodeId,
    nodes: nodes.map((node) => {
      const entry = getNodeRegistryEntry(node.data.type);
      return {
        id: node.id,
        type: node.data.type,
        label: node.data.label,
        category: entry.category,
        x: node.position.x,
        y: node.position.y,
        config: node.data.config ?? { ...entry.defaultConfig }
      };
    }),
    connections: edges.map((edge) => ({
      id: edge.id,
      from: edge.source,
      to: edge.target,
      label: edge.data?.label ?? (edge.sourceHandle === "yes" || edge.sourceHandle === "no" ? edge.sourceHandle : undefined)
    })),
    viewport
  };
}

function buildFlowEdge(connection: FlowEdgeInput): FlowEdge {
  const label = connection.label ?? connection.sourceHandle ?? undefined;
  const displayLabel = edgeDisplayLabel(label);
  return {
    id: connection.id ?? `edge-${connection.source}-${connection.sourceHandle ?? "out"}-${connection.target}-${Date.now()}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle ?? null,
    type: "smoothstep",
    label: displayLabel,
    data: { label },
    style: { stroke: "rgba(194,24,117,.60)", strokeWidth: 1.7 },
    labelBgPadding: [8, 4],
    labelBgBorderRadius: 6,
    labelBgStyle: { fill: "rgba(20,20,24,.96)", stroke: "rgba(230,106,141,.24)" },
    labelStyle: { fill: "#dff8ff", fontSize: 11, fontWeight: 700 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(194,24,117,.60)" }
  };
}

function cloneNodes(nodes: FlowNode[]) {
  return nodes.map((node) => ({ ...node, position: { ...node.position }, data: { ...node.data, config: { ...node.data.config } } }));
}

function cloneEdges(edges: FlowEdge[]) {
  return edges.map((edge) => ({ ...edge, data: edge.data ? { ...edge.data } : edge.data, style: edge.style ? { ...edge.style } : edge.style }));
}

function withAuthoringData(
  node: FlowNode,
  validation: FlowValidationIssue[],
  handlers: Pick<FlowNodeData, "onInlineEdit" | "onQuickAdd" | "onToggleRoutes"> & Pick<FlowNodeData, "routeSummary" | "routeCollapsed" | "routeCount">,
  simulationState?: BuilderSimulationStepState,
  dimmed = false
): FlowNode {
  return {
    ...node,
    data: {
      ...node.data,
      ...handlers,
      issues: validation.filter((issue) => issue.nodeId === node.id).length,
      validationState: nodeValidationState(node.id, validation),
      validationMessage: validation.find((issue) => issue.nodeId === node.id)?.message,
      simulationState,
      dimmed
    }
  };
}

function withEdgeFocusState(edge: FlowEdge, focusedPathNodeIds: Set<string> | null): FlowEdge {
  const dimmed = Boolean(focusedPathNodeIds && (!focusedPathNodeIds.has(edge.source) || !focusedPathNodeIds.has(edge.target)));
  const stroke = dimmed ? "rgba(123,63,242,.24)" : "rgba(194,24,117,.90)";
  return {
    ...edge,
    data: { ...edge.data, dimmed },
    animated: Boolean(focusedPathNodeIds && !dimmed),
    style: {
      ...(edge.style ?? {}),
      stroke,
      strokeWidth: dimmed ? 1.5 : 2.6
    },
    labelStyle: {
      ...(edge.labelStyle ?? {}),
      fill: dimmed ? "rgba(243,238,232,.42)" : "#f3eee8"
    },
    markerEnd: { type: MarkerType.ArrowClosed, color: stroke }
  };
}

function nodeValidationState(nodeId: string, validation: FlowValidationIssue[]): FlowNodeValidationState {
  const issues = validation.filter((issue) => issue.nodeId === nodeId);
  if (issues.some((issue) => issue.severity === "error")) return "error";
  if (issues.length) return "warning";
  return "valid";
}

function validationToneClass(state: FlowNodeValidationState) {
  if (state === "error") return "bg-rose-500/16 text-rose-100";
  if (state === "warning") return "bg-amber-400/16 text-amber-100";
  return "bg-emerald-500/14 text-emerald-100";
}

function buildSimulationTimeline(detail: SimulationDetailData | null, flow: ScriptVisualBuilderConfig): BuilderSimulationTimelineItem[] {
  if (!detail) return [];
  const nodeById = new Map(flow.nodes.map((node) => [node.id, node]));
  const historyItems = detail.history.map((entry) => {
    const outcomeLabel = historyOutcomeLabel(entry.payload) || (entry.event_type === "conversation_completed" && entry.step_id ? outcomeLabelFromNode(nodeById.get(entry.step_id)) : null);
    return {
      id: entry.id,
      stepId: entry.step_id,
      label: entry.step_id ? nodeById.get(entry.step_id)?.label ?? entry.event_type : entry.event_type,
      detail: outcomeLabel ? `${entry.detail ?? entry.transition_key} Outcome: ${outcomeLabel}.` : entry.detail ?? entry.transition_key,
      state: historyState(entry.to_status, detail.simulation.status),
      at: entry.created_at
    };
  });
  const outboundItems = detail.outboundMessages.map((message) => ({
    id: `outbound-${message.id}`,
    stepId: message.script_step_id,
    label: message.script_step_id ? nodeById.get(message.script_step_id)?.label ?? "Outbound message" : "Outbound message",
    detail: message.final_text ?? message.draft_text ?? message.message_body,
    state: outboundState(message.status, message.approval_status),
    at: message.created_at
  }));
  return [...historyItems, ...outboundItems].sort((a, b) => new Date(a.at ?? 0).getTime() - new Date(b.at ?? 0).getTime());
}

function buildSimulationStepStates(
  flow: ScriptVisualBuilderConfig,
  detail: SimulationDetailData | null,
  queueItem: QueueWorkspaceItemSummary | null
) {
  const states = new Map<string, BuilderSimulationStepState>();
  if (!detail) return states;

  for (const node of flow.nodes) states.set(node.id, "pending");
  for (const item of detail.history) {
    if (item.step_id) states.set(item.step_id, historyState(item.to_status, detail.simulation.status));
  }
  for (const message of detail.outboundMessages) {
    if (message.script_step_id) states.set(message.script_step_id, outboundState(message.status, message.approval_status));
  }
  if (detail.conversation?.current_step_id) {
    states.set(detail.conversation.current_step_id, statusToSimulationState(detail.conversation.status, detail.simulation.status));
  }
  if (queueItem && detail.conversation?.current_step_id) states.set(detail.conversation.current_step_id, "waiting_queue");
  if (detail.simulation.status === "failed" || detail.conversation?.status === "failed") {
    const failedStepId = detail.conversation?.current_step_id ?? detail.history.at(-1)?.step_id;
    if (failedStepId) states.set(failedStepId, "failed");
  }
  return states;
}

function historyState(status: string | null, simulationStatus: string): BuilderSimulationStepState {
  if (simulationStatus === "failed" || status === "failed") return "failed";
  if (status === "waiting_approval") return "waiting_queue";
  if (status === "running") return "running";
  return "completed";
}

function outboundState(status: string, approvalStatus: string): BuilderSimulationStepState {
  if (status === "failed" || approvalStatus === "rejected") return "failed";
  if (status === "pending_approval" || approvalStatus === "pending") return "waiting_queue";
  if (status === "queued" || status === "sending") return "running";
  return "completed";
}

function statusToSimulationState(conversationStatus?: string | null, simulationStatus?: string | null): BuilderSimulationStepState {
  if (simulationStatus === "failed" || conversationStatus === "failed") return "failed";
  if (conversationStatus === "waiting_approval") return "waiting_queue";
  if (conversationStatus === "running" || simulationStatus === "running") return "running";
  if (conversationStatus === "completed" || simulationStatus === "completed") return "completed";
  return "pending";
}

function simulationNodeClass(state: BuilderSimulationStepState) {
  if (state === "running") return "ring-2 ring-[#c21875]/70";
  if (state === "completed") return "ring-1 ring-emerald-300/55";
  if (state === "waiting_queue") return "ring-2 ring-amber-300/70";
  if (state === "failed") return "ring-2 ring-rose-300/75";
  return "opacity-75";
}

function simulationStateTone(state: BuilderSimulationStepState) {
  if (state === "running") return "bg-[#c21875]/14 text-[#f3eee8]";
  if (state === "completed") return "bg-emerald-500/14 text-emerald-100";
  if (state === "waiting_queue") return "bg-amber-400/14 text-amber-100";
  if (state === "failed") return "bg-rose-500/16 text-rose-100";
  return "bg-blue-400/12 text-blue-100";
}

function simulationTimelineTone(state: BuilderSimulationStepState) {
  if (state === "running") return "border-[#c21875]/25 bg-[#c21875]/10 text-[#f3eee8]";
  if (state === "completed") return "border-emerald-300/25 bg-emerald-500/10 text-emerald-50";
  if (state === "waiting_queue") return "border-amber-300/25 bg-amber-400/10 text-amber-50";
  if (state === "failed") return "border-rose-300/25 bg-rose-500/10 text-rose-50";
  return "border-blue-500/15 bg-[#0D1B2A]/65 text-blue-50";
}

function triggerEventType(flow: ScriptVisualBuilderConfig, script: OfMessageScript) {
  const trigger = flow.nodes.find((node) => node.type === "trigger");
  return stringValue(trigger?.config.eventType) || script.trigger_event_type || "manual";
}

function defaultBuilderSimulationSubscriber() {
  return {
    name: "Mason",
    username: "builder_mason",
    subscription_status: "active",
    renewal_state: "current",
    spend_level: "high",
    lifetime_value: 180,
    message_history_summary: "Warm fan for builder simulation. Replies quickly and is open to premium offers.",
    custom_variables: {
      subscriber_name: "Mason",
      response_class: "warm_enthusiastic",
      fan: { name: "Mason", total_spend: 180, last_purchase: null }
    }
  };
}

function formatSimulationTime(value: string | null) {
  return value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--";
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function createAuthoringStep(type: ScriptVisualBuilderNodeType, position: { x: number; y: number }): ScriptVisualBuilderNode {
  const node = createBuilderNode(type, position);
  const template = authoringStepTemplate(type);
  return {
    ...node,
    label: template.label ?? node.label,
    config: { ...node.config, ...template.config }
  };
}

function authoringStepTemplate(type: ScriptVisualBuilderNodeType): { label?: string; config: Record<string, unknown> } {
  if (type === "message") return { label: "Welcome Message", config: { body: "Hey {{subscriber_name}}, welcome in. I am glad you are here." } };
  if (type === "ask_question") return { label: "Ask Question", config: { body: "What kind of content do you want most from me?" } };
  if (type === "draft_reply") return { label: "Draft AI Reply", config: { body: "Draft a warm reply in the creator voice using the latest conversation context." } };
  if (type === "classify_intent") return { label: "Classify Response", config: { body: "Use Conversation Interpretation output as response_class.", variableKey: "response_class", variableValue: "{{response_class}}" } };
  if (type === "switch") return { label: "Route Response Class", config: { conditionKey: "response_class", cases: defaultRouteCases() } };
  if (type === "approve") return { label: "Human Approval", config: { approvalNote: "Review this response before it continues.", destination: "Review Queue", outcomeKey: "human_review_required", outcomeLabel: "Human review required", terminalType: "handoff" } };
  if (type === "pause") return { label: "Human Handoff", config: { body: "Pause for human review.", outcomeKey: "human_review_required", outcomeLabel: "Human review required", terminalType: "handoff" } };
  if (type === "assign") return { label: "Assign Review", config: { queueName: "Review Queue", outcomeKey: "human_review_required", outcomeLabel: "Human review required", terminalType: "handoff" } };
  if (type === "escalate") return { label: "Escalate Review", config: { queueName: "Escalations", outcomeKey: "human_review_required", outcomeLabel: "Human review required", terminalType: "handoff" } };
  if (type === "ppv_offer") return { label: "PPV Offer", config: { title: "Premium drop", price: 20, body: "I have something premium ready if you want it." } };
  if (type === "delay") return { label: "Follow-up", config: { delayMinutes: 180, body: "Check back in if they have not replied." } };
  if (type === "end") return { label: "End", config: { outcomeKey: "complete", outcomeLabel: "Complete", terminalType: "completed" } };
  return { config: {} };
}

function arrangeFlowNodes(nodes: FlowNode[], edges: FlowEdge[]) {
  const columnWidth = 420;
  const rowHeight = 230;
  const left = 120;
  const top = 140;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = buildOutgoingEdges(edges, byId);
  const incoming = buildIncomingEdges(edges, byId);

  const root = nodes.find((node) => node.data.type === "trigger") ?? nodes[0];
  const depth = new Map<string, number>();
  if (root) depth.set(root.id, 0);

  for (let pass = 0; pass < Math.max(nodes.length, 1); pass += 1) {
    let changed = false;
    for (const edge of edges) {
      if (!byId.has(edge.source) || !byId.has(edge.target)) continue;
      const sourceDepth = depth.get(edge.source);
      if (sourceDepth == null) continue;
      const targetDepth = Math.max(depth.get(edge.target) ?? 0, sourceDepth + 1);
      if (targetDepth !== depth.get(edge.target)) {
        depth.set(edge.target, targetDepth);
        changed = true;
      }
    }
    if (!changed) break;
  }

  for (const node of nodes) {
    if (!depth.has(node.id)) depth.set(node.id, Math.max(1, Math.round(node.position.x / columnWidth)));
  }

  const terminalIds = new Set(nodes.filter((node) => isTerminalLayoutNode(node, outgoing)).map((node) => node.id));
  const terminalDepth = Math.max(1, ...Array.from(depth.entries()).filter(([id]) => !terminalIds.has(id)).map(([, value]) => value)) + 1;
  for (const nodeId of terminalIds) depth.set(nodeId, terminalDepth);

  const lane = assignReadableLanes(nodes, outgoing, incoming, root?.id ?? null);

  return nodes.map((node) => {
    const column = depth.get(node.id) ?? 0;
    return {
      ...node,
      position: {
        x: left + column * columnWidth,
        y: top + (lane.get(node.id) ?? 0) * rowHeight
      }
    };
  });
}

function buildOutgoingEdges(edges: FlowEdge[], byId: Map<string, FlowNode>) {
  const outgoing = new Map<string, FlowEdge[]>();
  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue;
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
  }
  for (const [nodeId, items] of outgoing) {
    const node = byId.get(nodeId);
    outgoing.set(nodeId, items.sort((a, b) => edgeRouteOrder(node, a) - edgeRouteOrder(node, b) || a.target.localeCompare(b.target)));
  }
  return outgoing;
}

function buildIncomingEdges(edges: FlowEdge[], byId: Map<string, FlowNode>) {
  const incoming = new Map<string, FlowEdge[]>();
  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue;
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge]);
  }
  return incoming;
}

function assignReadableLanes(
  nodes: FlowNode[],
  outgoing: Map<string, FlowEdge[]>,
  incoming: Map<string, FlowEdge[]>,
  rootId: string | null
) {
  const lane = new Map<string, number>();
  const reserved = new Set<number>();
  if (rootId) {
    lane.set(rootId, 0);
    reserved.add(0);
  }

  const queue = rootId ? [rootId] : nodes.map((node) => node.id);
  const visited = new Set<string>();
  while (queue.length) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    const baseLane = lane.get(nodeId) ?? nearestFreeLane(reserved, 0);
    lane.set(nodeId, baseLane);
    reserved.add(baseLane);

    const children = outgoing.get(nodeId) ?? [];
    const centeredStart = baseLane - Math.floor((children.length - 1) / 2);
    children.forEach((edge, index) => {
      const targetIncoming = incoming.get(edge.target) ?? [];
      const preferred = targetIncoming.length > 1
        ? averageLane(targetIncoming.map((item) => lane.get(item.source)).filter((value): value is number => value != null))
        : centeredStart + index;
      if (!lane.has(edge.target)) {
        const nextLane = nearestFreeLane(reserved, preferred);
        lane.set(edge.target, nextLane);
        reserved.add(nextLane);
      }
      queue.push(edge.target);
    });
  }

  for (const node of nodes) {
    if (lane.has(node.id)) continue;
    const parentLanes = (incoming.get(node.id) ?? []).map((edge) => lane.get(edge.source)).filter((value): value is number => value != null);
    const nextLane = nearestFreeLane(reserved, parentLanes.length ? averageLane(parentLanes) : 0);
    lane.set(node.id, nextLane);
    reserved.add(nextLane);
  }

  const sorted = [...lane.entries()].sort((a, b) => a[1] - b[1]);
  return new Map(sorted.map(([nodeId], index) => [nodeId, index]));
}

function averageLane(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function nearestFreeLane(reserved: Set<number>, preferred: number) {
  if (!reserved.has(preferred)) return preferred;
  for (let offset = 1; offset < 200; offset += 1) {
    if (!reserved.has(preferred + offset)) return preferred + offset;
    if (!reserved.has(preferred - offset)) return preferred - offset;
  }
  return reserved.size;
}

function edgeRouteOrder(node: FlowNode | undefined, edge: FlowEdge) {
  const label = edge.data?.label ?? edge.sourceHandle ?? "";
  if (!node) return label === fallbackRouteKey ? 999 : 0;
  if (node.data.type === "switch") {
    const routeIndex = routeCasesFromConfig(node.data.config).findIndex((routeCase) => routeCase.key === label);
    if (routeIndex >= 0) return routeIndex;
    if (label === fallbackRouteKey) return 998;
  }
  if (label === "yes") return 0;
  if (label === "no" || label === fallbackRouteKey) return 1;
  return 100;
}

function isTerminalLayoutNode(node: FlowNode, outgoing: Map<string, FlowEdge[]>) {
  return node.data.type === "end" || !(outgoing.get(node.id)?.length);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-4 block">
      <div className="mb-2 text-sm font-medium text-blue-100/62">{label}</div>
      {children}
    </label>
  );
}

function IssueRow({ issue }: { issue: FlowValidationIssue }) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${issue.severity === "error" ? "border-rose-400/25 bg-rose-500/10 text-rose-100" : "border-amber-400/20 bg-amber-400/10 text-amber-100"}`}>
      {operatorIssueMessage(issue.message)}
    </div>
  );
}

function EmptyInspector({ children }: { children: ReactNode }) {
  return <div className="mt-4 text-sm text-blue-100/58">{children}</div>;
}

function nodeSummary(node: ScriptVisualBuilderNode) {
  if (node.type === "trigger") return stringValue(node.config.eventType) || "Manual trigger";
  if (node.type === "switch") return `${stringValue(node.config.conditionKey) || "response_class"} routes ${routeCasesFromConfig(node.config).length} cases`;
  if (node.type === "if_else" || node.type === "branch" || node.type === "filter") return `${stringValue(node.config.conditionKey) || "condition"} = ${stringValue(node.config.conditionValue) || "value"}`;
  if (node.type === "delay" || node.type === "expiry") return `${numberValue(node.config.delayMinutes)} minutes`;
  if (node.type === "schedule") return stringValue(node.config.scheduleLabel) || "Scheduled";
  if (node.type === "approve") return stringValue(node.config.destination) || "Approval required";
  if (node.type === "assign" || node.type === "escalate") return stringValue(node.config.queueName) || "Queue";
  if (node.type === "end") return stringValue(node.config.outcomeLabel) || stringValue(node.config.outcomeKey) || "Complete";
  if (node.type === "ppv_offer") return `${stringValue(node.config.title) || "PPV offer"} | $${numberValue(node.config.price) || 0}`;
  if (node.type === "message" || node.type === "ask_question" || node.type === "wait" || node.type === "draft_reply" || node.type === "generate_response" || node.type === "analyse_conversation" || node.type === "classify_intent") {
    return "Content configured";
  }
  return "Configured step";
}

function routeSummaryForNode(
  node: FlowNode,
  connections: ScriptVisualBuilderConnection[],
  validation: FlowValidationIssue[],
  nodeById: Map<string, FlowNode>
) {
  if (!isBranchNodeType(node.data.type)) return [];

  const targetLabelFor = (targetId: string) => nodeById.get(targetId)?.data.label ?? "Unwired";
  const connectionLabelMatches = (routeKey: string) => connections.filter((connection) => connection.from === node.id && (connection.label === routeKey || connection.id === routeKey));

  const routeItems: NodeRouteSummary[] =
    node.data.type === "switch"
      ? [
          ...routeCasesFromConfig(node.data.config).map((routeCase) => {
            const matches = connectionLabelMatches(routeCase.key);
            const destinations = matches.map((connection) => targetLabelFor(connection.to));
            return {
              key: routeCase.key || fallbackRouteKey,
              label: routeCase.label || routeCase.key || "Route",
              destinationLabel: destinations.length ? destinations[0] : "Unwired",
              destinationCount: destinations.length || 0,
              validationState: matches.length && destinations.length ? "valid" : "warning"
            } satisfies NodeRouteSummary;
          }),
          {
            key: fallbackRouteKey,
            label: "Fallback",
            destinationLabel: targetLabelFor((connections.find((connection) => connection.from === node.id && connection.label === fallbackRouteKey) ?? { to: "" }).to),
            destinationCount: connections.some((connection) => connection.from === node.id && connection.label === fallbackRouteKey) ? 1 : 0,
            validationState: connections.some((connection) => connection.from === node.id && connection.label === fallbackRouteKey) ? "valid" : "warning"
          } satisfies NodeRouteSummary
        ]
      : [
          {
            key: "yes",
            label: "YES path",
            destinationLabel: targetLabelFor((connections.find((connection) => connection.from === node.id && connection.label === "yes") ?? { to: "" }).to),
            destinationCount: connections.some((connection) => connection.from === node.id && connection.label === "yes") ? 1 : 0,
            validationState: connections.some((connection) => connection.from === node.id && connection.label === "yes") ? "valid" : "warning"
          } satisfies NodeRouteSummary,
          {
            key: "no",
            label: node.data.type === "filter" ? "Fallback path" : "NO path",
            destinationLabel: targetLabelFor((connections.find((connection) => connection.from === node.id && (connection.label === "no" || connection.label === fallbackRouteKey)) ?? { to: "" }).to),
            destinationCount: connections.some((connection) => connection.from === node.id && (connection.label === "no" || connection.label === fallbackRouteKey)) ? 1 : 0,
            validationState: connections.some((connection) => connection.from === node.id && (connection.label === "no" || connection.label === fallbackRouteKey)) ? "valid" : "warning"
          } satisfies NodeRouteSummary
        ];

  const nodeIssues = validation.filter((issue) => issue.nodeId === node.id);
  const hasError = nodeIssues.some((issue) => issue.severity === "error");
  return routeItems.map((route) => ({
    ...route,
    validationState: hasError ? "error" : route.validationState
  }));
}

function SwitchRoutesPanel({ node, onUpdateNode }: { node: ScriptVisualBuilderNode; onUpdateNode: (patch: Partial<ScriptVisualBuilderNode>) => void }) {
  const cases = routeCasesFromConfig(node.config);
  const updateCase = (index: number, patch: { key?: string; label?: string }) => {
    onUpdateNode({
      config: {
        ...node.config,
        cases: cases.map((routeCase, routeIndex) => (routeIndex === index ? { ...routeCase, ...patch } : routeCase))
      }
    });
  };
  return (
    <div className="mt-4 rounded-lg border border-blue-500/15 bg-[#0D1B2A]/65 p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">Routes</div>
      <div className="mt-3 grid gap-3">
        {cases.map((routeCase, index) => (
          <div key={`${routeCase.key}:${index}`} className="grid gap-2">
            <input value={routeCase.key} onChange={(event) => updateCase(index, { key: slugifyRouteKey(event.target.value) })} className="command-card w-full rounded-lg px-3 py-2 text-xs font-semibold" placeholder="case_key" />
            <input value={routeCase.label} onChange={(event) => updateCase(index, { label: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-xs" placeholder="Case label" />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => onUpdateNode({ config: { ...node.config, cases: [...cases, { key: `case_${cases.length + 1}`, label: `Case ${cases.length + 1}` }] } })} className="rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-xs font-semibold text-blue-50">
          Add route
        </button>
        <button type="button" onClick={() => onUpdateNode({ config: { ...node.config, cases: cases.slice(0, -1) } })} disabled={cases.length <= 1} className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 disabled:opacity-45">
          Remove last
        </button>
      </div>
    </div>
  );
}

function routeCasesFromConfig(config: Record<string, unknown>) {
  const rawCases = Array.isArray(config.cases) ? config.cases : [];
  const cases = rawCases
    .map((item) => (isRecord(item) ? { key: stringValue(item.key).trim(), label: stringValue(item.label).trim() } : null))
    .filter((item): item is { key: string; label: string } => Boolean(item));
  return cases.length ? cases : defaultRouteCases();
}

function defaultRouteCases() {
  return [
    { key: "warm_enthusiastic", label: "Warm / enthusiastic" },
    { key: "short_low_effort", label: "Short / low effort" },
    { key: "compliment", label: "Compliment" },
    { key: "flirtatious", label: "Flirtatious" },
    { key: "asks_for_content", label: "Asks for content" },
    { key: "purchase_intent", label: "Purchase intent" },
    { key: "price_objection", label: "Price objection" },
    { key: "not_ready", label: "Not ready" },
    { key: "boundary_testing", label: "Boundary-testing" }
  ];
}

function edgeDisplayLabel(label?: string) {
  if (!label) return undefined;
  if (label === "yes") return "YES path";
  if (label === "no") return "NO path";
  if (label === fallbackRouteKey) return "Fallback";
  return label.replaceAll("_", " ");
}

function routeHandleOffset(config: Record<string, unknown>, sourceHandle?: string | null) {
  if (!sourceHandle || sourceHandle === "yes") return -130;
  if (sourceHandle === "no" || sourceHandle === fallbackRouteKey) return 130;
  const index = routeCasesFromConfig(config).findIndex((routeCase) => routeCase.key === sourceHandle);
  return index >= 0 ? (index - 1) * 130 : 0;
}

function historyOutcomeLabel(payload: unknown) {
  if (!isRecord(payload)) return null;
  const label = stringValue(payload.outcome_label);
  const key = stringValue(payload.outcome_key);
  if (label && key) return `${label} (${key})`;
  return label || key || null;
}

function outcomeLabelFromNode(node?: ScriptVisualBuilderNode) {
  if (!node) return null;
  const label = stringValue(node.config.outcomeLabel);
  const key = stringValue(node.config.outcomeKey);
  if (label && key) return `${label} (${key})`;
  return label || key || null;
}

function slugifyRouteKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function operatorIssueMessage(message: string) {
  return message.replaceAll("nodes", "steps").replaceAll("Nodes", "Steps").replaceAll("node", "step").replaceAll("Node", "Step");
}

function categoryColor(category?: ScriptVisualBuilderNodeCategory) {
  if (category === "ai") return "#c21875";
  if (category === "logic") return "#7b3ff2";
  if (category === "human") return "#e66a8d";
  if (category === "commerce") return "#c21875";
  if (category === "timing") return "#e66a8d";
  return "#c21875";
}

function sameStringArray(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function focusedPathFromSelection(nodes: FlowNode[], edges: FlowEdge[], selectedNodeId: string | null, selectedEdgeIds: string[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const selectedEdge = edges.find((edge) => selectedEdgeIds.includes(edge.id));
  const anchorNodeId = selectedEdge?.target ?? selectedNodeId;
  if (!anchorNodeId || !byId.has(anchorNodeId)) return null;

  const focused = new Set<string>();
  const incoming = new Map<string, FlowEdge[]>();
  const outgoing = new Map<string, FlowEdge[]>();
  for (const edge of edges) {
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge]);
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
  }

  if (selectedEdge) {
    focused.add(selectedEdge.source);
    focused.add(selectedEdge.target);
    collectAncestors(selectedEdge.source, incoming, focused);
    collectDescendants(selectedEdge.target, outgoing, focused);
  } else {
    focused.add(anchorNodeId);
    collectAncestors(anchorNodeId, incoming, focused);
    collectDescendants(anchorNodeId, outgoing, focused);
  }

  return focused;
}

function collectAncestors(nodeId: string, incoming: Map<string, FlowEdge[]>, focused: Set<string>) {
  for (const edge of incoming.get(nodeId) ?? []) {
    if (focused.has(edge.source)) continue;
    focused.add(edge.source);
    collectAncestors(edge.source, incoming, focused);
  }
}

function collectDescendants(nodeId: string, outgoing: Map<string, FlowEdge[]>, focused: Set<string>) {
  for (const edge of outgoing.get(nodeId) ?? []) {
    if (focused.has(edge.target)) continue;
    focused.add(edge.target);
    collectDescendants(edge.target, outgoing, focused);
  }
}

function readBuilderPanelState(): BuilderPanelState {
  return {
    leftPanelOpen: false,
    inspectorOpen: false,
    simulationPanelOpen: false
  };
}

function isBranchNodeType(type: ScriptVisualBuilderNodeType) {
  return type === "if_else" || type === "branch" || type === "switch" || type === "filter" || type === "condition";
}

function flowLabel(value: string) {
  return value.replace(/\bScripts\b/g, "Conversation Flows").replace(/\bScript\b/g, "Flow");
}

function creatorLabel(workspace: ScriptsWorkspaceData | null, creatorId: string) {
  const creator = workspace?.creators.find((item) => item.id === creatorId);
  return creator?.display_name || creator?.username || "Unknown";
}

function statusTone(script: OfMessageScript) {
  if (script.builder_config?.workspace?.archivedAt) return "bg-amber-500/14 text-amber-200";
  if (script.status === "active") return "bg-emerald-500/14 text-emerald-200";
  return "bg-blue-400/12 text-blue-100";
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
