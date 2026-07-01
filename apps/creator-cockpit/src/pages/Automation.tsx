import {
  Archive,
  Bell,
  Bot,
  Clock3,
  Copy,
  FileText,
  Play,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type {
  AutomationRegistryWorkspaceData,
  AutomationRuleActionType,
  AutomationRuleStatus,
  AutomationRuleTriggerType,
  MessageScriptActionMode,
  OfAutomationRule,
  OfAutomationRegistryEntry,
  ScriptBuilderCondition,
  ScriptExecutionMode
} from "@funkmyfans/of-types";
import {
  createAutomationRule,
  deleteAutomationRule,
  duplicateAutomationRule,
  fetchAutomationWorkspace,
  fetchAutomationRegistry,
  testAutomationRule,
  updateAutomationRule,
  type AutomationWorkspaceData
} from "../lib/api";

type RuleDraft = {
  id: string;
  name: string;
  description: string;
  creatorScope: OfAutomationRule["creator_scope"];
  creatorId: string | null;
  status: AutomationRuleStatus;
  triggerType: string;
  actionType: AutomationRuleActionType;
  selectedScriptId: string | null;
  approvalMode: MessageScriptActionMode;
  cooldownMinutes: number;
  frequencyLimit: number;
  conditions: ScriptBuilderCondition[];
};

type TestDraft = {
  creatorId: string;
  eventType: string;
  name: string;
  username: string;
  subscriptionStatus: string;
  renewalState: string;
  spendLevel: string;
  lifetimeValue: number;
  hasPurchasedPpv: boolean;
  isVip: boolean;
  daysSinceLastMessage: number;
  daysUntilExpiry: number;
};

const triggerOptions: Array<{ value: AutomationRuleTriggerType; label: string; category: string }> = [
  { value: "new_subscriber", label: "New subscriber", category: "Customer lifecycle" },
  { value: "subscription_expiring", label: "Subscription expiring", category: "Customer lifecycle" },
  { value: "subscription_renewed", label: "Subscription renewed", category: "Customer lifecycle" },
  { value: "no_chat_activity", label: "No chat activity", category: "Messaging" },
  { value: "new_inbound_message", label: "New inbound message", category: "Messaging" },
  { value: "ppv_purchased", label: "PPV purchased", category: "Revenue" },
  { value: "high_spender_detected", label: "High spender detected", category: "Revenue" },
  { value: "fan_inactive", label: "Fan inactive", category: "Messaging" },
  { value: "manual", label: "Manual", category: "Internal" },
  { value: "birthday", label: "Birthday", category: "Marketing" },
  { value: "vip", label: "VIP", category: "Internal" }
];

const triggerGroups = [
  { title: "Customer Lifecycle", items: triggerOptions.filter((item) => item.category === "Customer lifecycle") },
  { title: "Revenue Events", items: triggerOptions.filter((item) => item.category === "Revenue") },
  { title: "Messaging Events", items: triggerOptions.filter((item) => item.category === "Messaging") },
  { title: "Internal Events", items: triggerOptions.filter((item) => item.category === "Internal") },
  { title: "Marketing Events", items: triggerOptions.filter((item) => item.category === "Marketing") }
];

const classificationCards = [
  {
    title: "Unknown Lead",
    description: "Treat as a new relationship until the event or profile says otherwise."
  },
  {
    title: "Existing Subscriber",
    description: "A fan that already belongs in an active lifecycle and should stay deterministic."
  },
  {
    title: "Existing Conversation",
    description: "Continue the current thread before any automation takes over."
  },
  {
    title: "Automation Response",
    description: "A reply to a playbook should route back into the same automation decision tree."
  },
  {
    title: "Priority Customer",
    description: "Escalate high-value fans to faster review and tighter safety checks."
  },
  {
    title: "VIP",
    description: "Handle with premium tone, human awareness, and explicit approval safety."
  },
  {
    title: "Spam",
    description: "Short-circuit the flow and keep the conversation out of automation."
  },
  {
    title: "Creator Only",
    description: "Route into creator-owned handling when the creator must answer personally."
  },
  {
    title: "Agency Only",
    description: "Keep the agency in the loop for review or intervention."
  },
  {
    title: "Shared Conversation",
    description: "A shared work item where either creator or agency may answer."
  }
];

const queueCards = [
  { title: "General Queue", description: "No automation. Needs a human." },
  { title: "Automation Queue", description: "Automation currently owns the conversation." },
  { title: "Review Queue", description: "Waiting approval." },
  { title: "Creator Queue", description: "Assigned to creator." },
  { title: "Agency Queue", description: "Assigned to MGRNZ." },
  { title: "Shared Queue", description: "Either party may respond." },
  { title: "Escalation Queue", description: "Automation requires intervention." }
];

const approvalOptions: Array<{ value: MessageScriptActionMode; label: string }> = [
  { value: "task_only", label: "Task only" },
  { value: "draft_for_approval", label: "Draft for approval" },
  { value: "auto_send", label: "Auto send" }
];

const statusOptions: Array<{ value: AutomationRuleStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" }
];

const sourceOptions: Array<ScriptBuilderCondition["source"]> = ["relationship", "subscriber", "event", "variable"];
const operatorOptions: Array<ScriptBuilderCondition["operator"]> = ["equals", "not_equals", "contains", "gt", "gte", "lt", "lte", "within_days", "exists", "not_exists"];

export function Automation() {
  const [workspace, setWorkspace] = useState<AutomationWorkspaceData | null>(null);
  const [registry, setRegistry] = useState<AutomationRegistryWorkspaceData | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RuleDraft | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AutomationRuleStatus | "all">("all");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testDraft, setTestDraft] = useState<TestDraft>(defaultTestDraft());
  const [testResult, setTestResult] = useState<Awaited<ReturnType<typeof testAutomationRule>> | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    if (!workspace) return;
    const nextSelected = visibleRules(workspace.rules, search, creatorFilter, statusFilter)[0] ?? workspace.rules[0] ?? null;
    const chosen = workspace.rules.find((rule) => rule.id === selectedRuleId) ?? nextSelected;
    setSelectedRuleId(chosen?.id ?? null);
    setDraft(chosen ? toDraft(chosen) : null);
    if (chosen?.creator_id) {
      setTestDraft((current) => ({ ...current, creatorId: chosen.creator_id ?? current.creatorId, eventType: mapTriggerToSimulationEvent(chosen.trigger_type) }));
    }
  }, [creatorFilter, search, selectedRuleId, statusFilter, workspace]);

  const rules = useMemo(() => (workspace ? visibleRules(workspace.rules, search, creatorFilter, statusFilter) : []), [creatorFilter, search, statusFilter, workspace]);
  const stats = useMemo(() => buildStats(workspace?.rules ?? []), [workspace?.rules]);
  const routeDestination = useMemo(() => (draft ? determineRoutingDestination(draft) : "General Queue"), [draft]);
  const classification = useMemo(() => classifyRouting(draft), [draft]);
  const triggerOptions = useMemo(
    () =>
      (registry?.eventTypes ?? []).map((entry) => ({
        value: mapTriggerOptionValue(entry),
        label: entry.label,
        category: entry.category ?? "Other"
      })),
    [registry]
  );
  const triggerGroups = useMemo(() => groupByCategory(triggerOptions), [triggerOptions]);
  const classificationCards = useMemo(
    () => (registry?.classifications ?? []).map((entry) => ({ title: entry.label, description: entry.description ?? "" })),
    [registry]
  );
  const queueCards = useMemo(
    () => (registry?.queueStates ?? []).map((entry) => ({ title: entry.label, description: entry.description ?? "" })),
    [registry]
  );
  const routingDestinationCards = useMemo(
    () => (registry?.routingDestinations ?? []).map((entry) => ({ title: entry.label, description: entry.description ?? "" })),
    [registry]
  );

  async function loadWorkspace(preferredId?: string) {
    try {
      const [workspaceResult, registryResult] = await Promise.all([fetchAutomationWorkspace(), fetchAutomationRegistry()]);
      setWorkspace(workspaceResult);
      setRegistry(registryResult);
      if (preferredId) setSelectedRuleId(preferredId);
      setError(null);
    } catch (loadError) {
      setError(errorMessage(loadError));
    }
  }

  async function handleCreateRule() {
    const creatorId = creatorFilter !== "all" ? creatorFilter : workspace?.creators[0]?.id ?? null;
    if (!creatorId) {
      setError("Connect a creator before creating automation rules.");
      return;
    }
    setBusyAction("create");
    try {
      const response = await createAutomationRule(newRulePayload(creatorId));
      await loadWorkspace(response.rule.id);
      setTestResult(null);
    } catch (createError) {
      setError(errorMessage(createError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSave() {
    if (!draft) return;
    setBusyAction("save");
    try {
      const response = await updateAutomationRule(draft.id, toPayload(draft));
      await loadWorkspace(response.rule.id);
      setError(null);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDuplicate() {
    if (!draft) return;
    setBusyAction("duplicate");
    try {
      const response = await duplicateAutomationRule(draft.id);
      await loadWorkspace(response.rule.id);
      setError(null);
    } catch (duplicateError) {
      setError(errorMessage(duplicateError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleArchive() {
    if (!draft) return;
    setBusyAction("archive");
    try {
      const response = await updateAutomationRule(draft.id, { status: draft.status === "archived" ? "draft" : "archived" });
      await loadWorkspace(response.rule.id);
      setError(null);
    } catch (archiveError) {
      setError(errorMessage(archiveError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDelete() {
    if (!draft) return;
    if (!window.confirm(`Delete "${draft.name}"?`)) return;
    setBusyAction("delete");
    try {
      await deleteAutomationRule(draft.id);
      await loadWorkspace();
      setTestResult(null);
      setError(null);
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleTestRule() {
    if (!draft || !testDraft.creatorId) return;
    setBusyAction("test");
    try {
      const result = await testAutomationRule(draft.id, {
        creatorId: testDraft.creatorId,
        eventType: testDraft.eventType,
        subscriber: {
          name: testDraft.name,
          username: testDraft.username,
          subscription_status: testDraft.subscriptionStatus,
          renewal_state: testDraft.renewalState,
          spend_level: testDraft.spendLevel,
          lifetime_value: testDraft.lifetimeValue,
          message_history_summary: "Warm fan for automation simulation.",
          custom_variables: {
            subscriber_name: testDraft.name
          }
        },
        relationship: {
          lifetime_spend: testDraft.lifetimeValue,
          vip_score: testDraft.isVip ? 85 : 25,
          ppv_purchases: testDraft.hasPurchasedPpv ? 3 : 0,
          current_subscription_status: testDraft.subscriptionStatus,
          last_subscriber_message_at: new Date(Date.now() - testDraft.daysSinceLastMessage * 86400000).toISOString(),
          days_until_expiry: testDraft.daysUntilExpiry
        },
        eventPayload: {
          fanId: testDraft.username,
          purchase_status: testDraft.hasPurchasedPpv ? "purchased" : "not_purchased",
          days_until_expiry: testDraft.daysUntilExpiry
        }
      });
      setTestResult(result);
      await loadWorkspace(draft.id);
      setError(null);
    } catch (testError) {
      setError(errorMessage(testError));
    } finally {
      setBusyAction(null);
    }
  }

  if (!workspace) {
    return (
      <div className="glass-panel rounded-3xl p-6">
        <div className="mb-4 h-5 w-64 rounded-full shimmer" />
        <div className="text-sm text-blue-100/70">Loading conversation interpretation workspace...</div>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="glass-panel rounded-[28px] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.26em] text-cyan-300/85">Conversation Interpretation</div>
            <h2 className="mt-2 text-3xl font-semibold text-white">Classify first. Route deterministically. Let playbooks own the conversation.</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-blue-100/72">
              Event classification happens before automation. No LLM decides routing. The UI now shows the event registry, classification layer, and queue map before exposing the underlying rule editor.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={Plus} label="New Rule" onClick={() => void handleCreateRule()} busy={busyAction === "create"} />
            <ActionButton icon={Copy} label="Duplicate" onClick={() => void handleDuplicate()} disabled={!draft} busy={busyAction === "duplicate"} />
            <ActionButton icon={Archive} label={draft?.status === "archived" ? "Restore" : "Archive"} onClick={() => void handleArchive()} disabled={!draft} busy={busyAction === "archive"} />
            <ActionButton icon={Trash2} label="Delete" onClick={() => void handleDelete()} disabled={!draft} busy={busyAction === "delete"} tone="danger" />
            <ActionButton icon={Play} label="Test Rule" onClick={() => void handleTestRule()} disabled={!draft} busy={busyAction === "test"} tone="accent" />
            <ActionButton icon={Save} label="Save" onClick={() => void handleSave()} disabled={!draft} busy={busyAction === "save"} tone="accent" />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Bot} label="Rules" value={String(stats.total)} detail={`${stats.active} active / ${stats.draft} draft`} />
          <MetricCard icon={Clock3} label="Paused" value={String(stats.paused)} detail="Rules intentionally held back" />
          <MetricCard icon={FileText} label="Playbook Linked" value={String(stats.scriptLinked)} detail="Rules pointing to conversation playbooks" />
          <MetricCard icon={Bell} label="Queue / Notify" value={String(stats.nonScript)} detail="Operator and agency alerts" />
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[350px_1fr]">
        <aside className="glass-panel rounded-[28px] p-4">
          <div className="flex items-center justify-between gap-3 px-2">
            <div>
              <div className="text-lg font-semibold text-white">Routing Rules</div>
              <div className="text-sm text-blue-100/62">Browse the deterministic rule layer.</div>
            </div>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              {rules.length}
            </span>
          </div>

          <label className="command-card mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-blue-100/60">
            <Search className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent outline-none" placeholder="Search renewal, PPV, VIP..." />
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Creator">
              <select value={creatorFilter} onChange={(event) => setCreatorFilter(event.target.value)} className="command-card w-full rounded-2xl px-3 py-3 text-sm">
                <option value="all">All creators</option>
                {workspace.creators.map((creator) => (
                  <option key={creator.id} value={creator.id}>
                    {creator.display_name || creator.username}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AutomationRuleStatus | "all")} className="command-card w-full rounded-2xl px-3 py-3 text-sm">
                <option value="all">All</option>
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-4 max-h-[calc(100vh-24rem)] space-y-3 overflow-y-auto pr-1">
            {rules.map((rule) => (
              <button
                key={rule.id}
                type="button"
                onClick={() => {
                  setSelectedRuleId(rule.id);
                  setDraft(toDraft(rule));
                  setTestResult(null);
                }}
                className={`premium-card premium-card-hover w-full rounded-[24px] border p-4 text-left ${rule.id === selectedRuleId ? "selected-glow" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-white">{rule.name}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-cyan-200/80">{humanizeTrigger(rule.trigger_type)}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${statusTone(rule.status)}`}>
                    {rule.status}
                  </span>
                </div>
                <div className="mt-3 text-sm leading-6 text-blue-100/72">{rule.description || "No description yet."}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-blue-100/60">
                  <span className="rounded-full border border-blue-400/20 px-2 py-1">{rule.creator_scope === "all_creators" ? "All creators" : rule.creator?.display_name || rule.creator?.username || "Selected creator"}</span>
                  <span className="rounded-full border border-blue-400/20 px-2 py-1">{humanizeAction(rule.action_type)}</span>
                </div>
                <div className="mt-3 text-xs text-blue-100/56">Linked playbook: {rule.selected_script?.name ?? "none"}</div>
              </button>
            ))}
          </div>
        </aside>

        {!draft ? (
          <div className="glass-panel rounded-[28px] p-6 text-blue-100/72">Select a rule from the left to inspect the deterministic interpretation pipeline.</div>
        ) : (
          <div className="space-y-5">
            <div className="glass-panel rounded-[28px] p-5">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusTone(draft.status)}`}>{draft.status}</span>
                    <span className="rounded-full border border-blue-400/20 px-3 py-1 text-xs text-blue-100/70">
                      Linked playbook: {workspace.scripts.find((script) => script.id === draft.selectedScriptId)?.name ?? "none"}
                    </span>
                    <span className={`rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200`}>
                      Routes to {routeDestination}
                    </span>
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold text-white">{draft.name || "Untitled rule"}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/72">
                    The main job of this rule is to classify the event, decide the queue, and keep the routing deterministic. The full rule model stays behind the advanced panel.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <MiniStat label="Trigger" value={humanizeTrigger(draft.triggerType)} />
                  <MiniStat label="Action" value={humanizeAction(draft.actionType)} />
                  <MiniStat label="Matches" value={String(workspace.rules.find((rule) => rule.id === draft.id)?.recent_simulations?.length ?? 0)} />
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-[28px] p-5">
              <SectionTitle icon={ShieldCheck} title="Event Registry" subtitle="A formal registry makes automation intent explicit and keeps the pipeline deterministic." />
              <div className="mt-5 space-y-5">
                {triggerGroups.map((group) => (
                  <div key={group.title}>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">{group.title}</div>
                    <div className="grid gap-3 xl:grid-cols-2">
                      {group.items.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => updateDraft(setDraft, { triggerType: item.value, name: draft.name || `${item.label} Rule` })}
                          className={`rounded-[24px] border p-4 text-left ${
                            draft.triggerType === item.value ? "selected-glow border-cyan-300/25 text-white" : "border-blue-400/18 bg-[#091827]/50 text-blue-50"
                          }`}
                        >
                          <div className="text-base font-semibold">{item.label}</div>
                          <div className="mt-1 text-sm leading-6 text-blue-100/72">{item.category}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <div className="glass-panel rounded-[28px] p-5">
                <SectionTitle icon={Users} title="Incoming Response Classification" subtitle="Classification happens before automation. The LLM does not decide routing." />
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {classificationCards.map((item) => (
                    <div key={item.title} className={`rounded-[24px] border p-4 ${classification === item.title ? "selected-glow border-cyan-300/25 text-white" : "border-blue-400/18 bg-[#091827]/50 text-blue-50"}`}>
                      <div className="text-base font-semibold">{item.title}</div>
                      <div className="mt-1 text-sm leading-6 text-blue-100/72">{item.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel rounded-[28px] p-5">
                <SectionTitle icon={Bell} title="Queue Architecture" subtitle="Every conversation stays in exactly one destination at a time." />
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {queueCards.map((item) => (
                    <div key={item.title} className={`rounded-[24px] border p-4 ${routeDestination === item.title ? "selected-glow border-cyan-300/25 text-white" : "border-blue-400/18 bg-[#091827]/50 text-blue-50"}`}>
                      <div className="text-base font-semibold">{item.title}</div>
                      <div className="mt-1 text-sm leading-6 text-blue-100/72">{item.description}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {routingDestinationCards.map((item) => (
                    <span key={item.title} className="rounded-full border border-blue-400/20 px-3 py-1 text-xs text-blue-100/68">
                      {item.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-[28px] p-5">
              <SectionTitle icon={Clock3} title="Decision Flow" subtitle="Classification first, deterministic routing second, playbook execution third." />
              <div className="mt-4 grid gap-3 text-sm text-blue-100/72">
                {[
                  "Incoming Event",
                  "Event Classification",
                  `Routing Engine -> ${routeDestination}`,
                  "Playbook or Queue",
                  "Approval Workflow",
                  "Outcome",
                  "Learning"
                ].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-blue-400/14 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-400/18 bg-[#102338]/72 text-xs font-semibold text-cyan-200">{index + 1}</div>
                    <div>{item}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-[28px] p-5">
              <button type="button" onClick={() => setAdvancedOpen((current) => !current)} className="flex w-full items-center justify-between gap-3 text-left">
                <div>
                  <div className="text-lg font-semibold text-white">Advanced Settings</div>
                  <div className="text-sm text-blue-100/64">Hide the technical configuration unless someone is intentionally tuning the rule model.</div>
                </div>
                <span className="rounded-full border border-blue-400/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-100/70">
                  {advancedOpen ? "Collapse" : "Expand"}
                </span>
              </button>

              {advancedOpen ? (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <Field label="Rule Name">
                      <input value={draft.name} onChange={(event) => updateDraft(setDraft, { name: event.target.value })} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                    </Field>
                    <Field label="Status">
                      <select value={draft.status} onChange={(event) => updateDraft(setDraft, { status: event.target.value as AutomationRuleStatus })} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                        {statusOptions.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Description">
                      <textarea value={draft.description} onChange={(event) => updateDraft(setDraft, { description: event.target.value })} rows={4} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Creator Scope">
                        <select
                          value={draft.creatorScope}
                          onChange={(event) => updateDraft(setDraft, { creatorScope: event.target.value as OfAutomationRule["creator_scope"] })}
                          className="command-card w-full rounded-2xl px-4 py-3 text-sm"
                        >
                          <option value="all_creators">All creators</option>
                          <option value="selected_creator">Selected creator</option>
                        </select>
                      </Field>
                      <Field label="Selected Creator">
                        <select
                          value={draft.creatorId ?? ""}
                          onChange={(event) => updateDraft(setDraft, { creatorId: event.target.value || null })}
                          className="command-card w-full rounded-2xl px-4 py-3 text-sm"
                        >
                          <option value="">None</option>
                          {workspace.creators.map((creator) => (
                            <option key={creator.id} value={creator.id}>
                              {creator.display_name || creator.username}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field label="Selected Playbook">
                      <select
                        value={draft.selectedScriptId ?? ""}
                        onChange={(event) => updateDraft(setDraft, { selectedScriptId: event.target.value || null })}
                        className="command-card w-full rounded-2xl px-4 py-3 text-sm"
                      >
                        <option value="">None</option>
                        {workspace.scripts.map((script) => (
                          <option key={script.id} value={script.id}>
                            {script.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Approval Mode">
                      <select value={draft.approvalMode} onChange={(event) => updateDraft(setDraft, { approvalMode: event.target.value as MessageScriptActionMode })} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                        {approvalOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Trigger Type">
                      <select value={draft.triggerType} onChange={(event) => updateDraft(setDraft, { triggerType: event.target.value })} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                        {triggerOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Action Type">
                      <select value={draft.actionType} onChange={(event) => updateDraft(setDraft, { actionType: event.target.value as AutomationRuleActionType })} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                        <option value="run_script">Run script</option>
                        <option value="create_task">Create task</option>
                        <option value="queue_outbound_draft">Queue outbound draft</option>
                        <option value="notify_agency">Notify agency</option>
                      </select>
                    </Field>
                    <Field label="Cooldown Minutes">
                      <input
                        type="number"
                        min={0}
                        value={draft.cooldownMinutes}
                        onChange={(event) => updateDraft(setDraft, { cooldownMinutes: toInt(event.target.value, 60) })}
                        className="command-card w-full rounded-2xl px-4 py-3 text-sm"
                      />
                    </Field>
                    <Field label="Frequency Limit">
                      <input
                        type="number"
                        min={0}
                        value={draft.frequencyLimit}
                        onChange={(event) => updateDraft(setDraft, { frequencyLimit: toInt(event.target.value, 1) })}
                        className="command-card w-full rounded-2xl px-4 py-3 text-sm"
                      />
                    </Field>
                  </div>

                  <div className="rounded-[24px] border border-blue-400/20 bg-[#091827]/55 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">Condition Builder</div>
                        <div className="text-xs text-blue-100/56">These rules remain deterministic and do not use an LLM.</div>
                      </div>
                      <SmallButton label="Add condition" onClick={() => addCondition(setDraft)} />
                    </div>
                    <div className="mt-4 space-y-3">
                      {draft.conditions.map((condition, index) => (
                        <ConditionRow
                          key={conditionKey(condition, index)}
                          condition={condition}
                          onChange={(patch) => updateCondition(setDraft, index, patch)}
                          onRemove={() => removeCondition(setDraft, index)}
                        />
                      ))}
                      {!draft.conditions.length ? <div className="text-sm text-blue-100/58">No extra conditions yet.</div> : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
              <div className="glass-panel rounded-[28px] p-5">
                <SectionTitle icon={Users} title="Test Runner" subtitle="Simulate a creator, a fan scenario, and an event without sending anything live." />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Creator">
                    <select value={testDraft.creatorId} onChange={(event) => setTestDraft((current) => ({ ...current, creatorId: event.target.value }))} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                      {workspace.creators.map((creator) => (
                        <option key={creator.id} value={creator.id}>
                          {creator.display_name || creator.username}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Sample Event">
                    <select value={testDraft.eventType} onChange={(event) => setTestDraft((current) => ({ ...current, eventType: event.target.value }))} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                      {triggerOptions.map((option) => (
                        <option key={option.value} value={mapTriggerToSimulationEvent(option.value)}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Fan Name">
                    <input value={testDraft.name} onChange={(event) => setTestDraft((current) => ({ ...current, name: event.target.value }))} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                  </Field>
                  <Field label="Username">
                    <input value={testDraft.username} onChange={(event) => setTestDraft((current) => ({ ...current, username: event.target.value }))} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                  </Field>
                  <Field label="Subscription Status">
                    <input value={testDraft.subscriptionStatus} onChange={(event) => setTestDraft((current) => ({ ...current, subscriptionStatus: event.target.value }))} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                  </Field>
                  <Field label="Renewal State">
                    <input value={testDraft.renewalState} onChange={(event) => setTestDraft((current) => ({ ...current, renewalState: event.target.value }))} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                  </Field>
                  <Field label="Spend Level">
                    <input value={testDraft.spendLevel} onChange={(event) => setTestDraft((current) => ({ ...current, spendLevel: event.target.value }))} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                  </Field>
                  <Field label="Lifetime Spend">
                    <input type="number" min={0} value={testDraft.lifetimeValue} onChange={(event) => setTestDraft((current) => ({ ...current, lifetimeValue: Number(event.target.value) || 0 }))} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                  </Field>
                  <Field label="Days Since Last Message">
                    <input type="number" min={0} value={testDraft.daysSinceLastMessage} onChange={(event) => setTestDraft((current) => ({ ...current, daysSinceLastMessage: Number(event.target.value) || 0 }))} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                  </Field>
                  <Field label="Days Until Expiry">
                    <input type="number" min={0} value={testDraft.daysUntilExpiry} onChange={(event) => setTestDraft((current) => ({ ...current, daysUntilExpiry: Number(event.target.value) || 0 }))} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                  </Field>
                  <ToggleField label="Has Purchased PPV" checked={testDraft.hasPurchasedPpv} onChange={(checked) => setTestDraft((current) => ({ ...current, hasPurchasedPpv: checked }))} />
                  <ToggleField label="Is VIP" checked={testDraft.isVip} onChange={(checked) => setTestDraft((current) => ({ ...current, isVip: checked }))} />
                </div>
              </div>

              <div className="glass-panel rounded-[28px] p-5">
                <SectionTitle icon={Play} title="Routing Simulation" subtitle="See exactly what matched, which conditions passed, and where the event would go." />
                {!testResult ? (
                  <div className="mt-4 rounded-[22px] border border-blue-400/20 bg-[#091827]/55 p-5 text-sm leading-6 text-blue-100/70">
                    Run a rule simulation to inspect match logic, queue destination, linked playbook, and the draft messages that would be generated.
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 md:grid-cols-4">
                      <MiniStat label="Trigger" value={testResult.triggerMatched ? "Matched" : "Not matched"} />
                      <MiniStat label="Rule" value={testResult.matched ? "Matched" : "Not matched"} />
                      <MiniStat label="Action" value={humanizeAction(testResult.action)} />
                      <MiniStat label="Playbook" value={testResult.scriptName ?? "none"} />
                    </div>

                    <div className="rounded-[22px] border border-blue-400/20 bg-[#091827]/55 p-4">
                      <div className="text-sm font-semibold text-white">Queue Destination</div>
                      <div className="mt-3 text-sm leading-6 text-blue-100/76">{routeDestination}</div>
                    </div>

                    <div className="rounded-[22px] border border-blue-400/20 bg-[#091827]/55 p-4">
                      <div className="text-sm font-semibold text-white">Conditions Passed / Failed</div>
                      <div className="mt-3 space-y-2">
                        {testResult.conditions.map((condition) => (
                          <div key={`${condition.key}:${condition.expected}`} className="flex items-start justify-between gap-4 rounded-2xl border border-blue-400/14 px-3 py-3 text-sm">
                            <div>
                              <div className="font-semibold text-white">{condition.label}</div>
                              <div className="text-blue-100/62">Expected {condition.expected} / Actual {condition.actual || "empty"}</div>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${condition.matched ? "bg-emerald-500/14 text-emerald-200" : "bg-rose-500/14 text-rose-200"}`}>
                              {condition.matched ? "Passed" : "Failed"}
                            </span>
                          </div>
                        ))}
                        {!testResult.conditions.length ? <div className="text-sm text-blue-100/58">This rule has no extra conditions.</div> : null}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-blue-400/20 bg-[#091827]/55 p-4">
                      <div className="text-sm font-semibold text-white">Action Summary</div>
                      <div className="mt-3 text-sm leading-6 text-blue-100/76">{testResult.summary}</div>
                    </div>

                    <div className="rounded-[22px] border border-blue-400/20 bg-[#091827]/55 p-4">
                      <div className="text-sm font-semibold text-white">Outbound Drafts That Would Queue</div>
                      <div className="mt-3 space-y-3">
                        {testResult.outboundMessages.map((message) => (
                          <div key={message.id} className="rounded-2xl border border-blue-400/14 px-4 py-3">
                            <div className="flex items-center justify-between gap-4">
                              <div className="text-xs uppercase tracking-[0.16em] text-cyan-200/80">{message.of_message_scripts?.name ?? testResult.scriptName ?? "Playbook"}</div>
                              <div className="text-xs text-blue-100/56">{message.status}</div>
                            </div>
                            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-blue-50">{message.final_text ?? message.draft_text ?? message.message_body}</div>
                          </div>
                        ))}
                        {!testResult.outboundMessages.length ? <div className="text-sm text-blue-100/58">No outbound drafts would be queued for this simulation.</div> : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel rounded-[28px] p-5">
              <SectionTitle icon={Clock3} title="Recent Simulated Matches" subtitle="Quick visibility into the last safe tests run against this rule." />
              <div className="mt-4 space-y-3">
                {(workspace.rules.find((rule) => rule.id === draft.id)?.recent_simulations ?? []).map((simulation) => (
                  <div key={`${simulation.automationSimulationId ?? simulation.simulatedAt}`} className="rounded-[22px] border border-blue-400/20 bg-[#091827]/55 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{simulation.summary}</div>
                        <div className="mt-1 text-xs text-blue-100/56">
                          {formatDate(simulation.simulatedAt)} / {simulation.creatorName}
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${simulation.matched ? "bg-emerald-500/14 text-emerald-200" : "bg-rose-500/14 text-rose-200"}`}>
                        {simulation.matched ? "Matched" : "Missed"}
                      </span>
                    </div>
                  </div>
                ))}
                {!(workspace.rules.find((rule) => rule.id === draft.id)?.recent_simulations ?? []).length ? (
                  <div className="text-sm text-blue-100/58">No simulations recorded for this rule yet.</div>
                ) : null}
              </div>
            </div>

            <div className="glass-panel rounded-[28px] p-5">
              <SectionTitle icon={Bot} title="Learning Loop" subtitle="Completed conversations can later be tagged for deterministic improvements." />
              <div className="mt-4 flex flex-wrap gap-2">
                {["Relationship", "Upsell", "Objection", "Recovery", "VIP", "Retention", "Warning", "General"].map((tag) => (
                  <span key={tag} className="rounded-full border border-blue-400/20 px-3 py-1 text-xs text-blue-100/68">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function visibleRules(rules: OfAutomationRule[], search: string, creatorFilter: string, statusFilter: AutomationRuleStatus | "all") {
  const query = search.trim().toLowerCase();
  return rules.filter((rule) => {
    const matchesSearch = !query
      ? true
      : [rule.name, rule.description ?? "", rule.selected_script?.name ?? "", rule.creator?.display_name ?? "", rule.creator?.username ?? ""].join(" ").toLowerCase().includes(query);
    const matchesCreator = creatorFilter === "all" ? true : rule.creator_id === creatorFilter;
    const matchesStatus = statusFilter === "all" ? true : rule.status === statusFilter;
    return matchesSearch && matchesCreator && matchesStatus;
  });
}

function toDraft(rule: OfAutomationRule): RuleDraft {
  return {
    id: rule.id,
    name: rule.name,
    description: rule.description ?? "",
    creatorScope: rule.creator_scope,
    creatorId: rule.creator_id,
    status: rule.status,
    triggerType: rule.trigger_type,
    actionType: rule.action_type,
    selectedScriptId: rule.selected_script_id,
    approvalMode: rule.approval_mode,
    cooldownMinutes: rule.cooldown_minutes,
    frequencyLimit: rule.frequency_limit,
    conditions: [...(rule.conditions ?? [])]
  };
}

function toPayload(draft: RuleDraft) {
  return {
    name: draft.name.trim() || "Untitled rule",
    description: draft.description.trim(),
    creator_scope: draft.creatorScope,
    creator_id: draft.creatorScope === "all_creators" ? null : draft.creatorId,
    status: draft.status,
    trigger_type: draft.triggerType,
    action_type: draft.actionType,
    selected_script_id: draft.selectedScriptId,
    approval_mode: draft.approvalMode,
    conditions: draft.conditions.filter((condition) => condition.key.trim()),
    cooldown_minutes: draft.cooldownMinutes,
    frequency_limit: draft.frequencyLimit
  };
}

function newRulePayload(creatorId: string): Partial<OfAutomationRule> {
  return {
    name: "New Routing Rule",
    description: "Deterministic event routing rule for playbook orchestration.",
    creator_scope: "selected_creator",
    creator_id: creatorId,
    status: "draft",
    trigger_type: "manual",
    action_type: "run_script",
    selected_script_id: null,
    approval_mode: "draft_for_approval",
    conditions: [],
    cooldown_minutes: 60,
    frequency_limit: 1
  };
}

function defaultTestDraft(): TestDraft {
  return {
    creatorId: "",
    eventType: "manual",
    name: "Mason",
    username: "late_night_mason",
    subscriptionStatus: "active",
    renewalState: "current",
    spendLevel: "high",
    lifetimeValue: 180,
    hasPurchasedPpv: true,
    isVip: true,
    daysSinceLastMessage: 2,
    daysUntilExpiry: 1
  };
}

function buildStats(rules: OfAutomationRule[]) {
  return rules.reduce(
    (acc, rule) => {
      acc.total += 1;
      if (rule.status === "active") acc.active += 1;
      if (rule.status === "draft") acc.draft += 1;
      if (rule.status === "paused") acc.paused += 1;
      if (rule.selected_script_id) acc.scriptLinked += 1;
      if (!rule.selected_script_id || rule.action_type === "create_task" || rule.action_type === "notify_agency") acc.nonScript += 1;
      return acc;
    },
    { total: 0, active: 0, draft: 0, paused: 0, scriptLinked: 0, nonScript: 0 }
  );
}

function classifyRouting(draft: RuleDraft | null) {
  if (!draft) return "Unknown Lead";
  if (draft.actionType === "notify_agency") return "Agency Only";
  if (draft.actionType === "create_task") return "Creator Only";
  if (draft.actionType === "queue_outbound_draft") return "Shared Conversation";
  if (draft.selectedScriptId) return "Automation Response";
  return "Existing Conversation";
}

function determineRoutingDestination(draft: RuleDraft) {
  if (draft.status === "archived") return "Escalation Queue";
  if (draft.actionType === "notify_agency") return "Agency Queue";
  if (draft.actionType === "create_task") return "Creator Queue";
  if (draft.actionType === "queue_outbound_draft" && draft.approvalMode === "draft_for_approval") return "Review Queue";
  if (draft.actionType === "queue_outbound_draft" && draft.approvalMode === "auto_send") return "Automation Queue";
  if (draft.selectedScriptId) return "Automation Queue";
  return "General Queue";
}

function updateDraft(setDraft: Dispatch<SetStateAction<RuleDraft | null>>, patch: Partial<RuleDraft>) {
  setDraft((current) => (current ? { ...current, ...patch } : current));
}

function addCondition(setDraft: Dispatch<SetStateAction<RuleDraft | null>>) {
  setDraft((current) => (current ? { ...current, conditions: [...current.conditions, blankCondition()] } : current));
}

function updateCondition(setDraft: Dispatch<SetStateAction<RuleDraft | null>>, index: number, patch: Partial<ScriptBuilderCondition>) {
  setDraft((current) => {
    if (!current) return current;
    const conditions = [...current.conditions];
    conditions[index] = { ...conditions[index], ...patch };
    return { ...current, conditions };
  });
}

function removeCondition(setDraft: Dispatch<SetStateAction<RuleDraft | null>>, index: number) {
  setDraft((current) => {
    if (!current) return current;
    const conditions = [...current.conditions];
    conditions.splice(index, 1);
    return { ...current, conditions };
  });
}

function blankCondition(): ScriptBuilderCondition {
  return { source: "relationship", key: "", operator: "gte", value: "" };
}

function conditionKey(condition: ScriptBuilderCondition, index: number) {
  return `${condition.source}:${condition.key}:${condition.operator}:${index}`;
}

function mapTriggerOptionValue(entry: OfAutomationRegistryEntry) {
  const mapped = typeof entry.metadata.rule_trigger_type === "string" && entry.metadata.rule_trigger_type.trim() ? entry.metadata.rule_trigger_type.trim() : entry.registry_key;
  return mapped as AutomationRuleTriggerType | string;
}

function groupByCategory(items: Array<{ value: string; label: string; category: string }>) {
  const groups = new Map<string, Array<{ value: string; label: string; category: string }>>();
  for (const item of items) {
    const next = groups.get(item.category) ?? [];
    next.push(item);
    groups.set(item.category, next);
  }
  return [...groups.entries()].map(([title, groupItems]) => ({ title, items: groupItems }));
}

function mapTriggerToSimulationEvent(value: string) {
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
  return mapping[value] ?? value;
}

function humanizeTrigger(value: string) {
  return triggerOptions.find((option) => option.value === value)?.label ?? value.replaceAll("_", " ");
}

function humanizeAction(value: AutomationRuleActionType) {
  switch (value) {
    case "run_script":
      return "Run script";
    case "create_task":
      return "Create task";
    case "queue_outbound_draft":
      return "Queue outbound draft";
    case "notify_agency":
      return "Notify agency";
  }
}

function statusTone(value: AutomationRuleStatus) {
  if (value === "active") return "bg-emerald-500/14 text-emerald-200";
  if (value === "paused") return "bg-amber-500/14 text-amber-200";
  if (value === "archived") return "bg-rose-500/14 text-rose-200";
  return "bg-blue-400/12 text-blue-100";
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  busy,
  tone = "default"
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  tone?: "default" | "accent" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-400/25 bg-rose-500/10 text-rose-100"
      : tone === "accent"
        ? "selected-glow text-white"
        : "border-blue-400/20 bg-[#102338]/72 text-blue-50";
  return (
    <button type="button" onClick={onClick} disabled={disabled || busy} className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${toneClass} disabled:cursor-not-allowed disabled:opacity-45`}>
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {busy ? `${label}...` : label}
      </span>
    </button>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: typeof Bot; label: string; value: string; detail: string }) {
  return (
    <div className="premium-card rounded-[24px] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">{label}</div>
          <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-2 text-sm text-blue-100/64">{detail}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-blue-400/20 bg-[#091827]/55 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100/58">{label}</div>
      <div className="mt-2 text-base font-semibold text-white">{value}</div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof Bot; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div>
        <div className="text-lg font-semibold text-white">{title}</div>
        <div className="text-sm text-blue-100/64">{subtitle}</div>
      </div>
    </div>
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

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="command-card flex items-center justify-between rounded-2xl px-4 py-3 text-sm">
      <span>{label}</span>
      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${checked ? "bg-emerald-500/14 text-emerald-200" : "bg-blue-400/12 text-blue-100"}`}>{checked ? "Yes" : "No"}</span>
    </button>
  );
}

function ConditionRow({
  condition,
  onChange,
  onRemove
}: {
  condition: ScriptBuilderCondition;
  onChange: (patch: Partial<ScriptBuilderCondition>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-blue-400/14 p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
      <select value={condition.source} onChange={(event) => onChange({ source: event.target.value as ScriptBuilderCondition["source"] })} className="command-card rounded-2xl px-3 py-2 text-sm">
        {sourceOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <input value={condition.key} onChange={(event) => onChange({ key: event.target.value })} className="command-card rounded-2xl px-3 py-2 text-sm" placeholder="field" />
      <select value={condition.operator} onChange={(event) => onChange({ operator: event.target.value as ScriptBuilderCondition["operator"] })} className="command-card rounded-2xl px-3 py-2 text-sm">
        {operatorOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <input value={String(condition.value ?? "")} onChange={(event) => onChange({ value: event.target.value })} className="command-card min-w-0 flex-1 rounded-2xl px-3 py-2 text-sm" placeholder="value" />
        <SmallButton label="Remove" onClick={onRemove} tone="danger" />
      </div>
    </div>
  );
}

function SmallButton({
  label,
  onClick,
  disabled,
  tone = "default"
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "accent" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-400/25 bg-rose-500/10 text-rose-100"
      : tone === "accent"
        ? "selected-glow text-white"
        : "border-blue-400/20 bg-[#102338]/72 text-blue-50";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${toneClass} disabled:cursor-not-allowed disabled:opacity-45`}>
      {label}
    </button>
  );
}

function humanizeExecution(value?: ScriptExecutionMode) {
  switch (value) {
    case "immediate":
      return "Immediate";
    case "delay":
      return "Delay";
    case "schedule":
      return "Schedule";
    case "manual_only":
      return "Manual only";
    default:
      return "Immediate";
  }
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}

function toInt(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected automation workspace error";
}
