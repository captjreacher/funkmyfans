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
  MessageCircleMore,
  MessageSquareText,
  Package,
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
import type { DragEvent, ReactNode } from "react";
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
  OfMessageScript,
  ScriptVisualBuilderConfig,
  ScriptVisualBuilderConnection,
  ScriptVisualBuilderNode,
  ScriptVisualBuilderNodeCategory,
  ScriptVisualBuilderNodeType
} from "@funkmyfans/of-types";
import { createCreatorScript, fetchScriptsWorkspace, saveScriptBuilder, updateScript, type ScriptsWorkspaceData } from "../lib/api";
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

const libraryTabs = ["Template Library", "Drafts", "Active", "Archived"] as const;
type LibraryTab = (typeof libraryTabs)[number];
type InspectorTab = "properties" | "validation" | "variables";

type BuilderSession = {
  script: OfMessageScript;
  flow: ScriptVisualBuilderConfig;
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
  onInlineEdit?: (nodeId: string, patch: Partial<ScriptVisualBuilderNode>) => void;
  onQuickAdd?: (sourceNodeId: string, type: ScriptVisualBuilderNodeType, sourceHandle?: string | null) => void;
};
type FlowNodeValidationState = FlowNodeData["validationState"];

type FlowNode = Node<FlowNodeData, "flowNode">;
type FlowEdge = Edge<{ label?: string }>;
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

export function Playbooks({ onOpenSimulations }: { onOpenSimulations?: (scriptId?: string) => void }) {
  const [workspace, setWorkspace] = useState<ScriptsWorkspaceData | null>(null);
  const [tab, setTab] = useState<LibraryTab>("Template Library");
  const [builderSession, setBuilderSession] = useState<BuilderSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadWorkspace();
  }, []);

  const scripts = workspace?.scripts ?? [];
  const filteredScripts = useMemo(() => {
    if (tab === "Active") return scripts.filter((script) => script.status === "active" && !script.builder_config?.workspace?.archivedAt);
    if (tab === "Drafts") return scripts.filter((script) => script.status !== "active" && !script.builder_config?.workspace?.archivedAt);
    if (tab === "Archived") return scripts.filter((script) => Boolean(script.builder_config?.workspace?.archivedAt));
    return scripts;
  }, [scripts, tab]);

  async function loadWorkspace(preferredId?: string) {
    try {
      const result = await fetchScriptsWorkspace();
      setWorkspace(result);
      if (preferredId) {
        const script = result.scripts.find((item) => item.id === preferredId);
        if (script) setBuilderSession({ script, flow: flowFromConversationFlow(script) });
      }
      setError(null);
    } catch (loadError) {
      setError(errorMessage(loadError, "Unable to load playbooks"));
    }
  }

  async function createFlow(template?: OfMessageScript) {
    const creatorId = template?.creator_id ?? workspace?.creators[0]?.id;
    if (!creatorId) {
      setError("Connect a creator before creating a conversation flow.");
      return;
    }
    setBusy(true);
    try {
      const response = await createCreatorScript(creatorId, {
        name: template ? `${template.name.replace(/\bScript\b/g, "Flow")} Draft` : "New Conversation Flow",
        description: template?.description ?? "Conversation flow ready for builder configuration.",
        triggerEventType: template?.trigger_event_type ?? "manual",
        autoSendEnabled: false,
        requiresApproval: true,
        actionMode: template?.action_mode ?? "draft_for_approval",
        cooldownHours: template?.cooldown_hours ?? 24,
        maxSendsPerFan: template?.max_sends_per_fan ?? 1,
        folderName: template?.folder_name ?? "Playbooks",
        category: template?.category ?? "General",
        tags: template?.tags?.length ? template.tags : ["playbook", "flow"],
        builderConfig: {
          schemaVersion: 1,
          variables: template?.builder_config?.variables ?? [
            { key: "subscriber_name", label: "Subscriber Name", defaultValue: "there" },
            { key: "creator_name", label: "Creator Name", defaultValue: "creator" }
          ],
          workspace: {
            archivedAt: null,
            execution: { mode: "immediate" },
            ai: { mode: "draft_only" },
            approval: { mode: "always_approve" },
            conditions: [],
            ...template?.builder_config?.workspace
          }
        },
        steps: template?.steps?.length
          ? template.steps.map((step, index) => ({
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
      const next = result.scripts.find((script) => script.id === response.script.id) ?? response.script;
      setBuilderSession({ script: next, flow: flowFromConversationFlow(next) });
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
      setBuilderSession({ script: nextScript, flow: flowFromConversationFlow(nextScript) });
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
      setBuilderSession({ script: result.script, flow: flowFromConversationFlow(result.script) });
      setError(null);
    } catch (statusError) {
      setError(errorMessage(statusError, "Unable to update flow status"));
    } finally {
      setBusy(false);
    }
  }

  if (builderSession) {
    return (
      <ReactFlowProvider>
        <ConversationFlowBuilder
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
      </ReactFlowProvider>
    );
  }

  return (
    <main className="animate-in-soft space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Playbooks</div>
          <h2 className="mt-1 text-2xl font-semibold text-white">Template library and conversation flows</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void loadWorkspace()} className="inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
          <button type="button" onClick={() => void createFlow()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-45">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Flow
          </button>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <nav className="premium-card flex gap-1 overflow-x-auto rounded-lg p-1">
        {libraryTabs.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-md px-3 py-2 text-sm font-semibold ${tab === item ? "selected-glow text-white" : "text-blue-100/64 hover:bg-[#1A3655]/55 hover:text-white"}`}>
            {item}
          </button>
        ))}
      </nav>

      <section className="premium-card overflow-hidden rounded-lg">
        <div className="grid grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.8fr] gap-3 border-b border-blue-500/18 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100/52">
          <div>Playbook / Flow</div>
          <div>Creator</div>
          <div>Trigger</div>
          <div>Status</div>
          <div className="text-right">Action</div>
        </div>
        <div className="divide-y divide-blue-500/12">
          {filteredScripts.map((script) => (
            <div key={script.id} className="grid grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.8fr] items-center gap-3 px-4 py-3 text-sm hover:bg-[#102338]/72">
              <button type="button" onClick={() => setBuilderSession({ script, flow: flowFromConversationFlow(script) })} className="min-w-0 text-left">
                <div className="truncate font-semibold text-white">{flowLabel(script.name)}</div>
                <div className="truncate text-xs text-blue-100/52">{script.description ?? script.category ?? "No description"}</div>
              </button>
              <div className="truncate text-blue-100/68">{creatorLabel(workspace, script.creator_id)}</div>
              <div className="truncate text-blue-100/68">{script.trigger_event_type}</div>
              <div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(script)}`}>{script.builder_config?.workspace?.archivedAt ? "archived" : script.status}</span></div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => void createFlow(script)} disabled={busy} className="rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-xs font-semibold text-blue-50 disabled:opacity-45">
                  Create from Template
                </button>
                <button type="button" onClick={() => setBuilderSession({ script, flow: flowFromConversationFlow(script) })} className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950">
                  Open Builder
                </button>
              </div>
            </div>
          ))}
          {!filteredScripts.length ? <div className="px-4 py-8 text-sm text-blue-100/58">No conversation flows in this view.</div> : null}
        </div>
      </section>
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
  const { screenToFlowPosition, getViewport } = useReactFlow();

  const flow = useMemo(() => fromReactFlow(nodes, edges, selectedNodeId, getViewport()), [edges, getViewport, nodes, selectedNodeId]);
  const validation = useMemo(() => validateBuilderFlow(flow), [flow]);
  const selectedBuilderNode = flow.nodes.find((node) => node.id === selectedNodeId) ?? flow.nodes[0] ?? null;
  const renderedNodes = nodes.map((node) =>
    withAuthoringData(node, validation, {
      onInlineEdit: updateNodeInline,
      onQuickAdd: quickAddStep
    })
  );

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
    setHistoryPast([]);
    setHistoryFuture([]);
  }, [session.script]);

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

  function updateNodeInline(nodeId: string, patch: Partial<ScriptVisualBuilderNode>) {
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
  }

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
  }

  function quickAddStep(sourceNodeId: string, type: ScriptVisualBuilderNodeType, sourceHandle?: string | null) {
    const sourceNode = nodes.find((node) => node.id === sourceNodeId);
    if (!sourceNode) return;
    const position = {
      x: sourceNode.position.x + 300,
      y: sourceNode.position.y + (sourceHandle === "yes" ? -110 : sourceHandle === "no" ? 110 : 0)
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
  }

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
  }

  return (
    <main className="animate-in-soft flex h-full min-h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-lg border border-blue-500/18 bg-[#071423]">
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
          <button type="button" onClick={() => onSave(flow)} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-45">
            <Save className="h-4 w-4" aria-hidden="true" />
            {busy ? "Saving..." : "Save"}
          </button>
          <button type="button" onClick={onSimulate} className="inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-[#102338]/72 px-4 py-2 text-sm font-semibold text-blue-50">
            <Play className="h-4 w-4" aria-hidden="true" />
            Simulate
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

      <div className="grid min-h-0 flex-1 grid-cols-[250px_minmax(560px,1fr)_340px] overflow-hidden">
        <NodeLibrary onDragStart={handleDragStart} onAddNode={addNode} />

        <section className="min-h-0 overflow-hidden bg-[#06111d]" onDrop={handleDrop} onDragOver={handleDragOver}>
          <ReactFlow<FlowNode, FlowEdge>
            nodes={renderedNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStart={() => pushHistory()}
            onNodeDoubleClick={(_, node) => {
              setSelectedNodeId(node.id);
              setSelectedEdgeIds([]);
              setInspectorTab("properties");
              setEditingNodeId(node.id);
            }}
            onEdgeDoubleClick={(event, edge) => {
              event.preventDefault();
              pushHistory();
              setEdges((current) => current.filter((item) => item.id !== edge.id));
              setSelectedEdgeIds([]);
            }}
            onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => {
              setSelectedNodeId(selectedNodes[0]?.id ?? null);
              setSelectedEdgeIds(selectedEdges.map((edge) => edge.id));
            }}
            isValidConnection={(connection) => Boolean(connection.source && connection.target && connection.source !== connection.target)}
            fitView
            deleteKeyCode={["Backspace", "Delete"]}
            multiSelectionKeyCode={["Shift"]}
          >
            <Background variant={BackgroundVariant.Dots} color="rgba(59,130,246,.30)" gap={24} size={1} />
            <MiniMap pannable zoomable nodeStrokeWidth={3} nodeColor={(node) => categoryColor((node.data as Partial<FlowNodeData>).category)} />
            <Controls />
          </ReactFlow>
        </section>

        <Inspector
          tab={inspectorTab}
          onTabChange={setInspectorTab}
          node={selectedBuilderNode}
          flow={flow}
          validation={validation}
          onUpdateNode={updateSelectedNode}
          editingNodeId={editingNodeId}
          onEditingHandled={() => setEditingNodeId(null)}
        />
      </div>
    </main>
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
  onEditingHandled
}: {
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  node: ScriptVisualBuilderNode | null;
  flow: ScriptVisualBuilderConfig;
  validation: FlowValidationIssue[];
  onUpdateNode: (patch: Partial<ScriptVisualBuilderNode>) => void;
  editingNodeId: string | null;
  onEditingHandled: () => void;
}) {
  const nodeIssues = node ? validation.filter((issue) => issue.nodeId === node.id) : [];
  return (
    <aside className="min-h-0 overflow-y-auto border-l border-blue-500/18 bg-[#081524] p-4">
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-blue-500/18 bg-[#0D1B2A]/65 p-1">
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
  return (
    <div>
      <div className="mt-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">{entry.label}</div>
          <div className="truncate text-xs text-blue-100/52">{nodeCategoryLabels[entry.category]}</div>
        </div>
      </div>

      <div className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">Step settings</div>

      <Field label="Step name">
        <input ref={nameInputRef} value={node.label} onChange={(event) => onUpdateNode({ label: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
      </Field>

      {entry.configurationSchema.map((field) => (
        <Field key={field.key} label={field.label}>
          {field.input === "textarea" ? (
            <textarea value={stringValue(node.config[field.key])} onChange={(event) => onUpdateNode({ config: { ...node.config, [field.key]: event.target.value } })} rows={5} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
          ) : field.input === "number" ? (
            <input type="number" value={numberValue(node.config[field.key])} onChange={(event) => onUpdateNode({ config: { ...node.config, [field.key]: Number(event.target.value) } })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
          ) : field.input === "select" ? (
            <select value={stringValue(node.config[field.key])} onChange={(event) => onUpdateNode({ config: { ...node.config, [field.key]: event.target.value } })} className="command-card w-full rounded-lg px-3 py-2 text-sm">
              {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          ) : (
            <input value={stringValue(node.config[field.key])} onChange={(event) => onUpdateNode({ config: { ...node.config, [field.key]: event.target.value } })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
          )}
        </Field>
      ))}

      {issues.length ? (
        <div className="mt-4 space-y-2">
          {issues.map((issue) => <IssueRow key={issue.message} issue={issue} />)}
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
  const canReceive = data.type !== "trigger";
  const canSend = data.type !== "end";
  const [quickAddHandle, setQuickAddHandle] = useState<string | null | false>(false);
  const validationTone = validationToneClass(data.validationState);
  return (
    <div className={`relative w-[210px] rounded-lg border p-3 shadow-[0_18px_48px_rgba(0,0,0,.28)] ${selected ? "border-cyan-300 bg-[#15314E]" : "border-blue-500/20 bg-[#0D1B2A]"}`} style={{ borderTopColor: color, borderTopWidth: 3 }}>
      {canReceive ? <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-[#06111d]" style={{ background: color }} /> : null}
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ background: `${color}24`, color }}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <input
          value={data.label}
          onChange={(event) => data.onInlineEdit?.(id, { label: event.target.value })}
          className="nodrag min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-sm font-semibold text-white outline-none focus:border-cyan-300/50 focus:bg-[#06111d]/80"
          aria-label="Step name"
        />
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${validationTone}`} title={data.validationMessage}>
          {data.validationState}
        </span>
      </div>
      <InlineStepEditor nodeId={id} data={data} />
      {canSend && !isBranch ? (
        <>
          <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-[#06111d]" style={{ background: color }} />
          <QuickAddButton onClick={() => setQuickAddHandle(quickAddHandle === null ? false : null)} className="right-[-34px] top-1/2 -translate-y-1/2" />
        </>
      ) : null}
      {canSend && isBranch ? (
        <>
          <Handle id="yes" type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-[#06111d]" style={{ top: 26, background: "#22c55e" }} />
          <Handle id="no" type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-[#06111d]" style={{ top: 62, background: "#fb7185" }} />
          <div className="mt-3 grid gap-2 text-[11px] font-semibold uppercase tracking-[0.08em]">
            <button type="button" onClick={() => setQuickAddHandle(quickAddHandle === "yes" ? false : "yes")} className="nodrag flex items-center justify-between rounded-md border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-emerald-100">
              YES path <Plus className="h-3 w-3" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setQuickAddHandle(quickAddHandle === "no" ? false : "no")} className="nodrag flex items-center justify-between rounded-md border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-rose-100">
              {data.type === "switch" || data.type === "filter" ? "Fallback path" : "NO path"} <Plus className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </>
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
    sourceHandle: connection.label === "yes" || connection.label === "no" ? connection.label : null
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
  const label = connection.label ?? (connection.sourceHandle === "yes" || connection.sourceHandle === "no" ? connection.sourceHandle : undefined);
  const displayLabel = label === "yes" ? "YES path" : label === "no" ? "NO path" : undefined;
  return {
    id: connection.id ?? `edge-${connection.source}-${connection.sourceHandle ?? "out"}-${connection.target}-${Date.now()}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle ?? null,
    type: "smoothstep",
    label: displayLabel,
    data: { label },
    style: { stroke: "rgba(34,211,238,.82)", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(34,211,238,.82)" }
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
  handlers: Pick<FlowNodeData, "onInlineEdit" | "onQuickAdd">
): FlowNode {
  return {
    ...node,
    data: {
      ...node.data,
      ...handlers,
      issues: validation.filter((issue) => issue.nodeId === node.id).length,
      validationState: nodeValidationState(node.id, validation),
      validationMessage: validation.find((issue) => issue.nodeId === node.id)?.message
    }
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
  if (type === "approve") return { label: "Human Approval", config: { approvalNote: "Review this response before it continues.", destination: "Review Queue" } };
  if (type === "ppv_offer") return { label: "PPV Offer", config: { title: "Premium drop", price: 20, body: "I have something premium ready if you want it." } };
  if (type === "delay") return { label: "Follow-up", config: { delayMinutes: 180, body: "Check back in if they have not replied." } };
  if (type === "end") return { label: "End", config: { outcome: "complete" } };
  return { config: {} };
}

function arrangeFlowNodes(nodes: FlowNode[], edges: FlowEdge[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, FlowEdge[]>();
  for (const edge of edges) outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);

  const root = nodes.find((node) => node.data.type === "trigger") ?? nodes[0];
  const depth = new Map<string, number>();
  const queue: string[] = [];
  if (root) {
    depth.set(root.id, 0);
    queue.push(root.id);
  }
  while (queue.length) {
    const nodeId = queue.shift()!;
    const currentDepth = depth.get(nodeId) ?? 0;
    for (const edge of outgoing.get(nodeId) ?? []) {
      if (!byId.has(edge.target) || depth.has(edge.target)) continue;
      depth.set(edge.target, currentDepth + 1);
      queue.push(edge.target);
    }
  }
  for (const node of nodes) {
    if (!depth.has(node.id)) depth.set(node.id, Math.max(1, Math.floor(node.position.x / 300)));
  }

  const columns = new Map<number, FlowNode[]>();
  for (const node of nodes) {
    const column = depth.get(node.id) ?? 0;
    columns.set(column, [...(columns.get(column) ?? []), node]);
  }

  return nodes.map((node) => {
    const column = depth.get(node.id) ?? 0;
    const peers = (columns.get(column) ?? []).sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
    const index = peers.findIndex((peer) => peer.id === node.id);
    return {
      ...node,
      position: {
        x: 80 + column * 300,
        y: 120 + Math.max(index, 0) * 170
      }
    };
  });
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
  if (node.type === "if_else" || node.type === "branch" || node.type === "switch" || node.type === "filter") return `${stringValue(node.config.conditionKey) || "condition"} = ${stringValue(node.config.conditionValue) || "value"}`;
  if (node.type === "delay" || node.type === "expiry") return `${numberValue(node.config.delayMinutes)} minutes`;
  if (node.type === "schedule") return stringValue(node.config.scheduleLabel) || "Scheduled";
  if (node.type === "approve") return stringValue(node.config.destination) || "Approval required";
  if (node.type === "assign" || node.type === "escalate") return stringValue(node.config.queueName) || "Queue";
  return stringValue(node.config.body) || stringValue(node.config.title) || "Configured step";
}

function operatorIssueMessage(message: string) {
  return message.replaceAll("nodes", "steps").replaceAll("Nodes", "Steps").replaceAll("node", "step").replaceAll("Node", "Step");
}

function categoryColor(category?: ScriptVisualBuilderNodeCategory) {
  if (category === "ai") return "#38bdf8";
  if (category === "logic") return "#a78bfa";
  if (category === "human") return "#f59e0b";
  if (category === "commerce") return "#22c55e";
  if (category === "timing") return "#60a5fa";
  return "#22d3ee";
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
