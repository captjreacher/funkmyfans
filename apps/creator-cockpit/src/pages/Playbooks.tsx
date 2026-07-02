import {
  Archive,
  Bot,
  CheckCircle2,
  ChevronLeft,
  GitBranch,
  Hourglass,
  Layers3,
  MessageSquareText,
  MousePointer2,
  Play,
  Plus,
  RefreshCw,
  Route,
  Save,
  Sparkles,
  Split,
  UserCheck,
  UsersRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type {
  MessageScriptStepType,
  MessageScriptTemplate,
  OfMessageScript,
  ScriptBuilderConfig,
  ScriptBuilderStepMetadata,
  ScriptVisualBuilderConnection,
  ScriptVisualBuilderNode,
  ScriptVisualBuilderNodeType
} from "@funkmyfans/of-types";
import { createCreatorScript, fetchScriptsWorkspace, saveScriptBuilder, updateScript, type ScriptsWorkspaceData } from "../lib/api";

const libraryTabs = ["Template Library", "Drafts", "Active", "Archived"] as const;
type LibraryTab = (typeof libraryTabs)[number];
type CreationMode = "wizard" | "visual";

const wizardStages = ["Goal", "Template", "Components", "Variables", "Branches", "Review", "Activate"] as const;

type WizardDraft = {
  name: string;
  description: string;
  category: string;
  folderName: string;
  triggerEventType: string;
  actionMode: string;
};

type BuilderDraft = {
  script: OfMessageScript;
  nodes: ScriptVisualBuilderNode[];
  connections: ScriptVisualBuilderConnection[];
  selectedNodeId: string;
};

type NodeDefinition = {
  type: ScriptVisualBuilderNodeType;
  label: string;
  description: string;
  icon: LucideIcon;
};

const nodeLibrary: NodeDefinition[] = [
  { type: "trigger", label: "Trigger", description: "Entry event", icon: Route },
  { type: "message", label: "Message / Reply", description: "Outbound copy", icon: MessageSquareText },
  { type: "ai_prompt", label: "AI Prompt", description: "Drafting instruction", icon: Bot },
  { type: "condition", label: "Condition", description: "Rule check", icon: GitBranch },
  { type: "branch", label: "Branch", description: "Path split", icon: Split },
  { type: "human_approval", label: "Human Approval", description: "Operator gate", icon: UserCheck },
  { type: "assign_queue", label: "Assign to Queue", description: "Human handoff", icon: UsersRound },
  { type: "delay", label: "Delay / Follow-up", description: "Wait step", icon: Hourglass },
  { type: "end", label: "End State", description: "Terminal state", icon: CheckCircle2 }
];

const nodeSize = { width: 190, height: 86 };

export function Playbooks({ onOpenSimulations }: { onOpenSimulations?: (scriptId?: string) => void }) {
  const [workspace, setWorkspace] = useState<ScriptsWorkspaceData | null>(null);
  const [tab, setTab] = useState<LibraryTab>("Template Library");
  const [mode, setMode] = useState<CreationMode>("wizard");
  const [wizardScript, setWizardScript] = useState<OfMessageScript | null>(null);
  const [wizardStage, setWizardStage] = useState(0);
  const [wizardDraft, setWizardDraft] = useState<WizardDraft | null>(null);
  const [builderDraft, setBuilderDraft] = useState<BuilderDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    if (!wizardScript) {
      setWizardDraft(null);
      return;
    }
    setWizardDraft({
      name: wizardScript.name,
      description: wizardScript.description ?? "",
      category: wizardScript.category ?? "General",
      folderName: wizardScript.folder_name ?? "Journey Library",
      triggerEventType: wizardScript.trigger_event_type,
      actionMode: wizardScript.action_mode
    });
  }, [wizardScript]);

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
        const next = result.scripts.find((script) => script.id === preferredId) ?? null;
        if (mode === "visual" && next) setBuilderDraft(toBuilderDraft(next));
        else setWizardScript(next);
      }
      setError(null);
    } catch (loadError) {
      setError(errorMessage(loadError, "Unable to load playbooks"));
    }
  }

  async function createPlaybook(template?: OfMessageScript, openMode: CreationMode = mode) {
    const creatorId = template?.creator_id ?? workspace?.creators[0]?.id;
    if (!creatorId) {
      setError("Connect a creator before creating a playbook.");
      return;
    }
    setBusy(true);
    try {
      const response = await createCreatorScript(creatorId, {
        name: template ? `${template.name} Draft` : "New Playbook",
        description: template?.description ?? "Draft automation builder shell.",
        triggerEventType: template?.trigger_event_type ?? "manual",
        autoSendEnabled: false,
        requiresApproval: true,
        actionMode: template?.action_mode ?? "draft_for_approval",
        cooldownHours: template?.cooldown_hours ?? 24,
        maxSendsPerFan: template?.max_sends_per_fan ?? 1,
        folderName: template?.folder_name ?? "Journey Library",
        category: template?.category ?? "General",
        tags: template?.tags?.length ? template.tags : ["playbook"],
        builderConfig: {
          schemaVersion: 1,
          variables: template?.builder_config?.variables ?? defaultVariables(),
          workspace: {
            ...defaultWorkspaceConfig(),
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
          : [{ order: 0, type: "message", body: "Hey {{subscriber_name}}, I wanted to reach out personally.", metadata: defaultStepMetadata("message") }]
      });
      setWizardStage(0);
      setMode(openMode);
      const result = await fetchScriptsWorkspace();
      setWorkspace(result);
      const next = result.scripts.find((script) => script.id === response.script.id) ?? response.script;
      if (openMode === "visual") {
        setWizardScript(null);
        setBuilderDraft(toBuilderDraft(next));
      } else {
        setBuilderDraft(null);
        setWizardScript(next);
      }
      setError(null);
    } catch (createError) {
      setError(errorMessage(createError, "Unable to create playbook"));
    } finally {
      setBusy(false);
    }
  }

  async function saveWizardDraft() {
    if (!wizardScript || !wizardDraft) return;
    if (!isUuid(wizardScript.id)) {
      await createPlaybook(wizardScript, "wizard");
      return;
    }
    setBusy(true);
    try {
      const result = await updateScript(wizardScript.id, {
        name: wizardDraft.name,
        description: wizardDraft.description,
        category: wizardDraft.category,
        folder_name: wizardDraft.folderName,
        trigger_event_type: wizardDraft.triggerEventType,
        action_mode: wizardDraft.actionMode as OfMessageScript["action_mode"]
      });
      setWizardScript(result.script);
      await loadWorkspace(result.script.id);
    } catch (saveError) {
      setError(errorMessage(saveError, "Unable to customise playbook"));
    } finally {
      setBusy(false);
    }
  }

  async function setPlaybookStatus(status: OfMessageScript["status"]) {
    const activeScript = builderDraft?.script ?? wizardScript;
    if (!activeScript) return;
    if (!isUuid(activeScript.id)) {
      await createPlaybook(activeScript, mode);
      return;
    }
    setBusy(true);
    try {
      const result = await updateScript(activeScript.id, { status });
      if (mode === "visual") setBuilderDraft((current) => (current ? { ...current, script: result.script } : toBuilderDraft(result.script)));
      else setWizardScript(result.script);
      await loadWorkspace(result.script.id);
    } catch (statusError) {
      setError(errorMessage(statusError, "Unable to update playbook status"));
    } finally {
      setBusy(false);
    }
  }

  async function saveBuilderDraft() {
    if (!builderDraft) return;
    if (!isUuid(builderDraft.script.id)) {
      await createPlaybook(builderDraft.script, "visual");
      return;
    }
    setBusy(true);
    try {
      const response = await saveScriptBuilder(builderDraft.script.id, toBuilderTemplate(builderDraft));
      setBuilderDraft(toBuilderDraft(response.script));
      await loadWorkspace(response.script.id);
    } catch (saveError) {
      setError(errorMessage(saveError, "Unable to save visual builder"));
    } finally {
      setBusy(false);
    }
  }

  function openScript(script: OfMessageScript, nextMode: CreationMode) {
    setMode(nextMode);
    setError(null);
    if (nextMode === "visual") {
      setWizardScript(null);
      setBuilderDraft(toBuilderDraft(script));
    } else {
      setBuilderDraft(null);
      setWizardScript(script);
    }
  }

  function updateBuilderNode(nodeId: string, patch: Partial<ScriptVisualBuilderNode>) {
    setBuilderDraft((current) =>
      current
        ? {
            ...current,
            nodes: current.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch, config: patch.config ?? node.config } : node))
          }
        : current
    );
  }

  function addBuilderNode(type: ScriptVisualBuilderNodeType) {
    setBuilderDraft((current) => {
      if (!current) return current;
      const definition = nodeDefinition(type);
      const previous = current.nodes[current.nodes.length - 1];
      const id = tempId(type);
      const nextNode: ScriptVisualBuilderNode = {
        id,
        type,
        label: definition.label,
        x: previous ? previous.x + 260 : 140,
        y: previous ? previous.y + (type === "branch" || type === "condition" ? 120 : 0) : 160,
        config: defaultNodeConfig(type)
      };
      return {
        ...current,
        selectedNodeId: id,
        nodes: [...current.nodes, nextNode],
        connections: previous
          ? [...current.connections, { id: tempId("edge"), from: previous.id, to: id, label: previous.type === "branch" ? "path" : undefined }]
          : current.connections
      };
    });
  }

  function updateConnection(from: string, to: string, label?: string) {
    setBuilderDraft((current) => {
      if (!current || !to) return current;
      const existing = current.connections.find((connection) => connection.from === from && connection.label === label);
      if (existing) {
        return {
          ...current,
          connections: current.connections.map((connection) => (connection.id === existing.id ? { ...connection, to } : connection))
        };
      }
      return {
        ...current,
        connections: [...current.connections, { id: tempId("edge"), from, to, label }]
      };
    });
  }

  if (builderDraft) {
    return (
      <VisualBuilder
        draft={builderDraft}
        workspace={workspace}
        busy={busy}
        error={error}
        onBack={() => setBuilderDraft(null)}
        onSave={() => void saveBuilderDraft()}
        onSimulate={() => onOpenSimulations?.(builderDraft.script.id)}
        onStatusChange={(status) => void setPlaybookStatus(status)}
        onSelectNode={(nodeId) => setBuilderDraft((current) => (current ? { ...current, selectedNodeId: nodeId } : current))}
        onAddNode={addBuilderNode}
        onUpdateNode={updateBuilderNode}
        onConnect={updateConnection}
      />
    );
  }

  if (wizardScript) {
    return (
      <main className="animate-in-soft space-y-4">
        <section className="premium-card rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setWizardScript(null)} className="inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Playbooks
            </button>
            <ModeToggle mode={mode} onModeChange={(nextMode) => openScript(wizardScript, nextMode)} />
            <div className="flex flex-wrap gap-2">
              {wizardStages.map((stage, index) => (
                <button key={stage} type="button" onClick={() => setWizardStage(index)} className={`rounded-md px-3 py-2 text-xs font-semibold ${wizardStage === index ? "selected-glow text-white" : "border border-blue-500/15 bg-[#0D1B2A]/65 text-blue-100/64"}`}>
                  {index + 1}. {stage}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid min-h-[65vh] gap-4 xl:grid-cols-[0.7fr_1.3fr]">
          <aside className="premium-card rounded-lg p-4">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200/80">Wizard</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">{wizardScript.name}</h2>
            <p className="mt-2 text-sm leading-6 text-blue-100/64">{wizardScript.description ?? "Automation builder shell"}</p>
            <div className="mt-4 space-y-2">
              <ContextRow label="Creator" value={creatorLabel(workspace, wizardScript.creator_id)} />
              <ContextRow label="Trigger" value={wizardScript.trigger_event_type} />
              <ContextRow label="Mode" value={wizardScript.action_mode} />
              <ContextRow label="Status" value={wizardScript.status} />
            </div>
          </aside>

          <section className="premium-card rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              <h3 className="text-xl font-semibold text-white">{wizardStages[wizardStage]}</h3>
            </div>
            <WizardStage
              script={wizardScript}
              stage={wizardStages[wizardStage]}
              draft={wizardDraft}
              busy={busy}
              onDraftChange={setWizardDraft}
              onSave={() => void saveWizardDraft()}
              onCreateDraft={() => void createPlaybook(wizardScript, "wizard")}
              onActivate={() => void setPlaybookStatus("active")}
              onDeactivate={() => void setPlaybookStatus("inactive")}
            />
            <div className="mt-6 flex justify-between gap-3">
              <button type="button" onClick={() => setWizardStage((current) => Math.max(0, current - 1))} className="rounded-lg border border-blue-400/20 bg-[#102338]/72 px-4 py-2.5 text-sm font-semibold text-blue-50">Back</button>
              <button type="button" onClick={() => setWizardStage((current) => Math.min(wizardStages.length - 1, current + 1))} className="rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950">Next</button>
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="animate-in-soft space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Playbooks</div>
          <h2 className="mt-1 text-2xl font-semibold text-white">Automation builder workspace</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <ModeToggle mode={mode} onModeChange={setMode} />
          <button type="button" onClick={() => void loadWorkspace()} className="inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
          <button type="button" onClick={() => void createPlaybook(undefined, mode)} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-45">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {mode === "visual" ? "New Visual Playbook" : tab === "Template Library" ? "Create from Template" : "Create Playbook"}
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
        <div className="grid grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-blue-500/18 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100/52">
          <div>Playbook</div>
          <div>Creator</div>
          <div>Trigger</div>
          <div>Status</div>
          <div className="text-right">Open</div>
        </div>
        <div className="divide-y divide-blue-500/12">
          {filteredScripts.map((script) => (
            <button key={script.id} type="button" onClick={() => openScript(script, mode)} className="grid w-full grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.7fr] items-center gap-3 px-4 py-3 text-left text-sm hover:bg-[#102338]/72">
              <div className="min-w-0">
                <div className="truncate font-semibold text-white">{script.name}</div>
                <div className="truncate text-xs text-blue-100/52">{script.description ?? script.category ?? "No description"}</div>
              </div>
              <div className="truncate text-blue-100/68">{creatorLabel(workspace, script.creator_id)}</div>
              <div className="truncate text-blue-100/68">{script.trigger_event_type}</div>
              <div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(script)}`}>{script.builder_config?.workspace?.archivedAt ? "archived" : script.status}</span></div>
              <div className="text-right text-cyan-200">{mode === "visual" ? "Builder" : isUuid(script.id) ? "Wizard" : "Template"}</div>
            </button>
          ))}
          {!filteredScripts.length ? <div className="px-4 py-8 text-sm text-blue-100/58">No playbooks in this view.</div> : null}
        </div>
      </section>
    </main>
  );
}

function VisualBuilder({
  draft,
  workspace,
  busy,
  error,
  onBack,
  onSave,
  onSimulate,
  onStatusChange,
  onSelectNode,
  onAddNode,
  onUpdateNode,
  onConnect
}: {
  draft: BuilderDraft;
  workspace: ScriptsWorkspaceData | null;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onSave: () => void;
  onSimulate: () => void;
  onStatusChange: (status: OfMessageScript["status"]) => void;
  onSelectNode: (nodeId: string) => void;
  onAddNode: (type: ScriptVisualBuilderNodeType) => void;
  onUpdateNode: (nodeId: string, patch: Partial<ScriptVisualBuilderNode>) => void;
  onConnect: (from: string, to: string, label?: string) => void;
}) {
  const selectedNode = draft.nodes.find((node) => node.id === draft.selectedNodeId) ?? draft.nodes[0];
  const sortedNodes = [...draft.nodes].sort((a, b) => a.x - b.x || a.y - b.y);
  const canvasWidth = Math.max(980, ...draft.nodes.map((node) => node.x + nodeSize.width + 160));
  const canvasHeight = Math.max(620, ...draft.nodes.map((node) => node.y + nodeSize.height + 160));

  return (
    <main className="animate-in-soft flex h-full min-h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-lg border border-blue-500/18 bg-[#071423]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-blue-500/18 bg-[#0B1828]/95 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-white">{draft.script.name}</div>
            <div className="truncate text-xs text-blue-100/58">{creatorLabel(workspace, draft.script.creator_id)} · {draft.script.trigger_event_type} · {draft.script.status}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onSave} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-45">
            <Save className="h-4 w-4" aria-hidden="true" />
            {busy ? "Saving..." : "Save"}
          </button>
          <button type="button" onClick={onSimulate} className="inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-[#102338]/72 px-4 py-2 text-sm font-semibold text-blue-50">
            <Play className="h-4 w-4" aria-hidden="true" />
            Simulate
          </button>
          <button type="button" onClick={() => onStatusChange(draft.script.status === "active" ? "inactive" : "active")} disabled={busy} className="rounded-lg border border-blue-400/20 bg-[#102338]/72 px-4 py-2 text-sm font-semibold text-blue-50 disabled:opacity-45">
            {draft.script.status === "active" ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      {error ? <div className="shrink-0 border-b border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(560px,1fr)_320px] overflow-hidden">
        <aside className="min-h-0 overflow-y-auto border-r border-blue-500/18 bg-[#081524] p-3">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">Node Library</div>
          <div className="space-y-2">
            {nodeLibrary.map((node) => {
              const Icon = node.icon;
              return (
                <button key={node.type} type="button" onClick={() => onAddNode(node.type)} className="flex w-full items-center gap-3 rounded-lg border border-blue-500/15 bg-[#102338]/62 p-3 text-left hover:border-cyan-300/35 hover:bg-[#15314E]">
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
        </aside>

        <section className="relative min-h-0 overflow-auto bg-[#06111d]">
          <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-lg border border-blue-500/18 bg-[#0B1828]/90 px-3 py-2 text-xs font-semibold text-blue-100/70">
            <MousePointer2 className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            {draft.nodes.length} nodes · {draft.connections.length} connectors
          </div>
          <div className="relative" style={{ width: canvasWidth, height: canvasHeight }}>
            <CanvasGrid />
            <svg className="pointer-events-none absolute inset-0 h-full w-full" role="presentation">
              <defs>
                <marker id="builder-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="rgba(34,211,238,0.72)" />
                </marker>
              </defs>
              {draft.connections.map((connection) => {
                const from = draft.nodes.find((node) => node.id === connection.from);
                const to = draft.nodes.find((node) => node.id === connection.to);
                if (!from || !to) return null;
                const startX = from.x + nodeSize.width;
                const startY = from.y + nodeSize.height / 2;
                const endX = to.x;
                const endY = to.y + nodeSize.height / 2;
                const mid = Math.max(40, (endX - startX) / 2);
                return (
                  <g key={connection.id}>
                    <path d={`M ${startX} ${startY} C ${startX + mid} ${startY}, ${endX - mid} ${endY}, ${endX} ${endY}`} fill="none" stroke="rgba(34,211,238,0.72)" strokeWidth="2" markerEnd="url(#builder-arrow)" />
                    {connection.label ? (
                      <text x={(startX + endX) / 2} y={(startY + endY) / 2 - 8} fill="rgba(207,250,254,0.82)" fontSize="12" textAnchor="middle">
                        {connection.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>
            {sortedNodes.map((node) => (
              <BuilderNode key={node.id} node={node} selected={selectedNode?.id === node.id} onSelect={() => onSelectNode(node.id)} />
            ))}
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto border-l border-blue-500/18 bg-[#081524] p-4">
          {selectedNode ? (
            <NodeSettings
              node={selectedNode}
              nodes={draft.nodes}
              connections={draft.connections}
              onUpdate={(patch) => onUpdateNode(selectedNode.id, patch)}
              onConnect={(to, label) => onConnect(selectedNode.id, to, label)}
            />
          ) : (
            <div className="text-sm text-blue-100/58">Select a node to edit its config.</div>
          )}
        </aside>
      </div>
    </main>
  );
}

function CanvasGrid() {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: "linear-gradient(rgba(59,130,246,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,.10) 1px, transparent 1px)",
        backgroundSize: "32px 32px"
      }}
    />
  );
}

function BuilderNode({ node, selected, onSelect }: { node: ScriptVisualBuilderNode; selected: boolean; onSelect: () => void }) {
  const definition = nodeDefinition(node.type);
  const Icon = definition.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`absolute rounded-lg border p-3 text-left shadow-[0_18px_48px_rgba(0,0,0,.28)] ${selected ? "border-cyan-300 bg-[#15314E]" : "border-blue-500/20 bg-[#0D1B2A] hover:border-cyan-300/35"}`}
      style={{ left: node.x, top: node.y, width: nodeSize.width, height: nodeSize.height }}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${selected ? "text-cyan-200" : "text-blue-200"}`} aria-hidden="true" />
        <div className="truncate text-sm font-semibold text-white">{node.label}</div>
      </div>
      <div className="mt-2 line-clamp-2 text-xs leading-5 text-blue-100/58">{nodeSummary(node)}</div>
    </button>
  );
}

function NodeSettings({
  node,
  nodes,
  connections,
  onUpdate,
  onConnect
}: {
  node: ScriptVisualBuilderNode;
  nodes: ScriptVisualBuilderNode[];
  connections: ScriptVisualBuilderConnection[];
  onUpdate: (patch: Partial<ScriptVisualBuilderNode>) => void;
  onConnect: (to: string, label?: string) => void;
}) {
  const config = node.config;
  const nextConnection = connections.find((connection) => connection.from === node.id && !connection.label);
  const yesConnection = connections.find((connection) => connection.from === node.id && connection.label === "yes");
  const noConnection = connections.find((connection) => connection.from === node.id && connection.label === "no");
  const isBranching = node.type === "branch" || node.type === "condition";

  function setConfig(key: string, value: unknown) {
    onUpdate({ config: { ...config, [key]: value } });
  }

  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">Selected Node</div>
      <Field label="Label">
        <input value={node.label} onChange={(event) => onUpdate({ label: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
      </Field>
      <Field label="Type">
        <select value={node.type} onChange={(event) => onUpdate({ type: event.target.value as ScriptVisualBuilderNodeType, config: defaultNodeConfig(event.target.value as ScriptVisualBuilderNodeType) })} className="command-card w-full rounded-lg px-3 py-2 text-sm">
          {nodeLibrary.map((definition) => (
            <option key={definition.type} value={definition.type}>{definition.label}</option>
          ))}
        </select>
      </Field>

      {node.type === "trigger" ? (
        <Field label="Trigger event">
          <input value={stringConfig(config.eventType)} onChange={(event) => setConfig("eventType", event.target.value)} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
        </Field>
      ) : null}

      {node.type === "message" || node.type === "ai_prompt" ? (
        <Field label={node.type === "ai_prompt" ? "Prompt" : "Message"}>
          <textarea value={stringConfig(config.body)} onChange={(event) => setConfig("body", event.target.value)} rows={5} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
        </Field>
      ) : null}

      {node.type === "condition" || node.type === "branch" ? (
        <>
          <Field label="Condition key">
            <input value={stringConfig(config.conditionKey)} onChange={(event) => setConfig("conditionKey", event.target.value)} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Condition value">
            <input value={stringConfig(config.conditionValue)} onChange={(event) => setConfig("conditionValue", event.target.value)} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
          </Field>
        </>
      ) : null}

      {node.type === "human_approval" ? (
        <Field label="Approval note">
          <textarea value={stringConfig(config.approvalNote)} onChange={(event) => setConfig("approvalNote", event.target.value)} rows={4} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
        </Field>
      ) : null}

      {node.type === "assign_queue" ? (
        <Field label="Queue label">
          <input value={stringConfig(config.queueName)} onChange={(event) => setConfig("queueName", event.target.value)} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
        </Field>
      ) : null}

      {node.type === "delay" ? (
        <Field label="Delay minutes">
          <input type="number" min={0} value={numberConfig(config.delayMinutes)} onChange={(event) => setConfig("delayMinutes", Number(event.target.value))} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
        </Field>
      ) : null}

      <div className="mt-5 border-t border-blue-500/18 pt-4">
        <div className="mb-3 text-sm font-semibold text-white">Paths</div>
        {isBranching ? (
          <div className="grid gap-3">
            <ConnectionSelect label="Yes path" value={yesConnection?.to ?? ""} nodes={nodes} currentNodeId={node.id} onChange={(to) => onConnect(to, "yes")} />
            <ConnectionSelect label="No path" value={noConnection?.to ?? ""} nodes={nodes} currentNodeId={node.id} onChange={(to) => onConnect(to, "no")} />
          </div>
        ) : (
          <ConnectionSelect label="Next node" value={nextConnection?.to ?? ""} nodes={nodes} currentNodeId={node.id} onChange={(to) => onConnect(to)} />
        )}
      </div>
    </div>
  );
}

function ConnectionSelect({ label, value, nodes, currentNodeId, onChange }: { label: string; value: string; nodes: ScriptVisualBuilderNode[]; currentNodeId: string; onChange: (to: string) => void }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="command-card w-full rounded-lg px-3 py-2 text-sm">
        <option value="">No connection</option>
        {nodes.filter((node) => node.id !== currentNodeId).map((node) => (
          <option key={node.id} value={node.id}>{node.label}</option>
        ))}
      </select>
    </Field>
  );
}

function ModeToggle({ mode, onModeChange }: { mode: CreationMode; onModeChange: (mode: CreationMode) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-blue-500/18 bg-[#0D1B2A]/65 p-1">
      <button type="button" onClick={() => onModeChange("wizard")} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${mode === "wizard" ? "selected-glow text-white" : "text-blue-100/64"}`}>Wizard Mode</button>
      <button type="button" onClick={() => onModeChange("visual")} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${mode === "visual" ? "selected-glow text-white" : "text-blue-100/64"}`}>Visual Builder Mode</button>
    </div>
  );
}

function WizardStage({
  script,
  stage,
  draft,
  busy,
  onDraftChange,
  onSave,
  onCreateDraft,
  onActivate,
  onDeactivate
}: {
  script: OfMessageScript;
  stage: (typeof wizardStages)[number];
  draft: WizardDraft | null;
  busy: boolean;
  onDraftChange: (draft: WizardDraft) => void;
  onSave: () => void;
  onCreateDraft: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  if (!isUuid(script.id)) {
    return (
      <div className="mt-5 rounded-lg border border-blue-500/15 bg-[#0D1B2A]/65 p-5">
        <Layers3 className="h-6 w-6 text-cyan-300" aria-hidden="true" />
        <div className="mt-4 text-lg font-semibold text-white">Template</div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/66">Create an editable draft from this template before customising or activating it.</p>
        <button type="button" onClick={onCreateDraft} disabled={busy} className="mt-4 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-45">
          {busy ? "Creating..." : "Create from Template"}
        </button>
      </div>
    );
  }
  if ((stage === "Goal" || stage === "Template") && draft) return <CustomiseStage draft={draft} busy={busy} onDraftChange={onDraftChange} onSave={onSave} />;
  if (stage === "Components") return <StageBody icon={Layers3} title={`${script.steps?.length ?? 0} components`} detail="Review messages, waits, questions, and actions as automation components." />;
  if (stage === "Variables") return <StageBody icon={Sparkles} title="Variables" detail="Map creator, subscriber, and offer variables before activation." />;
  if (stage === "Branches") return <StageBody icon={Archive} title="Branches" detail="Confirm conditional paths and fallback handling." />;
  if (stage === "Review") return <StageBody icon={CheckCircle2} title="Review" detail="Check approval mode, cooldowns, limits, and expected operator handoffs." />;
  return (
    <div className="mt-5 rounded-lg border border-blue-500/15 bg-[#0D1B2A]/65 p-5">
      <CheckCircle2 className="h-6 w-6 text-cyan-300" aria-hidden="true" />
      <div className="mt-4 text-lg font-semibold text-white">Activate</div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/66">Activation changes playbook status only. Runtime execution is not changed in this sprint.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={onActivate} disabled={busy || script.status === "active"} className="rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-45">Activate</button>
        <button type="button" onClick={onDeactivate} disabled={busy || script.status !== "active"} className="rounded-lg border border-blue-400/20 bg-[#102338]/72 px-4 py-2.5 text-sm font-semibold text-blue-50 disabled:opacity-45">Deactivate</button>
      </div>
    </div>
  );
}

function CustomiseStage({ draft, busy, onDraftChange, onSave }: { draft: WizardDraft; busy: boolean; onDraftChange: (draft: WizardDraft) => void; onSave: () => void }) {
  return (
    <div className="mt-5 grid gap-4 rounded-lg border border-blue-500/15 bg-[#0D1B2A]/65 p-5 md:grid-cols-2">
      <Field label="Name">
        <input value={draft.name} onChange={(event) => onDraftChange({ ...draft, name: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
      </Field>
      <Field label="Goal">
        <input value={draft.category} onChange={(event) => onDraftChange({ ...draft, category: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
      </Field>
      <Field label="Template">
        <input value={draft.folderName} onChange={(event) => onDraftChange({ ...draft, folderName: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
      </Field>
      <Field label="Trigger">
        <input value={draft.triggerEventType} onChange={(event) => onDraftChange({ ...draft, triggerEventType: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
      </Field>
      <Field label="Mode">
        <select value={draft.actionMode} onChange={(event) => onDraftChange({ ...draft, actionMode: event.target.value })} className="command-card w-full rounded-lg px-3 py-2 text-sm">
          <option value="task_only">Task only</option>
          <option value="draft_for_approval">Draft for approval</option>
          <option value="auto_send">Auto send</option>
        </select>
      </Field>
      <Field label="Description">
        <textarea value={draft.description} onChange={(event) => onDraftChange({ ...draft, description: event.target.value })} rows={3} className="command-card w-full rounded-lg px-3 py-2 text-sm" />
      </Field>
      <div className="md:col-span-2">
        <button type="button" onClick={onSave} disabled={busy || !draft.name.trim() || !draft.triggerEventType.trim()} className="rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-45">
          {busy ? "Saving..." : "Customise"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-4 block">
      <div className="mb-2 text-sm font-medium text-blue-100/62">{label}</div>
      {children}
    </label>
  );
}

function StageBody({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return (
    <div className="mt-5 rounded-lg border border-blue-500/15 bg-[#0D1B2A]/65 p-5">
      <Icon className="h-6 w-6 text-cyan-300" aria-hidden="true" />
      <div className="mt-4 text-lg font-semibold text-white">{title}</div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/66">{detail}</p>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-blue-500/12 bg-[#0D1B2A]/55 px-3 py-2 text-sm">
      <span className="text-blue-100/54">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-white">{value}</span>
    </div>
  );
}

function toBuilderDraft(script: OfMessageScript): BuilderDraft {
  const visualBuilder = script.builder_config?.workspace?.visualBuilder;
  const nodes = visualBuilder?.nodes?.length ? visualBuilder.nodes : nodesFromScript(script);
  const connections = visualBuilder?.connections?.length ? visualBuilder.connections : connectionsFromNodesAndSteps(nodes, script);
  return {
    script,
    nodes,
    connections,
    selectedNodeId: visualBuilder?.selectedNodeId ?? nodes[0]?.id ?? ""
  };
}

function nodesFromScript(script: OfMessageScript): ScriptVisualBuilderNode[] {
  const triggerNode: ScriptVisualBuilderNode = {
    id: "trigger",
    type: "trigger",
    label: "Trigger",
    x: 80,
    y: 220,
    config: { eventType: script.trigger_event_type }
  };
  const stepNodes = (script.steps?.length ? script.steps : []).map((step, index) => ({
    id: step.id,
    type: nodeTypeFromStep(step.step_type, step.metadata),
    label: step.metadata?.label ?? nodeLabelFromStep(step.step_type),
    x: 340 + index * 250,
    y: step.step_type === "branch" ? 120 : 220 + (index % 2 === 0 ? 0 : 110),
    config: {
      body: step.message_body ?? "",
      delayMinutes: step.delay_minutes ?? 0,
      conditionKey: step.condition_key ?? "",
      conditionValue: step.condition_value ?? "",
      notes: step.metadata?.notes ?? "",
      queueName: step.metadata?.variableValue ?? "Review Queue",
      approvalNote: step.metadata?.notes ?? ""
    }
  }));
  const endNode: ScriptVisualBuilderNode = {
    id: "end",
    type: "end",
    label: "End State",
    x: 340 + Math.max(stepNodes.length, 1) * 250,
    y: 220,
    config: { outcome: "complete" }
  };
  return [triggerNode, ...stepNodes, endNode];
}

function connectionsFromNodesAndSteps(nodes: ScriptVisualBuilderNode[], script: OfMessageScript): ScriptVisualBuilderConnection[] {
  const connections: ScriptVisualBuilderConnection[] = [];
  const firstStep = script.steps?.[0];
  if (firstStep) connections.push({ id: "edge-trigger", from: "trigger", to: firstStep.id });
  const steps = script.steps ?? [];
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const nextStep = step.next_step_id || steps[index + 1]?.id || "end";
    connections.push({ id: `edge-${step.id}-next`, from: step.id, to: nextStep, label: step.step_type === "branch" ? "yes" : undefined });
    if (step.fallback_step_id) connections.push({ id: `edge-${step.id}-fallback`, from: step.id, to: step.fallback_step_id, label: "no" });
  }
  if (!firstStep && nodes.some((node) => node.id === "end")) connections.push({ id: "edge-trigger-end", from: "trigger", to: "end" });
  return connections;
}

function toBuilderTemplate(draft: BuilderDraft): MessageScriptTemplate {
  const stepNodes = draft.nodes.filter((node) => node.type !== "trigger");
  const runtimeNodes = stepNodes.length ? stepNodes : [{ id: tempId("end"), type: "end" as const, label: "End State", x: 0, y: 0, config: {} }];
  const visualBuilder = {
    schemaVersion: 1 as const,
    selectedNodeId: draft.selectedNodeId,
    nodes: draft.nodes,
    connections: draft.connections
  };
  return {
    name: draft.script.name,
    description: draft.script.description ?? "",
    triggerEventType: stringConfig(draft.nodes.find((node) => node.type === "trigger")?.config.eventType) || draft.script.trigger_event_type || "manual",
    autoSendEnabled: draft.script.auto_send_enabled,
    requiresApproval: draft.script.requires_approval,
    actionMode: draft.script.action_mode,
    cooldownHours: draft.script.cooldown_hours,
    maxSendsPerFan: draft.script.max_sends_per_fan,
    folderName: draft.script.folder_name ?? "",
    category: draft.script.category ?? "",
    tags: draft.script.tags ?? ["playbook"],
    versionNumber: draft.script.version_number ?? 1,
    sourceScriptId: draft.script.source_script_id ?? null,
    builderConfig: {
      schemaVersion: 1,
      variables: draft.script.builder_config?.variables ?? defaultVariables(),
      workspace: {
        ...defaultWorkspaceConfig(),
        ...draft.script.builder_config?.workspace,
        visualBuilder
      }
    },
    steps: runtimeNodes.map((node, index) => nodeToStepTemplate(node, index, draft.connections))
  };
}

function nodeToStepTemplate(node: ScriptVisualBuilderNode, order: number, connections: ScriptVisualBuilderConnection[]): MessageScriptTemplate["steps"][number] {
  const type = stepTypeFromNode(node.type);
  const next = connections.find((connection) => connection.from === node.id && (!connection.label || connection.label === "yes"));
  const fallback = connections.find((connection) => connection.from === node.id && connection.label === "no");
  return {
    id: node.id,
    order,
    type,
    body: bodyFromNode(node),
    delayMinutes: node.type === "delay" ? numberConfig(node.config.delayMinutes) : undefined,
    condition: stringConfig(node.config.conditionKey) ? { key: stringConfig(node.config.conditionKey), value: stringConfig(node.config.conditionValue) } : undefined,
    nextStepId: next?.to && next.to !== "end" ? next.to : undefined,
    fallbackStepId: fallback?.to && fallback.to !== "end" ? fallback.to : undefined,
    metadata: {
      ...defaultStepMetadata(type),
      label: node.label,
      nodeKey: node.id,
      notes: metadataNotes(node),
      variableValue: node.type === "assign_queue" ? stringConfig(node.config.queueName) : undefined,
      branchRules: node.type === "branch" || node.type === "condition"
        ? [
            {
              id: `${node.id}-yes`,
              label: "yes",
              condition: { source: "variable", key: stringConfig(node.config.conditionKey) || "condition", operator: "equals", value: stringConfig(node.config.conditionValue) },
              nextStepId: next?.to && next.to !== "end" ? next.to : null
            }
          ]
        : undefined
    }
  };
}

function defaultWorkspaceConfig(): NonNullable<ScriptBuilderConfig["workspace"]> {
  return {
    archivedAt: null,
    execution: { mode: "immediate" },
    ai: { mode: "draft_only" },
    approval: { mode: "always_approve" },
    conditions: []
  };
}

function defaultStepMetadata(type: MessageScriptStepType): ScriptBuilderStepMetadata {
  return {
    label: nodeLabelFromStep(type),
    kind:
      type === "question"
        ? "ask_question"
        : type === "wait"
          ? "wait"
          : type === "branch"
            ? "branch"
            : type === "set_variable"
              ? "set_variable"
              : type === "end"
                ? "end_conversation"
                : "send_message",
    messageGenerationMode: type === "set_variable" ? "ai_generated" : "template",
    stopConditions: []
  };
}

function defaultNodeConfig(type: ScriptVisualBuilderNodeType): Record<string, unknown> {
  if (type === "trigger") return { eventType: "manual" };
  if (type === "message") return { body: "Write the reply here." };
  if (type === "ai_prompt") return { body: "Draft a reply using the creator voice and current fan context." };
  if (type === "condition" || type === "branch") return { conditionKey: "spend_level", conditionValue: "high" };
  if (type === "human_approval") return { approvalNote: "Requires operator approval before continuing." };
  if (type === "assign_queue") return { queueName: "Review Queue" };
  if (type === "delay") return { delayMinutes: 180 };
  return { outcome: "complete" };
}

function nodeDefinition(type: ScriptVisualBuilderNodeType) {
  return nodeLibrary.find((node) => node.type === type) ?? nodeLibrary[1];
}

function nodeTypeFromStep(type: MessageScriptStepType, metadata?: ScriptBuilderStepMetadata): ScriptVisualBuilderNodeType {
  if (metadata?.kind === "branch") return "branch";
  if (metadata?.kind === "set_variable") return "ai_prompt";
  if (type === "follow_up" || type === "wait") return "delay";
  if (type === "question") return "message";
  if (type === "branch") return "branch";
  if (type === "set_variable") return "ai_prompt";
  if (type === "end") return "end";
  return "message";
}

function stepTypeFromNode(type: ScriptVisualBuilderNodeType): MessageScriptStepType {
  if (type === "ai_prompt") return "set_variable";
  if (type === "condition" || type === "branch") return "branch";
  if (type === "delay") return "follow_up";
  if (type === "end") return "end";
  return "message";
}

function nodeLabelFromStep(type: MessageScriptStepType) {
  if (type === "follow_up") return "Delay / Follow-up";
  if (type === "set_variable") return "AI Prompt";
  if (type === "end") return "End State";
  return type.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function bodyFromNode(node: ScriptVisualBuilderNode) {
  if (node.type === "message" || node.type === "ai_prompt") return stringConfig(node.config.body);
  if (node.type === "human_approval") return stringConfig(node.config.approvalNote);
  if (node.type === "assign_queue") return `Assign to ${stringConfig(node.config.queueName) || "Review Queue"}`;
  if (node.type === "delay") return "Follow up after delay.";
  if (node.type === "end") return "Playbook ended.";
  return undefined;
}

function metadataNotes(node: ScriptVisualBuilderNode) {
  if (node.type === "human_approval") return stringConfig(node.config.approvalNote);
  if (node.type === "ai_prompt") return stringConfig(node.config.body);
  return stringConfig(node.config.notes) || undefined;
}

function nodeSummary(node: ScriptVisualBuilderNode) {
  if (node.type === "trigger") return stringConfig(node.config.eventType) || "Manual trigger";
  if (node.type === "message" || node.type === "ai_prompt") return stringConfig(node.config.body) || "No copy configured";
  if (node.type === "condition" || node.type === "branch") return `${stringConfig(node.config.conditionKey) || "condition"} = ${stringConfig(node.config.conditionValue) || "value"}`;
  if (node.type === "human_approval") return stringConfig(node.config.approvalNote) || "Operator approval gate";
  if (node.type === "assign_queue") return stringConfig(node.config.queueName) || "Review Queue";
  if (node.type === "delay") return `${numberConfig(node.config.delayMinutes)} minute delay`;
  return "Complete playbook";
}

function defaultVariables() {
  return [
    { key: "subscriber_name", label: "Subscriber Name", defaultValue: "there" },
    { key: "creator_name", label: "Creator Name", defaultValue: "creator" }
  ];
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

function stringConfig(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberConfig(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function tempId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}
