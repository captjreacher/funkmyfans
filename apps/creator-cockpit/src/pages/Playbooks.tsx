import { Archive, CheckCircle2, ChevronLeft, FileText, Layers3, Plus, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { OfMessageScript } from "@funkmyfans/of-types";
import { createCreatorScript, fetchScriptsWorkspace, type ScriptsWorkspaceData } from "../lib/api";

const libraryTabs = ["Template Library", "Drafts", "Active", "Archived"] as const;
type LibraryTab = (typeof libraryTabs)[number];

const wizardStages = ["Goal", "Template", "Components", "Variables", "Branches", "Review", "Activate"] as const;

export function Playbooks() {
  const [workspace, setWorkspace] = useState<ScriptsWorkspaceData | null>(null);
  const [tab, setTab] = useState<LibraryTab>("Template Library");
  const [wizardScript, setWizardScript] = useState<OfMessageScript | null>(null);
  const [wizardStage, setWizardStage] = useState(0);
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
        const next = result.scripts.find((script) => script.id === preferredId) ?? null;
        setWizardScript(next);
      }
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load playbooks");
    }
  }

  async function createPlaybook() {
    const creatorId = workspace?.creators[0]?.id;
    if (!creatorId) {
      setError("Connect a creator before creating a playbook.");
      return;
    }
    setBusy(true);
    try {
      const response = await createCreatorScript(creatorId, {
        name: "New Playbook",
        description: "Draft automation builder shell.",
        triggerEventType: "manual",
        autoSendEnabled: false,
        requiresApproval: true,
        actionMode: "draft_for_approval",
        cooldownHours: 24,
        maxSendsPerFan: 1,
        folderName: "Journey Library",
        category: "General",
        tags: ["playbook"],
        steps: [{ order: 0, type: "message", body: "Hey {{subscriber_name}}, I wanted to reach out personally." }]
      });
      setWizardStage(0);
      await loadWorkspace(response.script.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create playbook");
    } finally {
      setBusy(false);
    }
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
            <WizardStage script={wizardScript} stage={wizardStages[wizardStage]} />
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
        <div className="flex gap-2">
          <button type="button" onClick={() => void loadWorkspace()} className="inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
          <button type="button" onClick={() => void createPlaybook()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-45">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Playbook
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
        <div className="grid grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.5fr] gap-3 border-b border-blue-500/18 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100/52">
          <div>Playbook</div>
          <div>Creator</div>
          <div>Trigger</div>
          <div>Status</div>
          <div className="text-right">Open</div>
        </div>
        <div className="divide-y divide-blue-500/12">
          {filteredScripts.map((script) => (
            <button key={script.id} type="button" onClick={() => setWizardScript(script)} className="grid w-full grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.5fr] items-center gap-3 px-4 py-3 text-left text-sm hover:bg-[#102338]/72">
              <div className="min-w-0">
                <div className="truncate font-semibold text-white">{script.name}</div>
                <div className="truncate text-xs text-blue-100/52">{script.description ?? script.category ?? "No description"}</div>
              </div>
              <div className="truncate text-blue-100/68">{creatorLabel(workspace, script.creator_id)}</div>
              <div className="truncate text-blue-100/68">{script.trigger_event_type}</div>
              <div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(script)}`}>{script.builder_config?.workspace?.archivedAt ? "archived" : script.status}</span></div>
              <div className="text-right text-cyan-200">Wizard</div>
            </button>
          ))}
          {!filteredScripts.length ? <div className="px-4 py-8 text-sm text-blue-100/58">No playbooks in this view.</div> : null}
        </div>
      </section>
    </main>
  );
}

function WizardStage({ script, stage }: { script: OfMessageScript; stage: (typeof wizardStages)[number] }) {
  if (stage === "Goal") return <StageBody icon={FileText} title={script.category || "General"} detail={script.description ?? "Define the commercial or relationship outcome this playbook serves."} />;
  if (stage === "Template") return <StageBody icon={Layers3} title={script.folder_name ?? "Journey Library"} detail="Choose the reusable pattern and creator context before editing details." />;
  if (stage === "Components") return <StageBody icon={Layers3} title={`${script.steps?.length ?? 0} components`} detail="Review messages, waits, questions, and actions as automation components." />;
  if (stage === "Variables") return <StageBody icon={Sparkles} title="Variables" detail="Map creator, subscriber, and offer variables before activation." />;
  if (stage === "Branches") return <StageBody icon={Archive} title="Branches" detail="Confirm conditional paths and fallback handling." />;
  if (stage === "Review") return <StageBody icon={CheckCircle2} title="Review" detail="Check approval mode, cooldowns, limits, and expected operator handoffs." />;
  return <StageBody icon={CheckCircle2} title="Activate" detail="Activation happens after review. Runtime execution remains unchanged." />;
}

function StageBody({ icon: Icon, title, detail }: { icon: typeof Sparkles; title: string; detail: string }) {
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

function creatorLabel(workspace: ScriptsWorkspaceData | null, creatorId: string) {
  const creator = workspace?.creators.find((item) => item.id === creatorId);
  return creator?.display_name || creator?.username || "Unknown";
}

function statusTone(script: OfMessageScript) {
  if (script.builder_config?.workspace?.archivedAt) return "bg-amber-500/14 text-amber-200";
  if (script.status === "active") return "bg-emerald-500/14 text-emerald-200";
  return "bg-blue-400/12 text-blue-100";
}
