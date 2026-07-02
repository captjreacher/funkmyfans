import { AlertTriangle, ArrowDown, ArrowUp, Copy, FastForward, GitBranch, PauseCircle, Play, Plus, RotateCcw, Save, Search, ToggleLeft, ToggleRight, Trash2, Variable, Workflow } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type {
  OfAutomationSimulation,
  MessageScriptTemplate,
  MessageScriptStepType,
  OfAutomationRun,
  OfCreatorAutomationScenario,
  OfConversationHistoryItem,
  OfConversationInstance,
  OfMessageScript,
  OfOutboundMessage,
  OfSimulatedSubscriber,
  ScriptBuilderBranchRule,
  ScriptBuilderCondition,
  ScriptBuilderConfig,
  ScriptBuilderStepMetadata,
  ScriptBuilderVariable
} from "@funkmyfans/of-types";
import {
  cancelConversation,
  createCreatorScript,
  createSimulatedSubscriber,
  duplicateScript,
  fetchConversationDetail,
  fetchCreatorAutomationScenarios,
  fetchCreatorConversations,
  fetchCreatorSimulations,
  fetchSimulatedSubscribers,
  fetchSimulationDetail,
  processDueConversations,
  saveScriptBuilder,
  simulationCancel,
  simulationFastForward,
  simulationInjectFailure,
  simulationPause,
  simulationReply,
  simulationReset,
  simulationRestart,
  simulationResume,
  simulationRetry,
  startSimulation,
  updateAutomationScenario
} from "../lib/api";

type BuilderStepDraft = {
  id: string;
  type: MessageScriptStepType;
  body: string;
  delayMinutes: number;
  conditionKey: string;
  conditionValue: string;
  nextStepId: string;
  fallbackStepId: string;
  metadata: ScriptBuilderStepMetadata;
};

type BuilderDraft = {
  id: string;
  name: string;
  description: string;
  triggerEventType: string;
  status: OfMessageScript["status"];
  actionMode: OfMessageScript["action_mode"];
  autoSendEnabled: boolean;
  requiresApproval: boolean;
  cooldownHours: number;
  maxSendsPerFan: number;
  folderName: string;
  category: string;
  tags: string[];
  versionNumber: number;
  sourceScriptId: string | null;
  builderConfig: ScriptBuilderConfig;
  steps: BuilderStepDraft[];
};

export function ScriptBuilderPanel({
  creatorId,
  scripts,
  runs,
  result,
  error,
  onReload,
  onPatch,
  onRunTest
}: {
  creatorId: string;
  scripts: OfMessageScript[];
  runs: OfAutomationRun[];
  result: { matched: number; queued: number; skipped: number; errors: string[] } | null;
  error: string | null;
  onReload: () => Promise<OfMessageScript[]>;
  onPatch: (scriptId: string, patch: Partial<OfMessageScript>) => void;
  onRunTest: (script: OfMessageScript) => void;
}) {
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState("all");
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(scripts[0]?.id ?? null);
  const [draft, setDraft] = useState<BuilderDraft | null>(scripts[0] ? toDraft(scripts[0]) : null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<OfConversationInstance[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<OfConversationHistoryItem[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [scenarios, setScenarios] = useState<OfCreatorAutomationScenario[]>([]);
  const [simulatedSubscribers, setSimulatedSubscribers] = useState<OfSimulatedSubscriber[]>([]);
  const [simulations, setSimulations] = useState<OfAutomationSimulation[]>([]);
  const [selectedSimulationId, setSelectedSimulationId] = useState<string | null>(null);
  const [simulationHistory, setSimulationHistory] = useState<OfConversationHistoryItem[]>([]);
  const [simulationOutbounds, setSimulationOutbounds] = useState<OfOutboundMessage[]>([]);
  const [simulationConversation, setSimulationConversation] = useState<OfConversationInstance | null>(null);
  const [startingSimulation, setStartingSimulation] = useState(false);
  const [simulationReplyDraft, setSimulationReplyDraft] = useState("playful");
  const [simulationEventType, setSimulationEventType] = useState("subscriber_created");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [selectedSimulationSubscriberId, setSelectedSimulationSubscriberId] = useState<string | null>(null);
  const [draftSimulationSubscriber, setDraftSimulationSubscriber] = useState({
    name: "Test Subscriber",
    username: "test_subscriber",
    subscription_status: "active",
    renewal_state: "current",
    spend_level: "medium",
    lifetime_value: 125,
    message_history_summary: "Warm fan with moderate spend and light recent chat history."
  });

  useEffect(() => {
    const selected = scripts.find((item) => item.id === selectedScriptId) ?? scripts[0] ?? null;
    setSelectedScriptId(selected?.id ?? null);
    setDraft(selected ? toDraft(selected) : null);
    const linkedScenario = scenarios.find((item) => item.linked_script_id === selected?.id) ?? null;
    setSelectedScenarioId(linkedScenario?.id ?? null);
  }, [scenarios, scripts, selectedScriptId]);

  useEffect(() => {
    void refreshConversations();
    void refreshScenarios();
    void refreshSimulatedSubscribers();
    void refreshSimulations();
  }, [creatorId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setConversationHistory([]);
      return;
    }
    void fetchConversationDetail(selectedConversationId)
      .then((detail) => setConversationHistory(detail.history))
      .catch((detailError) => setLocalError(errorMessage(detailError)));
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedSimulationId) {
      setSimulationHistory([]);
      setSimulationOutbounds([]);
      setSimulationConversation(null);
      return;
    }
    void fetchSimulationDetail(selectedSimulationId)
      .then((detail) => {
        setSimulationConversation(detail.conversation);
        setSimulationHistory(detail.history);
        setSimulationOutbounds(detail.outboundMessages);
      })
      .catch((detailError) => setLocalError(errorMessage(detailError)));
  }, [selectedSimulationId]);

  const folders = ["all", ...new Set(scripts.map((script) => script.folder_name?.trim() || "Unfiled"))];
  const filteredScripts = scripts.filter((script) => {
    const matchesSearch = [script.name, script.description ?? "", script.category ?? "", ...(script.tags ?? [])]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    const currentFolder = script.folder_name?.trim() || "Unfiled";
    const matchesFolder = folderFilter === "all" ? true : currentFolder === folderFilter;
    return matchesSearch && matchesFolder;
  });
  const selectedScript = scripts.find((item) => item.id === selectedScriptId) ?? null;
  const selectedConversation = conversations.find((item) => item.id === selectedConversationId) ?? null;
  const currentSimulationSubscriber = simulatedSubscribers.find((item) => item.id === selectedSimulationSubscriberId) ?? null;
  const selectedSimulation = simulations.find((item) => item.id === selectedSimulationId) ?? null;
  const validation = useMemo(() => validateDraft(draft), [draft]);
  const conversationBuckets = {
    running: conversations.filter((item) => item.status === "running"),
    waiting: conversations.filter((item) => item.status === "waiting_delay" || item.status === "waiting_reply" || item.status === "waiting_approval"),
    completed: conversations.filter((item) => item.status === "completed"),
    cancelled: conversations.filter((item) => item.status === "cancelled"),
    failed: conversations.filter((item) => item.status === "failed")
  };

  async function refreshScripts(selectId?: string) {
    const nextScripts = await onReload();
    const next = nextScripts.find((item) => item.id === (selectId ?? selectedScriptId)) ?? nextScripts[0] ?? null;
    setSelectedScriptId(next?.id ?? null);
    setDraft(next ? toDraft(next) : null);
    await refreshConversations();
  }

  async function refreshConversations() {
    setLoadingConversations(true);
    try {
      const result = await fetchCreatorConversations(creatorId);
      setConversations(result.conversations);
      setSelectedConversationId((current) => (result.conversations.some((item) => item.id === current) ? current : result.conversations[0]?.id ?? null));
      setLocalError(null);
    } catch (conversationError) {
      setConversations([]);
      setLocalError(errorMessage(conversationError));
    } finally {
      setLoadingConversations(false);
    }
  }

  async function refreshScenarios() {
    try {
      const result = await fetchCreatorAutomationScenarios(creatorId);
      setScenarios(result.scenarios);
    } catch (scenarioError) {
      setLocalError(errorMessage(scenarioError));
      setScenarios([]);
    }
  }

  async function refreshSimulatedSubscribers() {
    try {
      const result = await fetchSimulatedSubscribers(creatorId);
      setSimulatedSubscribers(result.subscribers);
      setSelectedSimulationSubscriberId((current) => current ?? result.subscribers[0]?.id ?? null);
    } catch (simulationError) {
      setLocalError(errorMessage(simulationError));
      setSimulatedSubscribers([]);
    }
  }

  async function refreshSimulations() {
    try {
      const result = await fetchCreatorSimulations(creatorId);
      setSimulations(result.simulations);
      setSelectedSimulationId((current) => (result.simulations.some((item) => item.id === current) ? current : result.simulations[0]?.id ?? null));
    } catch (simulationError) {
      setLocalError(errorMessage(simulationError));
      setSimulations([]);
    }
  }

  async function handleProcessDue() {
    try {
      await processDueConversations();
      await refreshConversations();
    } catch (processError) {
      setLocalError(errorMessage(processError));
    }
  }

  async function handleCancelConversation(conversationId: string) {
    try {
      await cancelConversation(conversationId, "Cancelled from Creator Cockpit.");
      await refreshConversations();
    } catch (cancelError) {
      setLocalError(errorMessage(cancelError));
    }
  }

  async function handleScenarioPatch(scenarioId: string, patch: Partial<OfCreatorAutomationScenario>) {
    try {
      await updateAutomationScenario(scenarioId, patch);
      await refreshScenarios();
    } catch (scenarioError) {
      setLocalError(errorMessage(scenarioError));
    }
  }

  async function handleCreateScript() {
    setCreating(true);
    setLocalError(null);
    try {
      const response = await createCreatorScript(creatorId, defaultScriptTemplate());
      await refreshScripts(response.script.id);
    } catch (createError) {
      setLocalError(errorMessage(createError));
    } finally {
      setCreating(false);
    }
  }

  async function handleDuplicateScript() {
    if (!selectedScript) return;
    setDuplicating(true);
    setLocalError(null);
    try {
      const response = await duplicateScript(selectedScript.id);
      await refreshScripts(response.script.id);
    } catch (duplicateError) {
      setLocalError(errorMessage(duplicateError));
    } finally {
      setDuplicating(false);
    }
  }

  async function handleCreateSimulationSubscriber() {
    try {
      const response = await createSimulatedSubscriber(creatorId, {
        ...draftSimulationSubscriber,
        custom_variables: {
          subscriber_name: draftSimulationSubscriber.name,
          spend_level: draftSimulationSubscriber.spend_level
        }
      });
      await refreshSimulatedSubscribers();
      setSelectedSimulationSubscriberId(response.subscriber.id);
    } catch (simulationError) {
      setLocalError(errorMessage(simulationError));
    }
  }

  async function handleStartSimulation() {
    if (!selectedScript) return;
    setStartingSimulation(true);
    try {
      const detail = await startSimulation(creatorId, {
        scriptId: selectedScript.id,
        scenarioId: selectedScenarioId,
        simulatedSubscriberId: selectedSimulationSubscriberId,
        eventType: simulationEventType,
        subscriber: selectedSimulationSubscriberId ? undefined : draftSimulationSubscriber,
        eventPayload: {},
        variables: {
          subscriber_name: currentSimulationSubscriber?.name ?? draftSimulationSubscriber.name,
          renewal_offer: "bonus bundle",
          days_until_expiry: "3",
          comeback_offer: "limited unlock",
          ppv_offer_name: "VIP drop",
          ppv_price: "29",
          offer_window_hours: "24"
        }
      });
      await refreshSimulations();
      setSelectedSimulationId(detail.simulation.id);
      setSimulationConversation(detail.conversation);
      setSimulationHistory(detail.history);
      setSimulationOutbounds(detail.outboundMessages);
    } catch (simulationError) {
      setLocalError(errorMessage(simulationError));
    } finally {
      setStartingSimulation(false);
    }
  }

  async function withSimulationRefresh(action: () => Promise<unknown>) {
    try {
      await action();
      await refreshSimulations();
      if (selectedSimulationId) {
        const detail = await fetchSimulationDetail(selectedSimulationId);
        setSimulationConversation(detail.conversation);
        setSimulationHistory(detail.history);
        setSimulationOutbounds(detail.outboundMessages);
      }
    } catch (simulationError) {
      setLocalError(errorMessage(simulationError));
    }
  }

  async function handleSaveScript() {
    if (!draft) return;
    if (validation.errors.length) {
      setLocalError(validation.errors.join(" "));
      return;
    }
    setSaving(true);
    setLocalError(null);
    try {
      const response = await saveScriptBuilder(draft.id, toTemplate(draft));
      await refreshScripts(response.script.id);
    } catch (saveError) {
      setLocalError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  function updateDraft(patch: Partial<BuilderDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function updateStep(stepId: string, patch: Partial<BuilderStepDraft>) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        steps: current.steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step))
      };
    });
  }

  function updateStepMetadata(stepId: string, patch: Partial<ScriptBuilderStepMetadata>) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        steps: current.steps.map((step) => (step.id === stepId ? { ...step, metadata: { ...step.metadata, ...patch } } : step))
      };
    });
  }

  function addStep(type: MessageScriptStepType) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        steps: [
          ...current.steps,
          {
            id: tempId(),
            type,
            body: "",
            delayMinutes: 0,
            conditionKey: "",
            conditionValue: "",
            nextStepId: "",
            fallbackStepId: "",
            metadata: defaultMetadataForType(type)
          }
        ]
      };
    });
  }

  function duplicateStep(stepId: string) {
    setDraft((current) => {
      if (!current) return current;
      const step = current.steps.find((item) => item.id === stepId);
      if (!step) return current;
      return {
        ...current,
        steps: [...current.steps, { ...step, id: tempId(), nextStepId: "", fallbackStepId: "" }]
      };
    });
  }

  function removeStep(stepId: string) {
    setDraft((current) => {
      if (!current) return current;
      const remaining = current.steps.filter((step) => step.id !== stepId);
      return {
        ...current,
        steps: remaining.map((step) => ({
          ...step,
          nextStepId: step.nextStepId === stepId ? "" : step.nextStepId,
          fallbackStepId: step.fallbackStepId === stepId ? "" : step.fallbackStepId,
          metadata: {
            ...step.metadata,
            branchRules: (step.metadata.branchRules ?? []).map((rule) => ({
              ...rule,
              nextStepId: rule.nextStepId === stepId ? null : rule.nextStepId
            }))
          }
        }))
      };
    });
  }

  function moveStep(stepId: string, direction: -1 | 1) {
    setDraft((current) => {
      if (!current) return current;
      const index = current.steps.findIndex((step) => step.id === stepId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.steps.length) return current;
      const steps = [...current.steps];
      const [item] = steps.splice(index, 1);
      steps.splice(target, 0, item);
      return { ...current, steps };
    });
  }

  function updateVariable(index: number, patch: Partial<ScriptBuilderVariable>) {
    setDraft((current) => {
      if (!current) return current;
      const variables = [...(current.builderConfig.variables ?? [])];
      variables[index] = { ...variables[index], ...patch };
      return { ...current, builderConfig: { ...current.builderConfig, variables } };
    });
  }

  function addVariable() {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        builderConfig: {
          ...current.builderConfig,
          variables: [...(current.builderConfig.variables ?? []), { key: `variable_${(current.builderConfig.variables?.length ?? 0) + 1}`, label: "", defaultValue: "", description: "" }]
        }
      };
    });
  }

  function removeVariable(index: number) {
    setDraft((current) => {
      if (!current) return current;
      const variables = [...(current.builderConfig.variables ?? [])];
      variables.splice(index, 1);
      return { ...current, builderConfig: { ...current.builderConfig, variables } };
    });
  }

  if (!draft) {
    return (
      <section className="space-y-4">
        {error ? <div className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">{error}</div> : null}
        <div className="rounded-md border border-stone-200 bg-white p-6">
          <div className="text-sm text-stone-500">No scripts configured yet.</div>
          <button type="button" onClick={() => void handleCreateScript()} className="mt-4 inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Script
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {error ? <div className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">{error}</div> : null}
      {localError ? <div className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">{localError}</div> : null}
      {validation.errors.length || validation.warnings.length ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {validation.errors.length ? <div className="font-semibold">{validation.errors.join(" ")}</div> : null}
          {validation.warnings.length ? <div className={validation.errors.length ? "mt-1" : ""}>{validation.warnings.join(" ")}</div> : null}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-md border border-stone-200 bg-white">
          <div className="border-b border-stone-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-stone-950">Script Library</div>
                <div className="text-sm text-stone-500">Reusable automations for creators and agencies.</div>
              </div>
              <button type="button" onClick={() => void handleCreateScript()} disabled={creating} className="inline-flex h-9 items-center gap-2 rounded-md bg-stone-950 px-3 text-sm font-semibold text-white disabled:bg-stone-400">
                <Plus className="h-4 w-4" aria-hidden="true" />
                {creating ? "Creating" : "New"}
              </button>
            </div>
            <label className="mt-4 flex items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-sm text-stone-500">
              <Search className="h-4 w-4" aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search scripts, tags, categories..." className="w-full bg-transparent outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white" />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {folders.map((folder) => (
                <button
                  key={folder}
                  type="button"
                  onClick={() => setFolderFilter(folder)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${folderFilter === folder ? "bg-teal-700 text-white" : "bg-stone-100 text-stone-600"}`}
                >
                  {folder}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[960px] divide-y divide-stone-100 overflow-y-auto">
            {filteredScripts.map((script) => (
              <button
                key={script.id}
                type="button"
                onClick={() => {
                  setSelectedScriptId(script.id);
                  setDraft(toDraft(script));
                }}
                className={`block w-full px-4 py-3 text-left ${script.id === draft.id ? "bg-teal-50" : "bg-white hover:bg-stone-50"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-stone-950">{script.name}</div>
                    <div className="mt-1 text-xs text-stone-500">
                      {script.folder_name || "Unfiled"} / {script.category || "General"}
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${script.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>
                    {script.status}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-stone-500">
                  <span>v{script.version_number ?? 1}</span>
                  <span>{script.trigger_event_type}</span>
                  <span>{script.steps?.length ?? 0} steps</span>
                </div>
                {script.tags?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {script.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-stone-100 px-2 py-1 text-[11px] font-medium text-stone-600">{tag}</span>
                    ))}
                  </div>
                ) : null}
              </button>
            ))}
            {!filteredScripts.length ? <div className="p-4 text-sm text-stone-500">No scripts match the current filters.</div> : null}
          </div>
        </aside>

        <div className="space-y-4">
          <section className="rounded-md border border-stone-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-sm font-medium text-teal-700">Script Builder</div>
                <h2 className="mt-1 text-2xl font-semibold text-stone-950">{draft.name || "Untitled Script"}</h2>
                <div className="mt-1 text-sm text-stone-500">Version {draft.versionNumber} / {draft.status} / {draft.actionMode.replaceAll("_", " ")}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void handleDuplicateScript()} disabled={duplicating || !selectedScript} className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 disabled:opacity-45">
                  <Copy className="mr-2 inline h-4 w-4" aria-hidden="true" />
                  {duplicating ? "Duplicating" : "Duplicate"}
                </button>
                <button type="button" onClick={() => onPatch(draft.id, { status: draft.status === "active" ? "inactive" : "active" })} className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700">
                  {draft.status === "active" ? <ToggleRight className="mr-2 inline h-4 w-4 text-emerald-600" aria-hidden="true" /> : <ToggleLeft className="mr-2 inline h-4 w-4" aria-hidden="true" />}
                  {draft.status === "active" ? "Deactivate" : "Activate"}
                </button>
                <button type="button" onClick={() => selectedScript && onRunTest(selectedScript)} disabled={!selectedScript} className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800 disabled:opacity-45">
                  <Play className="mr-2 inline h-4 w-4" aria-hidden="true" />
                  Test Trigger
                </button>
                <button type="button" onClick={() => void handleSaveScript()} disabled={saving || validation.errors.length > 0} className="rounded-md bg-stone-950 px-3 py-2 text-sm font-semibold text-white disabled:bg-stone-400">
                  <Save className="mr-2 inline h-4 w-4" aria-hidden="true" />
                  {saving ? "Saving" : "Save Builder"}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-stone-200 bg-white p-4">
            <div>
              <h3 className="text-base font-semibold text-stone-950">Automation Scenarios</h3>
              <div className="text-sm text-stone-500">Control which commercial chat automations are live and which script each scenario uses.</div>
            </div>
            <div className="mt-4 overflow-hidden rounded-md border border-stone-200">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-stone-100 text-stone-600">
                  <tr>
                    {["Scenario", "Status", "Linked Script", "Action Mode", "Last Triggered", "Running", "Failed", "Recent Events", "Actions"].map((header) => (
                      <th key={header} className="px-4 py-3 font-semibold">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {scenarios.map((scenario) => (
                    <tr key={scenario.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-stone-950">{scenario.label}</div>
                        <div className="mt-1 text-xs text-stone-500">{scenario.description ?? scenario.scenario_key}</div>
                      </td>
                      <td className="px-4 py-3 text-stone-700">
                        <div>{scenario.enabled ? "enabled" : "disabled"}</div>
                        <div className="mt-1 text-xs text-stone-500">creator {scenario.creator_enabled ? "on" : "off"}</div>
                      </td>
                      <td className="px-4 py-3 text-stone-700">
                        <select
                          value={scenario.linked_script_id ?? ""}
                          onChange={(event) => void handleScenarioPatch(scenario.id, { linked_script_id: event.target.value || null })}
                          className="rounded-md border border-stone-200 px-2 py-1 text-xs"
                        >
                          <option value="">No linked script</option>
                          {scripts.filter((script) => script.trigger_event_type === scenario.trigger_event_type || script.category === scenario.scenario_key).map((script) => (
                            <option key={script.id} value={script.id}>{script.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-stone-700">
                        <select
                          value={scenario.action_mode_override ?? ""}
                          onChange={(event) => void handleScenarioPatch(scenario.id, { action_mode_override: (event.target.value || null) as OfCreatorAutomationScenario["action_mode_override"] })}
                          className="rounded-md border border-stone-200 px-2 py-1 text-xs"
                        >
                          <option value="">Script default</option>
                          <option value="task_only">Task Only</option>
                          <option value="draft_for_approval">Draft / Approval</option>
                          <option value="auto_send">Auto Send</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-stone-700">{date(scenario.last_triggered_at)}</td>
                      <td className="px-4 py-3 text-stone-700">{String(scenario.running_count ?? 0)}</td>
                      <td className="px-4 py-3 text-stone-700">{String(scenario.failed_count ?? 0)}</td>
                      <td className="px-4 py-3 text-stone-700">
                        {(scenario.recent_events ?? []).map((event) => `${event.event_type} (${shortId(event.id)})`).join(", ") || "none"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => void handleScenarioPatch(scenario.id, { enabled: !scenario.enabled })} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700">
                            {scenario.enabled ? "Disable" : "Enable"}
                          </button>
                          <button type="button" onClick={() => void handleScenarioPatch(scenario.id, { creator_enabled: !scenario.creator_enabled })} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700">
                            Creator {scenario.creator_enabled ? "Off" : "On"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const linkedId = scenario.linked_script_id;
                              if (!linkedId) return;
                              setSelectedScriptId(linkedId);
                              const selected = scripts.find((item) => item.id === linkedId);
                              if (selected) setDraft(toDraft(selected));
                            }}
                            disabled={!scenario.linked_script_id}
                            className="rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800 disabled:opacity-45"
                          >
                            Open Script
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!scenarios.length ? <tr><td colSpan={9} className="px-4 py-6 text-stone-500">No automation scenarios configured.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 rounded-md border border-stone-200 bg-white p-4 xl:grid-cols-2">
            <Field label="Script Name">
              <input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Trigger Event">
              <input value={draft.triggerEventType} onChange={(event) => updateDraft({ triggerEventType: event.target.value })} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Description">
              <textarea value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} rows={3} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Tags">
              <input value={draft.tags.join(", ")} onChange={(event) => updateDraft({ tags: parseTags(event.target.value) })} placeholder="welcome, retention, vip" className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Folder">
              <input value={draft.folderName} onChange={(event) => updateDraft({ folderName: event.target.value })} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Category">
              <input value={draft.category} onChange={(event) => updateDraft({ category: event.target.value })} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Action Mode">
              <select
                value={draft.actionMode}
                onChange={(event) => {
                  const actionMode = event.target.value as BuilderDraft["actionMode"];
                  updateDraft({
                    actionMode,
                    autoSendEnabled: actionMode === "auto_send",
                    requiresApproval: actionMode !== "auto_send"
                  });
                }}
                className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm"
              >
                <option value="task_only">Task Only</option>
                <option value="draft_for_approval">Draft / Approval</option>
                <option value="auto_send">Auto Send</option>
              </select>
            </Field>
            <Field label="Version">
              <input value={String(draft.versionNumber)} onChange={(event) => updateDraft({ versionNumber: numberOr(event.target.value, 1) })} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Cooldown (hours)">
              <input value={String(draft.cooldownHours)} onChange={(event) => updateDraft({ cooldownHours: numberOr(event.target.value, 0) })} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
            </Field>
            <Field label="Max Sends / Fan">
              <input value={String(draft.maxSendsPerFan)} onChange={(event) => updateDraft({ maxSendsPerFan: numberOr(event.target.value, 0) })} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
            </Field>
          </section>

          <section className="rounded-md border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-stone-950">
                  <Variable className="h-4 w-4 text-teal-700" aria-hidden="true" />
                  Variables
                </h3>
                <div className="text-sm text-stone-500">Set reusable values for branch checks and message personalization.</div>
              </div>
              <button type="button" onClick={addVariable} className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700">Add Variable</button>
            </div>
            <div className="mt-4 space-y-3">
              {(draft.builderConfig.variables ?? []).map((variable, index) => (
                <div key={`${variable.key}-${index}`} className="grid gap-3 rounded-md border border-stone-200 p-3 xl:grid-cols-[1fr_1fr_1.3fr_auto]">
                  <input value={variable.key} onChange={(event) => updateVariable(index, { key: event.target.value })} placeholder="vip_status" className="rounded-md border border-stone-200 px-3 py-2 text-sm" />
                  <input value={variable.defaultValue ?? ""} onChange={(event) => updateVariable(index, { defaultValue: event.target.value })} placeholder="Default value" className="rounded-md border border-stone-200 px-3 py-2 text-sm" />
                  <input value={variable.description ?? ""} onChange={(event) => updateVariable(index, { description: event.target.value })} placeholder="Notes for creators" className="rounded-md border border-stone-200 px-3 py-2 text-sm" />
                  <button type="button" onClick={() => removeVariable(index)} className="rounded-md border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">Remove</button>
                </div>
              ))}
              {!(draft.builderConfig.variables ?? []).length ? <div className="text-sm text-stone-500">No variables defined yet.</div> : null}
            </div>
          </section>

          <section className="rounded-md border border-stone-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-stone-950">
                  <Workflow className="h-4 w-4 text-teal-700" aria-hidden="true" />
                  Conversation Steps
                </h3>
                <div className="text-sm text-stone-500">Order steps visually, define branches, and keep creators out of raw JSON.</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { type: "message" as const, label: "Send Message" },
                  { type: "wait" as const, label: "Wait" },
                  { type: "question" as const, label: "Ask Question" },
                  { type: "branch" as const, label: "Branch" },
                  { type: "set_variable" as const, label: "Set Variable" },
                  { type: "end" as const, label: "End" }
                ].map((option) => (
                  <button key={option.type} type="button" onClick={() => addStep(option.type)} className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700">
                    <Plus className="mr-2 inline h-4 w-4" aria-hidden="true" />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {draft.steps.map((step, index) => {
                const branchRules = step.metadata.branchRules ?? [];
                return (
                  <div key={step.id} className="rounded-md border border-stone-200 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-teal-700">Step {index + 1}</div>
                        <div className="mt-1 text-lg font-semibold text-stone-950">{stepLabel(step, index)}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => moveStep(step.id, -1)} disabled={index === 0} className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 disabled:opacity-45"><ArrowUp className="mr-2 inline h-4 w-4" aria-hidden="true" />Up</button>
                        <button type="button" onClick={() => moveStep(step.id, 1)} disabled={index === draft.steps.length - 1} className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 disabled:opacity-45"><ArrowDown className="mr-2 inline h-4 w-4" aria-hidden="true" />Down</button>
                        <button type="button" onClick={() => duplicateStep(step.id)} className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700"><Copy className="mr-2 inline h-4 w-4" aria-hidden="true" />Duplicate</button>
                        <button type="button" onClick={() => removeStep(step.id)} disabled={draft.steps.length === 1} className="rounded-md border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-45"><Trash2 className="mr-2 inline h-4 w-4" aria-hidden="true" />Delete</button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 xl:grid-cols-2">
                      <Field label="Step Type">
                        <select value={step.type} onChange={(event) => updateStep(step.id, { type: event.target.value as MessageScriptStepType, metadata: defaultMetadataForType(event.target.value as MessageScriptStepType, step.metadata) })} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                          <option value="message">Send Message</option>
                          <option value="follow_up">Legacy Follow-up</option>
                          <option value="wait">Wait</option>
                          <option value="question">Ask Question</option>
                          <option value="branch">Branch</option>
                          <option value="set_variable">Set Variable</option>
                          <option value="end">End Conversation</option>
                        </select>
                      </Field>
                      <Field label="Step Label">
                        <input value={step.metadata.label ?? ""} onChange={(event) => updateStepMetadata(step.id, { label: event.target.value })} placeholder="Warm welcome" className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white" />
                      </Field>
                    </div>

                    {step.type === "message" || step.type === "follow_up" || step.type === "question" ? (
                      <div className="mt-4 grid gap-3 xl:grid-cols-2">
                        <Field label={step.type === "question" ? "Question" : "Message Body"}>
                          <textarea value={step.body} onChange={(event) => updateStep(step.id, { body: event.target.value })} rows={4} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
                        </Field>
                        <Field label="Delay Before Send (minutes)">
                          <input value={String(step.delayMinutes)} onChange={(event) => updateStep(step.id, { delayMinutes: numberOr(event.target.value, 0) })} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
                        </Field>
                      </div>
                    ) : null}

                    {step.type === "wait" ? (
                      <div className="mt-4 grid gap-3 xl:grid-cols-2">
                        <Field label="Wait Duration (minutes)">
                          <input value={String(step.delayMinutes)} onChange={(event) => updateStep(step.id, { delayMinutes: numberOr(event.target.value, 0) })} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
                        </Field>
                        <Field label="Notes">
                          <input value={step.metadata.notes ?? ""} onChange={(event) => updateStepMetadata(step.id, { notes: event.target.value })} placeholder="Follow up next morning" className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
                        </Field>
                      </div>
                    ) : null}

                    {step.type === "set_variable" ? (
                      <div className="mt-4 grid gap-3 xl:grid-cols-2">
                        <Field label="Variable Key">
                          <input value={step.metadata.variableKey ?? ""} onChange={(event) => updateStepMetadata(step.id, { variableKey: event.target.value })} placeholder="last_offer_type" className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
                        </Field>
                        <Field label="Value">
                          <input value={step.metadata.variableValue ?? ""} onChange={(event) => updateStepMetadata(step.id, { variableValue: event.target.value })} placeholder="vip_renewal" className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
                        </Field>
                      </div>
                    ) : null}

                    {step.type === "branch" ? (
                      <div className="mt-4 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-stone-950">
                              <GitBranch className="h-4 w-4 text-teal-700" aria-hidden="true" />
                              Branch Rules
                            </div>
                            <div className="text-sm text-stone-500">Route to the first matching branch. Fallback handles the no-match path.</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateStepMetadata(step.id, { branchRules: [...branchRules, defaultBranchRule()] })}
                            className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700"
                          >
                            Add Branch
                          </button>
                        </div>
                        {branchRules.map((rule) => (
                          <div key={rule.id} className="grid gap-3 rounded-md border border-stone-200 p-3 xl:grid-cols-6">
                            <input value={rule.label} onChange={(event) => updateBranchRule(step.id, rule.id, { label: event.target.value }, setDraft)} placeholder="High intent" className="rounded-md border border-stone-200 px-3 py-2 text-sm" />
                            <select value={rule.condition.source} onChange={(event) => updateBranchRule(step.id, rule.id, { condition: { ...rule.condition, source: event.target.value as ScriptBuilderCondition["source"] } }, setDraft)} className="rounded-md border border-stone-200 px-3 py-2 text-sm">
                              <option value="variable">Variable</option>
                              <option value="event">Event</option>
                              <option value="relationship">Relationship</option>
                              <option value="subscriber">Subscriber</option>
                            </select>
                            <input value={rule.condition.key} onChange={(event) => updateBranchRule(step.id, rule.id, { condition: { ...rule.condition, key: event.target.value } }, setDraft)} placeholder="payload.intent" className="rounded-md border border-stone-200 px-3 py-2 text-sm" />
                            <select value={rule.condition.operator} onChange={(event) => updateBranchRule(step.id, rule.id, { condition: { ...rule.condition, operator: event.target.value as ScriptBuilderCondition["operator"] } }, setDraft)} className="rounded-md border border-stone-200 px-3 py-2 text-sm">
                              <option value="equals">equals</option>
                              <option value="not_equals">not equals</option>
                              <option value="contains">contains</option>
                              <option value="not_contains">not contains</option>
                              <option value="exists">exists</option>
                              <option value="not_exists">not exists</option>
                            </select>
                            <input value={rule.condition.value ?? ""} onChange={(event) => updateBranchRule(step.id, rule.id, { condition: { ...rule.condition, value: event.target.value } }, setDraft)} placeholder="vip" className="rounded-md border border-stone-200 px-3 py-2 text-sm" />
                            <div className="flex gap-2">
                              <select value={rule.nextStepId ?? ""} onChange={(event) => updateBranchRule(step.id, rule.id, { nextStepId: event.target.value || null }, setDraft)} className="min-w-0 flex-1 rounded-md border border-stone-200 px-3 py-2 text-sm">
                                <option value="">Select target</option>
                                {draft.steps.filter((candidate) => candidate.id !== step.id).map((candidate, candidateIndex) => (
                                  <option key={candidate.id} value={candidate.id}>{candidateIndex + 1}. {stepLabel(candidate, candidateIndex)}</option>
                                ))}
                              </select>
                              <button type="button" onClick={() => removeBranchRule(step.id, rule.id, setDraft)} className="rounded-md border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">Remove</button>
                            </div>
                          </div>
                        ))}
                        <Field label="Fallback Step">
                          <select value={step.fallbackStepId} onChange={(event) => updateStep(step.id, { fallbackStepId: event.target.value })} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm">
                            <option value="">End if no branch matches</option>
                            {draft.steps.filter((candidate) => candidate.id !== step.id).map((candidate, candidateIndex) => (
                              <option key={candidate.id} value={candidate.id}>{candidateIndex + 1}. {stepLabel(candidate, candidateIndex)}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    ) : null}

                    {step.type !== "branch" && step.type !== "end" ? (
                      <div className="mt-4 grid gap-3 xl:grid-cols-2">
                        <Field label="Next Step">
                          <select value={step.nextStepId} onChange={(event) => updateStep(step.id, { nextStepId: event.target.value })} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm">
                            <option value="">Use next step in order</option>
                            {draft.steps.filter((candidate) => candidate.id !== step.id).map((candidate, candidateIndex) => (
                              <option key={candidate.id} value={candidate.id}>{candidateIndex + 1}. {stepLabel(candidate, candidateIndex)}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Fallback Step">
                          <select value={step.fallbackStepId} onChange={(event) => updateStep(step.id, { fallbackStepId: event.target.value })} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm">
                            <option value="">No fallback</option>
                            {draft.steps.filter((candidate) => candidate.id !== step.id).map((candidate, candidateIndex) => (
                              <option key={candidate.id} value={candidate.id}>{candidateIndex + 1}. {stepLabel(candidate, candidateIndex)}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    ) : null}

                    {step.type === "end" ? <div className="mt-4 rounded-md bg-stone-50 px-3 py-3 text-sm text-stone-600">This step closes the conversation path.</div> : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 sm:grid-cols-4">
            <Stat label="Matched" value={String(result?.matched ?? 0)} />
            <Stat label="Queued" value={String(result?.queued ?? 0)} />
            <Stat label="Skipped" value={String(result?.skipped ?? 0)} />
            <Stat label="Errors" value={result?.errors.join("; ") || "none"} />
          </section>

          <section className="rounded-md border border-stone-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-base font-semibold text-stone-950">Conversation Runtime</h3>
                <div className="text-sm text-stone-500">Watch live runtime state, delays, approvals, retries, and completions.</div>
              </div>
              <button type="button" onClick={() => void handleProcessDue()} className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700">
                Process Due Conversations
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <CountTile label="Running" value={conversationBuckets.running.length} />
              <CountTile label="Waiting" value={conversationBuckets.waiting.length} />
              <CountTile label="Completed" value={conversationBuckets.completed.length} />
              <CountTile label="Cancelled" value={conversationBuckets.cancelled.length} />
              <CountTile label="Failed" value={conversationBuckets.failed.length} />
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="overflow-hidden rounded-md border border-stone-200">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-stone-100 text-stone-600">
                    <tr>
                      {["Script", "Status", "Current Step", "Waiting", "Origin Event", "Updated", "Actions"].map((header) => (
                        <th key={header} className="px-4 py-3 font-semibold">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {conversations.map((conversation) => (
                      <tr key={conversation.id} className={conversation.id === selectedConversationId ? "bg-teal-50/60" : "bg-white"}>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => setSelectedConversationId(conversation.id)} className="text-left">
                            <div className="font-semibold text-stone-950">{conversation.of_message_scripts?.name ?? conversation.script_id}</div>
                            <div className="mt-1 text-xs text-stone-500">v{conversation.script_version} / {conversation.id.slice(0, 8)}</div>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-stone-700">{conversation.status}</td>
                        <td className="px-4 py-3 text-stone-700">{stepSummary(conversation.current_step)}</td>
                        <td className="px-4 py-3 text-stone-700">{conversation.waiting_reason ? `${conversation.waiting_reason}${conversation.waiting_until ? ` until ${date(conversation.waiting_until)}` : ""}` : "none"}</td>
                        <td className="px-4 py-3 text-stone-700">{conversation.source_event?.event_type ?? conversation.originating_event_id ?? "none"}</td>
                        <td className="px-4 py-3 text-stone-700">{date(conversation.updated_at)}</td>
                        <td className="px-4 py-3">
                          {conversation.status !== "completed" && conversation.status !== "cancelled" ? (
                            <button type="button" onClick={() => void handleCancelConversation(conversation.id)} className="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700">
                              Cancel
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                    {!conversations.length ? <tr><td colSpan={7} className="px-4 py-6 text-stone-500">{loadingConversations ? "Loading conversations..." : "No runtime conversations yet."}</td></tr> : null}
                  </tbody>
                </table>
              </div>

              <div className="rounded-md border border-stone-200 p-4">
                <h4 className="text-sm font-semibold text-stone-950">Inspector</h4>
                {selectedConversation ? (
                  <div className="mt-3 space-y-3">
                    <InspectorRow label="Status" value={selectedConversation.status} />
                    <InspectorRow label="Current Step" value={stepSummary(selectedConversation.current_step)} />
                    <InspectorRow label="Next Step" value={stepSummary(selectedConversation.next_step)} />
                    <InspectorRow label="Retry Count" value={String(selectedConversation.retry_count)} />
                    <InspectorRow label="Waiting Reason" value={selectedConversation.waiting_reason ?? "none"} />
                    <InspectorRow label="Origin Event" value={selectedConversation.source_event?.event_type ?? selectedConversation.originating_event_id ?? "none"} />
                    <InspectorRow label="Completion Reason" value={selectedConversation.completion_reason ?? "n/a"} />
                    <InspectorRow label="Cancellation Reason" value={selectedConversation.cancellation_reason ?? "n/a"} />
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">Variables</div>
                      <pre className="mt-2 overflow-x-auto rounded-md bg-stone-950 p-3 text-xs text-stone-100">{JSON.stringify(selectedConversation.variables ?? {}, null, 2)}</pre>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">Execution History</div>
                      <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
                        {conversationHistory.map((item) => (
                          <div key={item.id} className="rounded-md border border-stone-200 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-stone-950">{item.event_type}</div>
                              <div className="text-xs text-stone-500">{date(item.created_at)}</div>
                            </div>
                            <div className="mt-1 text-sm text-stone-600">{item.detail ?? "No detail"}</div>
                            <div className="mt-1 text-xs text-stone-500">{item.from_status ?? "none"} {"->"} {item.to_status ?? "none"}</div>
                          </div>
                        ))}
                        {!conversationHistory.length ? <div className="text-sm text-stone-500">No history recorded yet.</div> : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-stone-500">Select a conversation to inspect runtime state.</div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-md border border-stone-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-base font-semibold text-stone-950">Testing Environment</h3>
                <div className="text-sm text-stone-500">Run the production automation runtime against test subscribers, inspect every step, and never send a live BetterFans message.</div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => void handleCreateSimulationSubscriber()} className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700">
                  <Plus className="mr-2 inline h-4 w-4" aria-hidden="true" />
                  Save Test Subscriber
                </button>
                <button type="button" onClick={() => void handleStartSimulation()} disabled={!selectedScript || startingSimulation} className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:bg-stone-400">
                  <Play className="mr-2 inline h-4 w-4" aria-hidden="true" />
                  {startingSimulation ? "Running" : "Start Simulation"}
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Selected Script">
                    <div className="rounded-md border border-stone-200 px-3 py-2 text-sm text-stone-700">{selectedScript?.name ?? "No script selected"}</div>
                  </Field>
                  <Field label="Scenario">
                    <select value={selectedScenarioId ?? ""} onChange={(event) => setSelectedScenarioId(event.target.value || null)} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm">
                      <option value="">No scenario override</option>
                      {scenarios.map((scenario) => (
                        <option key={scenario.id} value={scenario.id}>{scenario.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Simulated Event">
                    <select value={simulationEventType} onChange={(event) => setSimulationEventType(event.target.value)} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm">
                      {["subscriber_created", "subscriber_expiring", "subscriber_renewed", "subscriber_inactive", "ppv_purchased", "ppv_not_purchased", "custom_event"].map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Saved Test Subscriber">
                    <select value={selectedSimulationSubscriberId ?? ""} onChange={(event) => setSelectedSimulationSubscriberId(event.target.value || null)} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm">
                      <option value="">Use draft subscriber</option>
                      {simulatedSubscribers.map((subscriber) => (
                        <option key={subscriber.id} value={subscriber.id}>{subscriber.name} (@{subscriber.username})</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Lifetime Value">
                    <input value={draftSimulationSubscriber.lifetime_value} onChange={(event) => setDraftSimulationSubscriber((current) => ({ ...current, lifetime_value: Number(event.target.value) || 0 }))} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Subscriber Name">
                    <input value={draftSimulationSubscriber.name} onChange={(event) => setDraftSimulationSubscriber((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
                  </Field>
                  <Field label="Username">
                    <input value={draftSimulationSubscriber.username} onChange={(event) => setDraftSimulationSubscriber((current) => ({ ...current, username: event.target.value }))} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Subscription Status">
                    <select value={draftSimulationSubscriber.subscription_status} onChange={(event) => setDraftSimulationSubscriber((current) => ({ ...current, subscription_status: event.target.value }))} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm">
                      {["active", "expiring", "expired", "renewed", "inactive"].map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </Field>
                  <Field label="Spend Level">
                    <select value={draftSimulationSubscriber.spend_level} onChange={(event) => setDraftSimulationSubscriber((current) => ({ ...current, spend_level: event.target.value }))} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm">
                      {["low", "medium", "high", "vip"].map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </Field>
                </div>

                <Field label="Message History Summary">
                  <textarea value={draftSimulationSubscriber.message_history_summary} onChange={(event) => setDraftSimulationSubscriber((current) => ({ ...current, message_history_summary: event.target.value }))} rows={3} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" />
                </Field>
              </div>

              <div className="space-y-4">
                <div className="rounded-md border border-stone-200">
                  <div className="border-b border-stone-200 px-4 py-3 text-sm font-semibold text-stone-950">Simulation Runs</div>
                  <div className="max-h-64 divide-y divide-stone-100 overflow-y-auto">
                    {simulations.map((simulation) => (
                      <button key={simulation.id} type="button" onClick={() => setSelectedSimulationId(simulation.id)} className={`block w-full px-4 py-3 text-left ${simulation.id === selectedSimulationId ? "bg-teal-50" : "bg-white hover:bg-stone-50"}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold text-stone-950">{simulation.script?.name ?? simulation.event_type}</div>
                          <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-600">{simulation.status}</span>
                        </div>
                        <div className="mt-1 text-xs text-stone-500">{simulation.simulated_subscriber?.name ?? "Test subscriber"} / {date(simulation.updated_at)}</div>
                      </button>
                    ))}
                    {!simulations.length ? <div className="p-4 text-sm text-stone-500">No simulation runs yet.</div> : null}
                  </div>
                </div>

                <div className="rounded-md border border-stone-200 p-4">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => selectedSimulationId && void withSimulationRefresh(() => simulationPause(selectedSimulationId))} disabled={!selectedSimulationId} className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 disabled:opacity-45">
                      <PauseCircle className="mr-2 inline h-4 w-4" aria-hidden="true" />
                      Pause
                    </button>
                    <button type="button" onClick={() => selectedSimulationId && void withSimulationRefresh(() => simulationResume(selectedSimulationId))} disabled={!selectedSimulationId} className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 disabled:opacity-45">
                      <Play className="mr-2 inline h-4 w-4" aria-hidden="true" />
                      Resume
                    </button>
                    <button type="button" onClick={() => selectedSimulationId && void withSimulationRefresh(() => simulationFastForward(selectedSimulationId))} disabled={!selectedSimulationId} className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 disabled:opacity-45">
                      <FastForward className="mr-2 inline h-4 w-4" aria-hidden="true" />
                      Fast Forward
                    </button>
                    <button type="button" onClick={() => selectedSimulationId && void withSimulationRefresh(() => simulationInjectFailure(selectedSimulationId, "next_send"))} disabled={!selectedSimulationId} className="rounded-md border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-800 disabled:opacity-45">
                      <AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden="true" />
                      Inject Failure
                    </button>
                    <button type="button" onClick={() => selectedSimulationId && void withSimulationRefresh(() => simulationRetry(selectedSimulationId))} disabled={!selectedSimulationId} className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 disabled:opacity-45">
                      Retry
                    </button>
                    <button type="button" onClick={() => selectedSimulationId && void withSimulationRefresh(() => simulationCancel(selectedSimulationId))} disabled={!selectedSimulationId} className="rounded-md border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-45">
                      Cancel
                    </button>
                    <button type="button" onClick={() => selectedSimulationId && void withSimulationRefresh(() => simulationRestart(selectedSimulationId))} disabled={!selectedSimulationId} className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 disabled:opacity-45">
                      <RotateCcw className="mr-2 inline h-4 w-4" aria-hidden="true" />
                      Replay
                    </button>
                    <button type="button" onClick={() => selectedSimulationId && void withSimulationRefresh(() => simulationReset(selectedSimulationId))} disabled={!selectedSimulationId} className="rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 disabled:opacity-45">
                      Reset
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-stone-500">Runtime State</div>
                        <pre className="mt-2 overflow-x-auto rounded-md bg-stone-950 p-3 text-xs text-stone-100">{JSON.stringify(simulationConversation?.variables ?? {}, null, 2)}</pre>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-stone-500">Reply / Branch Control</div>
                        <div className="mt-2 flex gap-2">
                          <input value={simulationReplyDraft} onChange={(event) => setSimulationReplyDraft(event.target.value)} className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm" placeholder="Type a simulated subscriber reply..." />
                          <button type="button" onClick={() => selectedSimulationId && void withSimulationRefresh(() => simulationReply(selectedSimulationId, simulationReplyDraft))} disabled={!selectedSimulationId} className="rounded-md bg-stone-950 px-3 py-2 text-sm font-semibold text-white disabled:bg-stone-400">
                            Answer
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-stone-500">Execution Timeline</div>
                        <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                          {simulationHistory.map((item) => (
                            <div key={item.id} className="rounded-md border border-stone-200 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold text-stone-950">{item.event_type}</div>
                                <div className="text-xs text-stone-500">{date(item.created_at)}</div>
                              </div>
                              <div className="mt-1 text-sm text-stone-600">{item.detail ?? "No detail"}</div>
                            </div>
                          ))}
                          {!simulationHistory.length ? <div className="text-sm text-stone-500">No simulation timeline yet.</div> : null}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-stone-500">Rendered Message Preview</div>
                        <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                          {simulationOutbounds.map((message) => (
                            <div key={message.id} className="rounded-md border border-stone-200 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold text-stone-950">{message.status} / {message.execution_mode}</div>
                                <div className="text-xs text-stone-500">{message.destination ?? message.fan_id}</div>
                              </div>
                              <div className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{message.final_text ?? message.draft_text ?? message.message_body}</div>
                              <div className="mt-2 text-xs text-stone-500">Template: {String(message.metadata?.source_template ?? message.message_body)}</div>
                              <pre className="mt-2 overflow-x-auto rounded-md bg-stone-50 p-2 text-xs text-stone-600">{JSON.stringify(message.metadata?.rendered_variables ?? {}, null, 2)}</pre>
                            </div>
                          ))}
                          {!simulationOutbounds.length ? <div className="text-sm text-stone-500">No outbound previews yet.</div> : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-md border border-stone-200 bg-white">
            <div className="border-b border-stone-200 px-4 py-3">
              <h3 className="text-base font-semibold text-stone-950">Recent Automation Runs</h3>
            </div>
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-stone-100 text-stone-600">
                <tr>
                  {["Run", "Script", "Fan", "Status", "Started"].map((header) => (
                    <th key={header} className="px-4 py-3 font-semibold">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className="px-4 py-3 text-stone-700">{run.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-stone-700">{run.of_message_scripts?.name ?? run.script_id}</td>
                    <td className="px-4 py-3 text-stone-700">{run.fan_id}</td>
                    <td className="px-4 py-3 text-stone-700">{run.error_message ? `${run.status}: ${run.error_message}` : run.status}</td>
                    <td className="px-4 py-3 text-stone-700">{date(run.started_at)}</td>
                  </tr>
                ))}
                {!runs.length ? <tr><td colSpan={5} className="px-4 py-6 text-stone-500">No automation runs yet.</td></tr> : null}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-stone-500">{label}</div>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-medium text-stone-500">{label}</div>
      <div className="mt-1 text-base font-semibold text-stone-950">{value}</div>
    </div>
  );
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
      <div className="text-sm font-medium text-stone-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-stone-950">{value}</div>
    </div>
  );
}

function InspectorRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-1 text-sm text-stone-800">{value}</div>
    </div>
  );
}

function validateDraft(draft: BuilderDraft | null) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!draft) return { errors, warnings };

  const seenIds = new Set<string>();
  const stepIds = new Set(draft.steps.map((step) => step.id));
  if (!draft.steps.length) errors.push("At least one step is required.");

  draft.steps.forEach((step, index) => {
    const label = step.metadata.label?.trim() || humanizeStepType(step.type, index);
    if (step.id) {
      if (seenIds.has(step.id)) errors.push(`Duplicate step id detected for ${label}.`);
      seenIds.add(step.id);
    }
    if (requiresBody(step.type) && !step.body.trim()) {
      errors.push(`${label} requires message text.`);
    }

    if (step.nextStepId.trim() && !stepIds.has(step.nextStepId)) {
      errors.push(`${label} points to a missing next step.`);
    }
    if (step.type !== "branch" && step.fallbackStepId.trim() && !stepIds.has(step.fallbackStepId)) {
      errors.push(`${label} points to a missing fallback step.`);
    }

    if (step.type === "branch") {
      const branchRules = step.metadata.branchRules ?? [];
      if (!branchRules.length) {
        warnings.push(`${label} has no branch rules; it will fall through to the fallback or next step.`);
      }
      branchRules.forEach((rule, ruleIndex) => {
        const ruleLabel = rule.label?.trim() || `Branch ${ruleIndex + 1}`;
        const hasCondition = rule.condition.key.trim().length > 0;
        const hasTarget = Boolean(rule.nextStepId?.trim());
        if (!hasCondition && !hasTarget) {
          errors.push(`${label} contains a blank branch rule (${ruleLabel}).`);
        }
        if (hasCondition && !hasTarget) {
          errors.push(`${label} branch rule ${ruleLabel} needs a target step.`);
        }
        if (rule.nextStepId?.trim() && !stepIds.has(rule.nextStepId)) {
          errors.push(`${label} branch rule ${ruleLabel} points to a missing target step.`);
        }
      });
      if (step.fallbackStepId.trim() && !stepIds.has(step.fallbackStepId)) {
        errors.push(`${label} points to a missing fallback step.`);
      }
    }
  });

  return { errors, warnings };
}

function toDraft(script: OfMessageScript): BuilderDraft {
  return {
    id: script.id,
    name: script.name,
    description: script.description ?? "",
    triggerEventType: script.trigger_event_type,
    status: script.status,
    actionMode: script.action_mode,
    autoSendEnabled: script.auto_send_enabled,
    requiresApproval: script.requires_approval,
    cooldownHours: script.cooldown_hours,
    maxSendsPerFan: script.max_sends_per_fan,
    folderName: script.folder_name ?? "",
    category: script.category ?? "",
    tags: script.tags ?? [],
    versionNumber: script.version_number ?? 1,
    sourceScriptId: script.source_script_id ?? null,
    builderConfig: {
      schemaVersion: script.builder_config?.schemaVersion ?? 1,
      variables: [...(script.builder_config?.variables ?? [])]
    },
    steps: (script.steps ?? []).length
      ? script.steps!.map((step) => ({
          id: step.id,
          type: step.step_type,
          body: step.message_body ?? "",
          delayMinutes: step.delay_minutes ?? 0,
          conditionKey: step.condition_key ?? "",
          conditionValue: step.condition_value ?? "",
          nextStepId: step.next_step_id ?? "",
          fallbackStepId: step.fallback_step_id ?? "",
          metadata: {
            ...defaultMetadataForType(step.step_type),
            ...(step.metadata ?? {})
          }
        }))
      : defaultScriptTemplate().steps.map((step) => ({
          id: tempId(),
          type: step.type,
          body: step.body ?? "",
          delayMinutes: step.delayMinutes ?? 0,
          conditionKey: step.condition?.key ?? "",
          conditionValue: step.condition?.value ?? "",
          nextStepId: step.nextStepId ?? "",
          fallbackStepId: step.fallbackStepId ?? "",
          metadata: step.metadata ?? defaultMetadataForType(step.type)
        }))
  };
}

function toTemplate(draft: BuilderDraft): MessageScriptTemplate {
  return {
    name: draft.name.trim() || "Untitled Script",
    description: draft.description.trim(),
    triggerEventType: draft.triggerEventType.trim() || "chat_message",
    autoSendEnabled: draft.autoSendEnabled,
    requiresApproval: draft.requiresApproval,
    actionMode: draft.actionMode,
    cooldownHours: Math.max(0, draft.cooldownHours),
    maxSendsPerFan: Math.max(0, draft.maxSendsPerFan),
    folderName: draft.folderName.trim(),
    category: draft.category.trim(),
    tags: draft.tags,
    versionNumber: Math.max(1, draft.versionNumber),
    sourceScriptId: draft.sourceScriptId,
    builderConfig: {
      schemaVersion: 1,
      variables: (draft.builderConfig.variables ?? []).filter((variable) => variable.key.trim())
    },
    steps: draft.steps.map((step, index) => ({
      id: step.id,
      order: index,
      type: step.type,
      body: requiresBody(step.type) ? step.body : undefined,
      delayMinutes: step.delayMinutes || undefined,
      condition: step.conditionKey.trim() ? { key: step.conditionKey.trim(), value: step.conditionValue } : undefined,
      nextStepId: step.nextStepId || undefined,
      fallbackStepId: step.fallbackStepId || undefined,
      metadata: sanitizeMetadata(step.metadata)
    }))
  };
}

function sanitizeMetadata(metadata: ScriptBuilderStepMetadata) {
  return {
    ...metadata,
    label: metadata.label?.trim() || undefined,
    variableKey: metadata.variableKey?.trim() || undefined,
    branchRules: (metadata.branchRules ?? [])
      .filter((rule) => rule.condition.key.trim())
      .map((rule) => ({
        ...rule,
        label: rule.label.trim() || "Branch",
        nextStepId: rule.nextStepId || null,
        condition: {
          ...rule.condition,
          key: rule.condition.key.trim(),
          value: rule.condition.value ?? ""
        }
      }))
  };
}

function defaultScriptTemplate(): MessageScriptTemplate {
  const first = tempId();
  const end = tempId();
  return {
    name: "New Script",
    description: "Creator-friendly automation flow.",
    triggerEventType: "chat_message",
    autoSendEnabled: false,
    requiresApproval: true,
    actionMode: "draft_for_approval",
    cooldownHours: 24,
    maxSendsPerFan: 1,
    folderName: "Inbox",
    category: "General",
    tags: [],
    versionNumber: 1,
    sourceScriptId: null,
    builderConfig: { schemaVersion: 1, variables: [] },
    steps: [
      {
        id: first,
        order: 0,
        type: "message",
        body: "Hey, thanks for reaching out.",
        nextStepId: end,
        metadata: { kind: "send_message", label: "Opening message" }
      },
      {
        id: end,
        order: 1,
        type: "end",
        metadata: { kind: "end_conversation", label: "Finish" }
      }
    ]
  };
}

function defaultMetadataForType(type: MessageScriptStepType, existing?: ScriptBuilderStepMetadata): ScriptBuilderStepMetadata {
  const base = existing ?? {};
  if (type === "wait") return { ...base, kind: "wait" };
  if (type === "question") return { ...base, kind: "ask_question" };
  if (type === "branch") return { ...base, kind: "branch", branchRules: base.branchRules ?? [defaultBranchRule()] };
  if (type === "set_variable") return { ...base, kind: "set_variable" };
  if (type === "end") return { ...base, kind: "end_conversation" };
  return { ...base, kind: "send_message" };
}

function defaultBranchRule(): ScriptBuilderBranchRule {
  return {
    id: tempId(),
    label: "New branch",
    condition: { source: "variable", key: "", operator: "equals", value: "" },
    nextStepId: null
  };
}

function updateBranchRule(
  stepId: string,
  ruleId: string,
  patch: Partial<ScriptBuilderBranchRule>,
  setDraft: Dispatch<SetStateAction<BuilderDraft | null>>
) {
  setDraft((current) => {
    if (!current) return current;
    return {
      ...current,
      steps: current.steps.map((step) =>
        step.id !== stepId
          ? step
          : {
              ...step,
              metadata: {
                ...step.metadata,
                branchRules: (step.metadata.branchRules ?? []).map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule))
              }
            }
      )
    };
  });
}

function removeBranchRule(
  stepId: string,
  ruleId: string,
  setDraft: Dispatch<SetStateAction<BuilderDraft | null>>
) {
  setDraft((current) => {
    if (!current) return current;
    return {
      ...current,
      steps: current.steps.map((step) =>
        step.id !== stepId
          ? step
          : {
              ...step,
              metadata: {
                ...step.metadata,
                branchRules: (step.metadata.branchRules ?? []).filter((rule) => rule.id !== ruleId)
              }
            }
      )
    };
  });
}

function stepLabel(step: BuilderStepDraft, index: number) {
  return step.metadata.label?.trim() || humanizeStepType(step.type, index);
}

function stepSummary(step: OfConversationInstance["current_step"] | OfConversationInstance["next_step"] | null | undefined) {
  if (!step) return "none";
  return `${step.step_order}. ${step.step_type}${step.message_body ? `: ${step.message_body.slice(0, 48)}` : ""}`;
}

function humanizeStepType(type: MessageScriptStepType, index: number) {
  if (type === "message" || type === "follow_up") return `Send Message ${index + 1}`;
  if (type === "question") return `Ask Question ${index + 1}`;
  if (type === "wait") return `Wait ${index + 1}`;
  if (type === "branch") return `Branch ${index + 1}`;
  if (type === "set_variable") return `Set Variable ${index + 1}`;
  return `End Conversation ${index + 1}`;
}

function requiresBody(type: MessageScriptStepType) {
  return type === "message" || type === "follow_up" || type === "question";
}

function parseTags(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function numberOr(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

function tempId() {
  return `temp-${Math.random().toString(36).slice(2, 10)}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected script builder error";
}

function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "none";
}
