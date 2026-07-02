import { PlaySquare, RefreshCw, Sparkles, TestTube2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  fetchCreatorAutomationScenarios,
  fetchScriptsWorkspace,
  fetchSimulatedSubscribers,
  startSimulation,
  type SimulationDetailData,
  type ScriptsWorkspaceData
} from "../lib/api";
import type { OfCreatorAutomationScenario, OfSimulatedSubscriber } from "@funkmyfans/of-types";

export function Simulations({ initialScriptId }: { initialScriptId?: string }) {
  const [workspace, setWorkspace] = useState<ScriptsWorkspaceData | null>(null);
  const [creatorId, setCreatorId] = useState<string>("");
  const [scenarios, setScenarios] = useState<OfCreatorAutomationScenario[]>([]);
  const [simulatedSubscribers, setSimulatedSubscribers] = useState<OfSimulatedSubscriber[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>("");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [selectedSubscriberId, setSelectedSubscriberId] = useState<string>("");
  const [simulation, setSimulation] = useState<SimulationDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    if (initialScriptId) setSelectedScriptId(initialScriptId);
  }, [initialScriptId]);

  useEffect(() => {
    if (!creatorId) return;
    void loadCreatorContext(creatorId);
  }, [creatorId]);

  useEffect(() => {
    if (!workspace) return;
    const selectedCreator = workspace.creators[0];
    if (!creatorId && selectedCreator) setCreatorId(selectedCreator.id);
    if (initialScriptId && workspace.scripts.some((script) => script.id === initialScriptId)) {
      const script = workspace.scripts.find((item) => item.id === initialScriptId);
      setSelectedScriptId(initialScriptId);
      if (script && script.creator_id !== creatorId) setCreatorId(script.creator_id);
    } else if (!selectedScriptId) {
      setSelectedScriptId(workspace.scripts.find((script) => script.creator_id === (selectedCreator?.id ?? creatorId))?.id ?? workspace.scripts[0]?.id ?? "");
    }
  }, [creatorId, initialScriptId, selectedScriptId, workspace]);

  const selectedScript = useMemo(
    () => workspace?.scripts.find((script) => script.id === selectedScriptId) ?? null,
    [selectedScriptId, workspace]
  );

  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null,
    [scenarios, selectedScenarioId]
  );

  const selectedSubscriber = useMemo(
    () => simulatedSubscribers.find((subscriber) => subscriber.id === selectedSubscriberId) ?? null,
    [selectedSubscriberId, simulatedSubscribers]
  );

  async function loadWorkspace() {
    setLoading(true);
    try {
      const result = await fetchScriptsWorkspace();
      setWorkspace(result);
      setError(null);
      const firstCreator = result.creators[0];
      if (firstCreator && !creatorId) {
        setCreatorId(firstCreator.id);
        await loadCreatorContext(firstCreator.id);
      }
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function loadCreatorContext(nextCreatorId: string) {
    try {
      const [scenarioResult, subscriberResult] = await Promise.all([
        fetchCreatorAutomationScenarios(nextCreatorId),
        fetchSimulatedSubscribers(nextCreatorId)
      ]);
      setScenarios(scenarioResult.scenarios);
      setSimulatedSubscribers(subscriberResult.subscribers);
      setSelectedScenarioId((current) => current || scenarioResult.scenarios[0]?.id || "");
      setSelectedSubscriberId((current) => current || subscriberResult.subscribers[0]?.id || "");
      if (!selectedScriptId) {
        setSelectedScriptId(
          workspace?.scripts.find((script) => script.creator_id === nextCreatorId)?.id ?? workspace?.scripts[0]?.id ?? ""
        );
      }
    } catch (loadError) {
      setError(errorMessage(loadError));
    }
  }

  async function handleRun() {
    if (!creatorId || !selectedScript) return;
    setBusy(true);
    try {
      const result = await startSimulation(creatorId, {
        scriptId: selectedScript.id,
        scenarioId: selectedScenario?.id ?? null,
        simulatedSubscriberId: selectedSubscriber?.id ?? null,
        eventType: selectedScenario?.trigger_event_type ?? selectedScript.trigger_event_type,
        subscriber: selectedSubscriber
          ? {
              name: selectedSubscriber.name,
              username: selectedSubscriber.username,
              subscription_status: selectedSubscriber.subscription_status,
              renewal_state: selectedSubscriber.renewal_state,
              spend_level: selectedSubscriber.spend_level,
              lifetime_value: selectedSubscriber.lifetime_value,
              message_history_summary: selectedSubscriber.message_history_summary ?? undefined,
              custom_variables: selectedSubscriber.custom_variables
            }
          : undefined
      });
      setSimulation(result);
      setError(null);
    } catch (runError) {
      setError(errorMessage(runError));
    } finally {
      setBusy(false);
    }
  }

  if (!workspace) {
    return (
      <div className="glass-panel rounded-3xl p-6">
        <div className="mb-4 h-5 w-64 rounded-full shimmer" />
        <div className="text-sm text-blue-100/70">Loading simulations workspace...</div>
      </div>
    );
  }

  const playbooks = workspace.scripts.filter((script) => script.creator_id === creatorId || !creatorId);

  return (
    <main className="space-y-4 animate-in-soft">
      <section className="glass-panel rounded-[28px] p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-sm font-semibold text-cyan-200">
          <TestTube2 className="h-4 w-4" aria-hidden="true" />
          Simulations
        </div>
        <h2 className="mt-4 text-3xl font-semibold text-white">Validate playbooks before they reach a live creator.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100/68">
          Choose a playbook, choose a scenario, run the test, and inspect the timeline and outcome. No editing is available here.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadWorkspace()}
            className="inline-flex items-center gap-2 rounded-2xl border border-blue-400/20 bg-[#102338]/72 px-4 py-3 text-sm font-semibold text-blue-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void handleRun()}
            disabled={busy || !selectedScript}
            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <PlaySquare className="h-4 w-4" aria-hidden="true" />
            {busy ? "Running..." : "Run"}
          </button>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="premium-card rounded-2xl p-4">
          <div className="text-sm font-semibold text-white">Choose inputs</div>
          <div className="mt-4 grid gap-4">
            <Field label="Creator">
              <select value={creatorId} onChange={(event) => setCreatorId(event.target.value)} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                {workspace.creators.map((creator) => (
                  <option key={creator.id} value={creator.id}>
                    {creator.display_name || creator.username}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Playbook">
              <select value={selectedScriptId} onChange={(event) => setSelectedScriptId(event.target.value)} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                <option value="">Select a playbook</option>
                {playbooks.map((script) => (
                  <option key={script.id} value={script.id}>
                    {script.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Scenario">
              <select value={selectedScenarioId} onChange={(event) => setSelectedScenarioId(event.target.value)} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                <option value="">Choose a scenario</option>
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Simulated subscriber">
              <select value={selectedSubscriberId} onChange={(event) => setSelectedSubscriberId(event.target.value)} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                <option value="">Use default persona</option>
                {simulatedSubscribers.map((subscriber) => (
                  <option key={subscriber.id} value={subscriber.id}>
                    {subscriber.name} (@{subscriber.username})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <MetricCard label="Playbooks" value={workspace.scripts.length} icon={Sparkles} />
            <MetricCard label="Scenarios" value={scenarios.length} icon={TestTube2} />
            <MetricCard label="Subscribers" value={simulatedSubscribers.length} icon={PlaySquare} />
            <MetricCard label="Selected" value={selectedScript ? selectedScript.name : "none"} icon={Sparkles} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="premium-card rounded-2xl p-4">
            <div className="text-sm font-semibold text-white">Outcome</div>
            {simulation ? (
              <div className="mt-4 space-y-3">
                <OutcomeRow label="Status" value={simulation.simulation.status} />
                <OutcomeRow label="Event type" value={simulation.simulation.event_type} />
                <OutcomeRow label="Playbook" value={simulation.simulation.script?.name ?? selectedScript?.name ?? "unknown"} />
                <OutcomeRow label="Scenario" value={simulation.simulation.scenario?.label ?? selectedScenario?.label ?? "unknown"} />
                <OutcomeRow label="Subscriber" value={simulation.simulation.simulated_subscriber?.name ?? selectedSubscriber?.name ?? "default"} />
                <OutcomeRow label="Last error" value={simulation.simulation.last_error ?? "none"} />
              </div>
            ) : (
              <div className="mt-3 text-sm text-blue-100/58">Run a simulation to see the outcome here.</div>
            )}
          </div>

          <div className="premium-card rounded-2xl p-4">
            <div className="text-sm font-semibold text-white">Timeline</div>
            <div className="mt-4 space-y-3">
              {(simulation?.history ?? []).map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-3">
                  <div className="flex items-center justify-between gap-3 text-xs text-blue-100/58">
                    <span>{entry.event_type}</span>
                    <span>{formatDate(entry.created_at)}</span>
                  </div>
                  <div className="mt-2 text-sm font-medium text-white">{entry.detail ?? "No detail recorded."}</div>
                </div>
              ))}
              {(simulation?.outboundMessages ?? []).map((message) => (
                <div key={message.id} className="rounded-2xl border border-cyan-300/15 bg-cyan-300/8 p-3">
                  <div className="flex items-center justify-between gap-3 text-xs text-cyan-200/78">
                    <span>Outbound</span>
                    <span>{message.status}</span>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-blue-50">{message.final_text ?? message.draft_text ?? message.message_body}</div>
                </div>
              ))}
              {!simulation ? <div className="text-sm text-blue-100/58">No run has been executed yet.</div> : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-blue-100/62">{label}</div>
      {children}
    </label>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">{label}</div>
          <div className="mt-2 text-lg font-semibold text-white">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-cyan-300" aria-hidden="true" />
      </div>
    </div>
  );
}

function OutcomeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-blue-500/10 py-1.5 last:border-b-0">
      <span className="text-blue-100/52">{label}</span>
      <span className="max-w-[60%] text-right text-white">{value}</span>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected simulations workspace error";
}
