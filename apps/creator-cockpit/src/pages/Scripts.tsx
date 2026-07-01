import {
  Archive,
  Bot,
  CalendarClock,
  CircleOff,
  Clock3,
  Copy,
  FileText,
  Gift,
  Play,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  UserRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type {
  AutomationRegistryWorkspaceData,
  MessageScriptTemplate,
  MessageScriptStepType,
  OfMessageScript,
  OfAutomationRegistryEntry,
  ScriptAiMode,
  ScriptApprovalMode,
  ScriptBuilderCondition,
  ScriptBuilderConfig,
  ScriptBuilderStepMetadata,
  ScriptBuilderVariable,
  ScriptExecutionMode,
  ScriptMediaKind,
  ScriptMessageGenerationMode
} from "@funkmyfans/of-types";
import {
  createCreatorScript,
  deleteScript,
  duplicateScript,
  fetchScriptsWorkspace,
  fetchAutomationRegistry,
  saveScriptBuilder,
  startSimulation,
  type SimulationDetailData,
  type ScriptsWorkspaceData
} from "../lib/api";

type DraftStep = {
  id: string;
  type: MessageScriptStepType;
  body: string;
  delayMinutes: number;
  nextStepId: string;
  fallbackStepId: string;
  metadata: ScriptBuilderStepMetadata;
};

type ScriptDraft = {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  category: string;
  folderName: string;
  status: OfMessageScript["status"];
  triggerEventType: string;
  tags: string[];
  cooldownHours: number;
  maxSendsPerFan: number;
  builderConfig: ScriptBuilderConfig;
  steps: DraftStep[];
};

type TestRunnerDraft = {
  creatorId: string;
  eventType: string;
  name: string;
  username: string;
  subscriptionStatus: string;
  renewalState: string;
  spendLevel: string;
  lifetimeValue: number;
  historySummary: string;
};

type GoalKey =
  | "welcome_new_subscriber"
  | "build_relationship"
  | "high_spender_follow_up"
  | "upsell_custom_content"
  | "recover_expired_subscriber"
  | "re_engage_quiet_fan"
  | "warning_stand_down"
  | "manual_campaign";

type StyleKey =
  | "friendly"
  | "flirty"
  | "direct_sales"
  | "vip"
  | "relationship_builder"
  | "authority"
  | "warning"
  | "soft_reactivation";

type AssistantDraft = {
  creatorPersonality: string;
  boundaries: string;
  writingStyle: string;
  relationshipStyle: string;
  confidenceLevel: string;
  audience: string;
  sellingApproach: string;
  targetOutcome: string;
};

type GoalCardDefinition = {
  key: GoalKey;
  title: string;
  description: string;
  triggerEventType: string;
  category: string;
  folderName: string;
  tags: string[];
  cooldownHours: number;
  maxSendsPerFan: number;
  premium?: boolean;
  steps: Array<{ type: MessageScriptStepType; body: string; delayMinutes?: number }>;
};

type StyleCardDefinition = {
  key: StyleKey;
  title: string;
  description: string;
  aiMode: ScriptAiMode;
  approvalMode: ScriptApprovalMode;
  tags: string[];
  premium?: boolean;
};

const goalCards: GoalCardDefinition[] = [
  {
    key: "welcome_new_subscriber",
    title: "Welcome New Subscriber",
    description: "Open the relationship, introduce the creator voice, and set the tone for what happens next.",
    triggerEventType: "subscriber_created",
    category: "Welcome",
    folderName: "Journey Library",
    tags: ["welcome", "relationship"],
    cooldownHours: 24,
    maxSendsPerFan: 1,
    steps: [
      { type: "message", body: "Hey {{subscriber_name}}, welcome in. I’m glad you’re here.", delayMinutes: 0 },
      { type: "question", body: "What kind of stuff do you want most from me?", delayMinutes: 60 }
    ]
  },
  {
    key: "build_relationship",
    title: "Build Relationship",
    description: "Keep the conversation warm, natural, and personal without sounding like a canned flow.",
    triggerEventType: "existing_conversation",
    category: "Relationship",
    folderName: "Journey Library",
    tags: ["relationship", "conversation"],
    cooldownHours: 36,
    maxSendsPerFan: 2,
    steps: [
      { type: "message", body: "I saw your message and wanted to answer properly.", delayMinutes: 0 },
      { type: "follow_up", body: "If you want, we can keep this going later tonight.", delayMinutes: 180 }
    ]
  },
  {
    key: "high_spender_follow_up",
    title: "High Spender Follow-up",
    description: "Prioritise high-value fans with a careful follow-up that feels premium instead of pushy.",
    triggerEventType: "high_spender",
    category: "Revenue",
    folderName: "Revenue Plays",
    tags: ["vip", "revenue"],
    cooldownHours: 12,
    maxSendsPerFan: 1,
    steps: [
      { type: "message", body: "You’ve been incredibly supportive lately, so I wanted to reach out directly.", delayMinutes: 0 },
      { type: "question", body: "Want something custom from me next?", delayMinutes: 90 }
    ]
  },
  {
    key: "upsell_custom_content",
    title: "Upsell Custom Content",
    description: "Move a fan toward custom content with a clear offer, strong framing, and a simple next step.",
    triggerEventType: "custom_content_request",
    category: "Revenue",
    folderName: "Revenue Plays",
    tags: ["custom", "upsell"],
    cooldownHours: 24,
    maxSendsPerFan: 1,
    steps: [
      { type: "message", body: "I can do that for you. Here’s the fastest way to make it happen.", delayMinutes: 0 },
      { type: "follow_up", body: "If you want the premium version, I can put that together too.", delayMinutes: 120 }
    ],
    premium: true
  },
  {
    key: "recover_expired_subscriber",
    title: "Recover Expired Subscriber",
    description: "Bring back a churned fan with a low-friction re-entry and an easy win.",
    triggerEventType: "subscription_expired",
    category: "Retention",
    folderName: "Recovery",
    tags: ["retention", "recovery"],
    cooldownHours: 72,
    maxSendsPerFan: 2,
    steps: [
      { type: "message", body: "I noticed you dropped off, so I wanted to make this easy to pick back up.", delayMinutes: 0 },
      { type: "question", body: "Want me to send you something worth coming back for?", delayMinutes: 240 }
    ]
  },
  {
    key: "re_engage_quiet_fan",
    title: "Re-engage Quiet Fan",
    description: "Wake up a quiet fan with a light, low-pressure message that invites a response.",
    triggerEventType: "reply_after_inactivity",
    category: "Reactivation",
    folderName: "Reactivation",
    tags: ["reactivation", "quiet-fan"],
    cooldownHours: 48,
    maxSendsPerFan: 1,
    steps: [
      { type: "message", body: "You’ve been quiet lately, so I thought I’d check in.", delayMinutes: 0 },
      { type: "question", body: "Still around, or should I tempt you back?", delayMinutes: 180 }
    ]
  },
  {
    key: "warning_stand_down",
    title: "Warning / Stand Down",
    description: "Send a firm boundary message when the conversation needs a hard stop or a reset.",
    triggerEventType: "manual",
    category: "Safety",
    folderName: "Boundaries",
    tags: ["warning", "boundaries"],
    cooldownHours: 0,
    maxSendsPerFan: 1,
    steps: [
      { type: "message", body: "I need to keep this conversation within boundaries.", delayMinutes: 0 },
      { type: "end", body: "Conversation closed." }
    ]
  },
  {
    key: "manual_campaign",
    title: "Manual Campaign",
    description: "A flexible operator-led playbook for broadcasts, launches, and seasonal campaigns.",
    triggerEventType: "manual",
    category: "Campaign",
    folderName: "Manual Campaigns",
    tags: ["manual", "campaign"],
    cooldownHours: 6,
    maxSendsPerFan: 1,
    steps: [
      { type: "message", body: "I’ve got something new I want to share with you.", delayMinutes: 0 },
      { type: "follow_up", body: "If you missed it, I can send the details again.", delayMinutes: 180 }
    ]
  }
];

const styleCards: StyleCardDefinition[] = [
  {
    key: "friendly",
    title: "Friendly",
    description: "Warm, upbeat, and easy to trust.",
    aiMode: "draft_only",
    approvalMode: "always_approve",
    tags: ["friendly", "warm"]
  },
  {
    key: "flirty",
    title: "Flirty",
    description: "Playful energy with a little edge.",
    aiMode: "draft_only",
    approvalMode: "always_approve",
    tags: ["flirty", "playful"]
  },
  {
    key: "direct_sales",
    title: "Direct Sales",
    description: "Clear CTA, strong framing, low ambiguity.",
    aiMode: "requires_approval",
    approvalMode: "auto_approve_below_threshold",
    tags: ["sales", "direct"]
  },
  {
    key: "vip",
    title: "VIP",
    description: "Concierge-style treatment for top fans.",
    aiMode: "requires_approval",
    approvalMode: "always_approve",
    tags: ["vip", "premium"],
    premium: true
  },
  {
    key: "relationship_builder",
    title: "Relationship Builder",
    description: "Slower cadence, more curiosity, more context.",
    aiMode: "draft_only",
    approvalMode: "always_approve",
    tags: ["relationship", "context"]
  },
  {
    key: "authority",
    title: "Authority",
    description: "Firm, confident, and boundary-led.",
    aiMode: "requires_approval",
    approvalMode: "always_approve",
    tags: ["authority", "boundaries"]
  },
  {
    key: "warning",
    title: "Warning",
    description: "Clear stand-down language for risky conversations.",
    aiMode: "disabled",
    approvalMode: "always_approve",
    tags: ["warning", "safety"]
  },
  {
    key: "soft_reactivation",
    title: "Soft Reactivation",
    description: "Gentle reminder that gives the fan an easy way back in.",
    aiMode: "draft_only",
    approvalMode: "always_approve",
    tags: ["reactivation", "soft"]
  }
];

const aiPromptFields: Array<{
  key: keyof AssistantDraft;
  label: string;
  placeholder: string;
}> = [
  { key: "creatorPersonality", label: "Creator personality", placeholder: "Playful, direct, premium, a little cheeky..." },
  { key: "boundaries", label: "Creator boundaries", placeholder: "No off-platform moves, no pushy repeat asks..." },
  { key: "writingStyle", label: "Writing style", placeholder: "Short, warm lines with strong rhythm..." },
  { key: "relationshipStyle", label: "Relationship style", placeholder: "Supportive, personal, lightly teasing..." },
  { key: "confidenceLevel", label: "Confidence level", placeholder: "Low-key, assured, high-status..." },
  { key: "audience", label: "Audience", placeholder: "New subscribers, high spenders, quiet fans..." },
  { key: "sellingApproach", label: "Selling approach", placeholder: "Soft CTA, direct offer, premium framing..." },
  { key: "targetOutcome", label: "Target outcome", placeholder: "Book custom content / recover subscriber / keep reply going..." }
];

const executionOptions: Array<{ value: ScriptExecutionMode; label: string }> = [
  { value: "immediate", label: "Immediate" },
  { value: "delay", label: "Delay" },
  { value: "schedule", label: "Schedule" },
  { value: "manual_only", label: "Manual only" }
];

const aiOptions: Array<{ value: ScriptAiMode; label: string }> = [
  { value: "disabled", label: "Disabled" },
  { value: "draft_only", label: "Draft only" },
  { value: "requires_approval", label: "Requires approval" },
  { value: "auto_send", label: "Auto send" }
];

const approvalOptions: Array<{ value: ScriptApprovalMode; label: string }> = [
  { value: "always_approve", label: "Always approve" },
  { value: "auto_approve_below_threshold", label: "Auto approve below threshold" },
  { value: "never_approve", label: "Never approve" }
];

const wizardStages = [
  { title: "Goal" },
  { title: "Style" },
  { title: "AI Helper" },
  { title: "Review" }
] as const;

const stepTypeOptions: DraftStep["type"][] = ["message", "follow_up", "question", "wait", "branch", "set_variable", "end"];
const mediaKindOptions: ScriptMediaKind[] = ["image", "video", "audio", "gallery"];
const sourceOptions: Array<ScriptBuilderCondition["source"]> = ["relationship", "subscriber", "event", "variable"];
const operatorOptions: Array<ScriptBuilderCondition["operator"]> = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "gt",
  "gte",
  "lt",
  "lte",
  "within_days",
  "exists",
  "not_exists"
];

export function Scripts() {
  const [workspace, setWorkspace] = useState<ScriptsWorkspaceData | null>(null);
  const [registry, setRegistry] = useState<AutomationRegistryWorkspaceData | null>(null);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ScriptDraft | null>(null);
  const [search, setSearch] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [libraryFilter, setLibraryFilter] = useState<"active" | "inactive" | "archived" | "all">("active");
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testRunner, setTestRunner] = useState<TestRunnerDraft>(defaultTestRunner());
  const [simulation, setSimulation] = useState<SimulationDetailData | null>(null);
  const [wizardStage, setWizardStage] = useState<0 | 1 | 2 | 3>(0);
  const [assistantDraft, setAssistantDraft] = useState<AssistantDraft>(defaultAssistantDraft());

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    if (!workspace) return;
    const nextSelected =
      workspace.scripts.find((script) => script.id === selectedScriptId) ??
      filteredScripts(workspace, search, creatorFilter, libraryFilter)[0] ??
      workspace.scripts[0] ??
      null;

    setSelectedScriptId(nextSelected?.id ?? null);
    setDraft(nextSelected ? toDraft(nextSelected) : null);
    setWizardStage(0);
    if (nextSelected) {
      setTestRunner((current) => ({ ...current, eventType: nextSelected.trigger_event_type || "manual" }));
      setAssistantDraft(assistantFromDraft(nextSelected));
    }
  }, [creatorFilter, libraryFilter, search, selectedScriptId, workspace]);

  const visibleScripts = useMemo(
    () => (workspace ? filteredScripts(workspace, search, creatorFilter, libraryFilter) : []),
    [creatorFilter, libraryFilter, search, workspace]
  );
  const eventRegistryEntries = registry?.eventTypes ?? [];
  const goalCards = registry?.playbookGoals ?? [];
  const styleCards = registry?.playbookStyles ?? [];
  const eventCards = useMemo(
    () =>
      eventRegistryEntries.map((entry) => ({
        value: stringRegistryValue(entry.metadata.rule_trigger_type, entry.registry_key),
        label: entry.label,
        category: entry.category ?? "Other"
      })),
    [eventRegistryEntries]
  );

  const selectedScript = workspace?.scripts.find((script) => script.id === selectedScriptId) ?? null;
  const creator = workspace?.creators.find((item) => item.id === draft?.creatorId || item.id === selectedScript?.creator_id) ?? null;
  const stats = useMemo(() => buildStats(workspace?.scripts ?? []), [workspace?.scripts]);
  const activeGoal = useMemo(
    () => (draft ? goalCards.find((goal) => goal.registry_key === draft.builderConfig.workspace?.templateKey) ?? goalCards[0] ?? null : goalCards[0] ?? null),
    [draft, goalCards]
  );
  const activeStyle = useMemo(
    () => (draft ? styleCards.find((style) => style.registry_key === draft.builderConfig.workspace?.styleKey) ?? styleCards[0] ?? null : styleCards[0] ?? null),
    [draft, styleCards]
  );
  const aiPreview = useMemo(() => buildAiPreview(assistantDraft), [assistantDraft]);
  const labelForEventType = (key: string) => registryEntryLabel(eventRegistryEntries, key, humanizeTrigger(key));

  async function loadWorkspace(preferredId?: string) {
    try {
      const [workspaceResult, registryResult] = await Promise.all([fetchScriptsWorkspace(), fetchAutomationRegistry()]);
      setWorkspace(workspaceResult);
      setRegistry(registryResult);
      setError(null);
      if (preferredId) setSelectedScriptId(preferredId);
    } catch (loadError) {
      setError(errorMessage(loadError));
    }
  }

  async function handleCreateScript() {
    const creatorId = creatorFilter !== "all" ? creatorFilter : workspace?.creators[0]?.id;
    if (!creatorId) {
      setError("Connect at least one creator before creating a playbook.");
      return;
    }

    setBusyAction("create");
    try {
      const response = await createCreatorScript(creatorId, newScriptTemplate());
      await loadWorkspace(response.script.id);
      setSimulation(null);
      setError(null);
    } catch (createError) {
      setError(errorMessage(createError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDuplicateScript() {
    if (!selectedScriptId) return;
    setBusyAction("duplicate");
    try {
      const response = await duplicateScript(selectedScriptId);
      await loadWorkspace(response.script.id);
      setSimulation(null);
      setError(null);
    } catch (duplicateError) {
      setError(errorMessage(duplicateError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleArchiveToggle() {
    if (!draft) return;
    const archivedAt = draft.builderConfig.workspace?.archivedAt ? null : new Date().toISOString();
    const nextDraft = {
      ...draft,
      status: "inactive" as const,
      builderConfig: {
        ...draft.builderConfig,
        workspace: {
          ...defaultWorkspaceConfig(),
          ...draft.builderConfig.workspace,
          archivedAt
        }
      }
    };
    setDraft(nextDraft);
    await persistDraft(nextDraft, "archive");
  }

  async function handleDeleteScript() {
    if (!selectedScriptId || !selectedScript) return;
    if (!window.confirm(`Delete "${selectedScript.name}"? This removes its steps too.`)) return;
    setBusyAction("delete");
    try {
      await deleteScript(selectedScriptId);
      setSimulation(null);
      await loadWorkspace();
      setError(null);
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSave() {
    if (!draft) return;
    await persistDraft(draft, "save");
  }

  async function handleActivate() {
    if (!draft) return;
    const nextDraft = { ...draft, status: "active" as const };
    setDraft(nextDraft);
    await persistDraft(nextDraft, "activate");
  }

  async function persistDraft(nextDraft: ScriptDraft, action: string) {
    setSaving(action === "save");
    setBusyAction(action !== "save" ? action : null);
    try {
      const response = await saveScriptBuilder(nextDraft.id, toTemplate(nextDraft));
      await loadWorkspace(response.script.id);
      setError(null);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
      setBusyAction(null);
    }
  }

  async function handleTestRun() {
    if (!draft) return;
    setBusyAction("test");
    try {
      const detail = await startSimulation(draft.creatorId, {
        scriptId: draft.id,
        eventType: testRunner.eventType || draft.triggerEventType,
        subscriber: {
          name: testRunner.name,
          username: testRunner.username,
          subscription_status: testRunner.subscriptionStatus,
          renewal_state: testRunner.renewalState,
          spend_level: testRunner.spendLevel,
          lifetime_value: testRunner.lifetimeValue,
          message_history_summary: testRunner.historySummary,
          custom_variables: {
            subscriber_name: testRunner.name,
            spend_level: testRunner.spendLevel
          }
        },
        variables: {
          subscriber_name: testRunner.name,
          creator_name: creator?.display_name ?? creator?.username ?? "Creator",
          ppv_offer_name: "VIP after-dark drop",
          ppv_price: "29",
          renewal_offer: "bonus voice note",
          next_offer: "priority unlock",
          save_offer: "late-night extra set"
        }
      });
      setSimulation(detail);
      setError(null);
    } catch (testError) {
      setError(errorMessage(testError));
    } finally {
      setBusyAction(null);
    }
  }

  function applyGoal(goal: OfAutomationRegistryEntry) {
    setDraft((current) =>
      current
        ? {
            ...current,
            name: goal.label,
            description: goal.description ?? "",
            category: stringRegistryValue(goal.metadata.category, goal.category ?? "General"),
            folderName: stringRegistryValue(goal.metadata.folder_name, current.folderName || "Journey Library"),
            triggerEventType: stringRegistryValue(goal.metadata.trigger_event_type, current.triggerEventType || "manual"),
            tags: uniqueTags([
              goal.registry_key.replaceAll("_", "-"),
              ...stringRegistryStringArray(goal.metadata.tags),
              ...current.tags.filter((tag) => !stringRegistryStringArray(goal.metadata.tags).includes(tag))
            ]),
            cooldownHours: numberRegistryValue(goal.metadata.cooldown_hours, current.cooldownHours),
            maxSendsPerFan: numberRegistryValue(goal.metadata.max_sends_per_fan, current.maxSendsPerFan),
            builderConfig: {
              ...current.builderConfig,
              workspace: {
                ...defaultWorkspaceConfig(),
                ...current.builderConfig.workspace,
                templateKey: goal.registry_key
              }
            },
            steps: registryPreviewSteps(goal, current)
          }
        : current
    );
  }

  function applyStyle(style: OfAutomationRegistryEntry) {
    setDraft((current) =>
      current
        ? {
            ...current,
            tags: uniqueTags([
              style.registry_key.replaceAll("_", "-"),
              ...stringRegistryStringArray(style.metadata.tags),
              ...current.tags.filter((tag) => !stringRegistryStringArray(style.metadata.tags).includes(tag))
            ]),
            builderConfig: {
              ...current.builderConfig,
              workspace: {
                ...defaultWorkspaceConfig(),
                ...current.builderConfig.workspace,
                styleKey: style.registry_key,
                ai: { mode: stringRegistryValue(style.metadata.ai_mode, "draft_only") as ScriptAiMode },
                approval: { mode: stringRegistryValue(style.metadata.approval_mode, "always_approve") as ScriptApprovalMode }
              }
            }
          }
        : current
    );
  }

  function applyAiSuggestions() {
    setDraft((current) =>
      current
        ? {
            ...current,
            description: `${assistantDraft.creatorPersonality}. ${assistantDraft.relationshipStyle}. ${assistantDraft.targetOutcome}.`,
            tags: uniqueTags([
              ...current.tags,
              slugify(assistantDraft.audience),
              slugify(assistantDraft.sellingApproach),
              slugify(assistantDraft.confidenceLevel)
            ]),
            steps: current.steps.map((step, index) =>
              index === 0
                ? { ...step, body: aiPreview.opener }
                : index === 1
                  ? { ...step, body: aiPreview.fallback }
                  : step
            )
          }
        : current
    );
  }

  function advanceWizard() {
    setWizardStage((current) => (current < 3 ? ((current + 1) as 0 | 1 | 2 | 3) : current));
  }

  function rewindWizard() {
    setWizardStage((current) => (current > 0 ? ((current - 1) as 0 | 1 | 2 | 3) : current));
  }

  if (!workspace) {
    return (
      <div className="glass-panel rounded-3xl p-6">
        <div className="mb-4 h-5 w-56 rounded-full shimmer" />
        <div className="text-sm text-blue-100/70">Loading your playbook workspace...</div>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="glass-panel rounded-[28px] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.26em] text-cyan-300/85">Conversation Automation Platform</div>
            <h2 className="mt-2 text-3xl font-semibold text-white">Build playbooks, not ad hoc scripts</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-blue-100/72">
              The underlying event engine stays deterministic. This front end now leads with goals, conversation style, AI enrichment, and review, while technical rules live behind the scenes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={Plus} label="New Playbook" onClick={() => void handleCreateScript()} busy={busyAction === "create"} />
            <ActionButton icon={Copy} label="Duplicate" onClick={() => void handleDuplicateScript()} disabled={!draft} busy={busyAction === "duplicate"} />
            <ActionButton
              icon={Archive}
              label={draft?.builderConfig.workspace?.archivedAt ? "Restore" : "Archive"}
              onClick={() => void handleArchiveToggle()}
              disabled={!draft}
              busy={busyAction === "archive"}
            />
            <ActionButton icon={Trash2} label="Delete" onClick={() => void handleDeleteScript()} disabled={!draft} busy={busyAction === "delete"} tone="danger" />
            <ActionButton icon={Play} label="Test Run" onClick={() => void handleTestRun()} disabled={!draft} busy={busyAction === "test"} tone="accent" />
            <ActionButton icon={Save} label={saving ? "Saving..." : "Save Draft"} onClick={() => void handleSave()} disabled={!draft || saving} busy={saving} tone="accent" />
            <ActionButton icon={Play} label="Activate" onClick={() => void handleActivate()} disabled={!draft} busy={busyAction === "activate"} tone="accent" />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={FileText} label="Playbooks" value={String(stats.total)} detail={`${stats.active} active / ${stats.archived} archived`} />
          <MetricCard icon={Sparkles} label="Revenue Plays" value={String(stats.revenue)} detail="PPV, customs, and high-value follow-ups" />
          <MetricCard icon={Clock3} label="Manual Playbooks" value={String(stats.manualOnly)} detail="Operator-led playbooks and campaigns" />
          <MetricCard icon={Gift} label="Seed Templates" value={String(stats.seeded)} detail="Ready-made starting points for teams" />
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[350px_1fr]">
        <aside className="glass-panel rounded-[28px] p-4">
          <div className="flex items-center justify-between gap-3 px-2">
            <div>
              <div className="text-lg font-semibold text-white">Playbook Library</div>
              <div className="text-sm text-blue-100/62">Browse by creator, status, or playbook name.</div>
            </div>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              {visibleScripts.length}
            </span>
          </div>

          <label className="command-card mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-blue-100/60">
            <Search className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full bg-transparent outline-none"
              placeholder="Search welcome, VIP, recovery..."
            />
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Creator">
              <select value={creatorFilter} onChange={(event) => setCreatorFilter(event.target.value)} className="command-card w-full rounded-2xl px-3 py-3 text-sm">
                <option value="all">All creators</option>
                {workspace.creators.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.display_name || item.username}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="View">
              <select value={libraryFilter} onChange={(event) => setLibraryFilter(event.target.value as typeof libraryFilter)} className="command-card w-full rounded-2xl px-3 py-3 text-sm">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
                <option value="all">All</option>
              </select>
            </Field>
          </div>

          <div className="mt-4 max-h-[calc(100vh-24rem)] space-y-3 overflow-y-auto pr-1">
            {visibleScripts.map((script) => {
              const workspaceConfig = script.builder_config?.workspace ?? defaultWorkspaceConfig();
              const selected = script.id === selectedScriptId;
              return (
                <button
                  key={script.id}
                  type="button"
                  onClick={() => {
                    setSelectedScriptId(script.id);
                    setDraft(toDraft(script));
                    setSimulation(null);
                  }}
                  className={`premium-card premium-card-hover w-full rounded-[24px] border p-4 text-left ${selected ? "selected-glow" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-white">{script.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-cyan-200/80">{labelForEventType(script.trigger_event_type)}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${scriptBadgeTone(script, workspaceConfig.archivedAt)}`}>
                      {workspaceConfig.archivedAt ? "Archived" : script.status}
                    </span>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-blue-100/72">{script.description || "No description yet."}</div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-blue-100/60">
                    <span className="rounded-full border border-blue-400/20 px-2 py-1">{script.of_creators?.display_name || script.of_creators?.username || "Unknown creator"}</span>
                    <span className="rounded-full border border-blue-400/20 px-2 py-1">{script.category || "Uncategorised"}</span>
                    <span className="rounded-full border border-blue-400/20 px-2 py-1">{humanizeExecution(workspaceConfig.execution?.mode)}</span>
                  </div>
                </button>
              );
            })}

            {!visibleScripts.length ? (
              <div className="premium-card rounded-[24px] p-5 text-sm leading-6 text-blue-100/70">
                No playbooks match this filter yet. Switch creators or create a new playbook.
              </div>
            ) : null}
          </div>
        </aside>

        <div className="space-y-5">
          {!draft ? (
            <div className="glass-panel rounded-[28px] p-6 text-blue-100/72">Select a playbook from the left to open the wizard.</div>
          ) : (
            <>
              <div className="glass-panel rounded-[28px] p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                        {creator?.display_name || creator?.username || "Creator"}
                      </span>
                      <span className="rounded-full border border-blue-400/20 px-3 py-1 text-xs text-blue-100/70">Updated {formatDate(selectedScript?.updated_at)}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${draft.status === "active" ? "bg-emerald-500/14 text-emerald-200" : "bg-blue-400/12 text-blue-100"}`}>
                        {draft.status}
                      </span>
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold text-white">{draft.name || "Untitled playbook"}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/72">
                      The wizard leads with business outcomes, then adds conversation style, AI assistance, and a compact review before revealing technical controls.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <MiniStat label="Triggers" value={labelForEventType(draft.triggerEventType)} />
                    <MiniStat label="AI Mode" value={humanizeAiMode(draft.builderConfig.workspace?.ai?.mode)} />
                    <MiniStat label="Approval" value={humanizeApprovalMode(draft.builderConfig.workspace?.approval?.mode)} />
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {wizardStages.map((item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => setWizardStage(index as 0 | 1 | 2 | 3)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                        wizardStage === index ? "selected-glow text-white" : "border-blue-400/20 bg-[#102338]/72 text-blue-50"
                      }`}
                    >
                      {index + 1}. {item.title}
                    </button>
                  ))}
                </div>
              </div>

              <WizardStagePanel
                stage={wizardStage}
                draft={draft}
                goalCards={goalCards}
                styleCards={styleCards}
                eventCards={eventRegistryEntries}
                assistantDraft={assistantDraft}
                onAssistantChange={setAssistantDraft}
                aiPreview={aiPreview}
                onApplyGoal={applyGoal}
                onApplyStyle={applyStyle}
                onApplyAssistant={applyAiSuggestions}
                onDraftChange={setDraft}
                onAddStep={() => addStep(setDraft)}
                onRemoveStep={(stepId) => removeStep(setDraft, stepId)}
                onDuplicateStep={(stepId) => duplicateStep(setDraft, stepId)}
                onMoveStep={(stepId, direction) => moveStep(setDraft, stepId, direction)}
                onUpdateStep={(stepId, patch) => updateStep(setDraft, stepId, patch)}
                onUpdateStepMetadata={(stepId, patch) => updateStepMetadata(setDraft, stepId, patch)}
                onAddStepCondition={(stepId) => addStepCondition(setDraft, stepId)}
                onUpdateStepCondition={(stepId, index, patch) => updateStepCondition(setDraft, stepId, index, patch)}
                onRemoveStepCondition={(stepId, index) => removeStepCondition(setDraft, stepId, index)}
                onUpdateWorkspace={(patch) => updateWorkspace(setDraft, patch)}
                onUpdateCondition={(index, patch) => updateCondition(setDraft, index, patch)}
                onAddCondition={() => addCondition(setDraft)}
                onRemoveCondition={(index) => removeCondition(setDraft, index)}
                onRewind={rewindWizard}
                onAdvance={advanceWizard}
                onSave={() => void handleSave()}
                onActivate={() => void handleActivate()}
                activeGoal={activeGoal}
                activeStyle={activeStyle}
                saving={saving}
              />

              <div className="glass-panel rounded-[28px] p-5">
                <SectionTitle icon={CalendarClock} title="Simulation Runner" subtitle="Run a safe test against the existing deterministic event engine." />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Creator">
                    <select value={testRunner.creatorId ?? draft.creatorId} onChange={(event) => setTestRunner((current) => ({ ...current, creatorId: event.target.value }))} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                      {workspace.creators.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.display_name || item.username}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Sample Event">
                    <select value={testRunner.eventType} onChange={(event) => setTestRunner((current) => ({ ...current, eventType: event.target.value }))} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                      {eventCards.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Fan Name">
                    <input value={testRunner.name} onChange={(event) => setTestRunner((current) => ({ ...current, name: event.target.value }))} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                  </Field>
                  <Field label="Username">
                    <input value={testRunner.username} onChange={(event) => setTestRunner((current) => ({ ...current, username: event.target.value }))} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                  </Field>
                  <Field label="Subscription Status">
                    <input value={testRunner.subscriptionStatus} onChange={(event) => setTestRunner((current) => ({ ...current, subscriptionStatus: event.target.value }))} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                  </Field>
                  <Field label="Renewal State">
                    <input value={testRunner.renewalState} onChange={(event) => setTestRunner((current) => ({ ...current, renewalState: event.target.value }))} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                  </Field>
                  <Field label="Spend Level">
                    <input value={testRunner.spendLevel} onChange={(event) => setTestRunner((current) => ({ ...current, spendLevel: event.target.value }))} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                  </Field>
                  <Field label="Lifetime Spend">
                    <input type="number" min={0} value={testRunner.lifetimeValue} onChange={(event) => setTestRunner((current) => ({ ...current, lifetimeValue: Number(event.target.value) || 0 }))} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                  </Field>
                  <Field label="History Summary">
                    <textarea value={testRunner.historySummary} onChange={(event) => setTestRunner((current) => ({ ...current, historySummary: event.target.value }))} rows={4} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                  </Field>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionButton icon={Play} label="Run Simulation" onClick={() => void handleTestRun()} busy={busyAction === "test"} tone="accent" />
                </div>
              </div>

              <div className="glass-panel rounded-[28px] p-5">
                <SectionTitle icon={Play} title="Simulation Output" subtitle="See the deterministic result that would be queued by the current playbook." />
                {!simulation ? (
                  <div className="mt-4 rounded-[22px] border border-blue-400/20 bg-[#091827]/55 p-5 text-sm leading-6 text-blue-100/70">
                    Run a safe test to inspect the matched event, queued actions, and any outbound drafts generated by the current playbook.
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 md:grid-cols-4">
                      <MiniStat label="Simulation" value={simulation.simulation.status} />
                      <MiniStat label="Conversation" value={simulation.conversation ? "Loaded" : "None"} />
                      <MiniStat label="Outbound" value={String(simulation.outboundMessages.length)} />
                      <MiniStat label="Event" value={simulation.simulation.event_type} />
                    </div>

                    <div className="rounded-[22px] border border-blue-400/20 bg-[#091827]/55 p-4">
                      <div className="text-sm font-semibold text-white">Queued Messages</div>
                      <div className="mt-3 space-y-3">
                        {simulation.outboundMessages.map((message) => (
                          <div key={message.id} className="rounded-2xl border border-blue-400/14 px-4 py-3">
                            <div className="flex items-center justify-between gap-4">
                              <div className="text-xs uppercase tracking-[0.16em] text-cyan-200/80">{message.of_message_scripts?.name ?? selectedScript?.name ?? "Playbook"}</div>
                              <div className="text-xs text-blue-100/56">{message.status}</div>
                            </div>
                            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-blue-50">{message.final_text ?? message.draft_text ?? message.message_body}</div>
                          </div>
                        ))}
                        {!simulation.outboundMessages.length ? <div className="text-sm text-blue-100/58">No outbound drafts would be queued for this run.</div> : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function WizardStagePanel({
  stage,
  draft,
  goalCards,
  styleCards,
  eventCards,
  assistantDraft,
  onAssistantChange,
  aiPreview,
  onApplyGoal,
  onApplyStyle,
  onApplyAssistant,
  onDraftChange,
  onAddStep,
  onRemoveStep,
  onDuplicateStep,
  onMoveStep,
  onUpdateStep,
  onUpdateStepMetadata,
  onAddStepCondition,
  onUpdateStepCondition,
  onRemoveStepCondition,
  onUpdateWorkspace,
  onUpdateCondition,
  onAddCondition,
  onRemoveCondition,
  onRewind,
  onAdvance,
  onSave,
  onActivate,
  activeGoal,
  activeStyle,
  saving
}: {
  stage: 0 | 1 | 2 | 3;
  draft: ScriptDraft;
  goalCards: OfAutomationRegistryEntry[];
  styleCards: OfAutomationRegistryEntry[];
  eventCards: OfAutomationRegistryEntry[];
  assistantDraft: AssistantDraft;
  onAssistantChange: Dispatch<SetStateAction<AssistantDraft>>;
  aiPreview: ReturnType<typeof buildAiPreview>;
  onApplyGoal: (goal: OfAutomationRegistryEntry) => void;
  onApplyStyle: (style: OfAutomationRegistryEntry) => void;
  onApplyAssistant: () => void;
  onDraftChange: Dispatch<SetStateAction<ScriptDraft | null>>;
  onAddStep: () => void;
  onRemoveStep: (stepId: string) => void;
  onDuplicateStep: (stepId: string) => void;
  onMoveStep: (stepId: string, direction: -1 | 1) => void;
  onUpdateStep: (stepId: string, patch: Partial<DraftStep>) => void;
  onUpdateStepMetadata: (stepId: string, patch: Partial<ScriptBuilderStepMetadata>) => void;
  onAddStepCondition: (stepId: string) => void;
  onUpdateStepCondition: (stepId: string, index: number, patch: Partial<ScriptBuilderCondition>) => void;
  onRemoveStepCondition: (stepId: string, index: number) => void;
  onUpdateWorkspace: (patch: Partial<NonNullable<ScriptBuilderConfig["workspace"]>>) => void;
  onUpdateCondition: (index: number, patch: Partial<ScriptBuilderCondition>) => void;
  onAddCondition: () => void;
  onRemoveCondition: (index: number) => void;
  onRewind: () => void;
  onAdvance: () => void;
  onSave: () => void;
  onActivate: () => void;
  activeGoal: OfAutomationRegistryEntry | null;
  activeStyle: OfAutomationRegistryEntry | null;
  saving: boolean;
}) {
  const eventOptions = eventCards.map((entry) => ({
    value: stringRegistryValue(entry.metadata.rule_trigger_type, entry.registry_key),
    label: entry.label,
    category: entry.category ?? "Other"
  }));
  const labelForEventType = (key: string) => registryEntryLabel(eventCards, key, humanizeTrigger(key));
  return (
    <div className="space-y-5">
      {stage === 0 ? (
        <div className="glass-panel rounded-[28px] p-5">
          <SectionTitle icon={FileText} title="Step 1. What do you want to achieve?" subtitle="Start with the business outcome. The underlying script fields stay hidden." />
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {goalCards.map((goal) => (
              <GoalCard key={goal.id} goal={goal} active={goal.registry_key === activeGoal?.registry_key} onClick={() => onApplyGoal(goal)} />
            ))}
          </div>
        </div>
      ) : null}

      {stage === 1 ? (
        <div className="glass-panel rounded-[28px] p-5">
          <SectionTitle icon={Sparkles} title="Step 2. Choose conversation style" subtitle="Pick the tone that should guide the playbook output." />
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {styleCards.map((style) => (
              <StyleCard key={style.id} style={style} active={style.registry_key === activeStyle?.registry_key} onClick={() => onApplyStyle(style)} />
            ))}
          </div>
        </div>
      ) : null}

      {stage === 2 ? (
        <div className="glass-panel rounded-[28px] p-5">
          <SectionTitle
            icon={Bot}
            title="Step 2B. AI Conversation Helper"
            subtitle="This assistant enriches the playbook. It does not route conversations or change the deterministic event model."
          />

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {aiPromptFields.map((field) => (
                  <Field key={field.key} label={field.label}>
                    <textarea
                      value={assistantDraft[field.key]}
                      onChange={(event) => onAssistantChange((current) => ({ ...current, [field.key]: event.target.value }))}
                      rows={3}
                      className="command-card w-full rounded-2xl px-4 py-3 text-sm"
                      placeholder={field.placeholder}
                    />
                  </Field>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <ActionButton icon={Sparkles} label="Apply enrichment" onClick={onApplyAssistant} tone="accent" />
                <ActionButton icon={Plus} label="Add step" onClick={onAddStep} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-blue-400/20 bg-[#091827]/55 p-4">
                <div className="text-sm font-semibold text-white">AI Preview</div>
                <div className="mt-3 space-y-3 text-sm leading-6 text-blue-100/72">
                  <PreviewRow label="Improved conversation" value={aiPreview.conversation} />
                  <PreviewRow label="Better message wording" value={aiPreview.opener} />
                  <PreviewRow label="Branch suggestions" value={aiPreview.branches} />
                  <PreviewRow label="Fallback response" value={aiPreview.fallback} />
                  <PreviewRow label="Timing recommendation" value={aiPreview.timing} />
                  <PreviewRow label="Escalation suggestion" value={aiPreview.escalation} />
                </div>
              </div>

              <div className="rounded-[24px] border border-blue-400/20 bg-[#091827]/55 p-4">
                <div className="text-sm font-semibold text-white">Learning hooks</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Relationship", "Upsell", "Objection", "Recovery", "VIP", "Retention", "Warning", "General"].map((tag) => (
                    <span key={tag} className="rounded-full border border-blue-400/20 px-3 py-1 text-xs text-blue-100/68">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-3 text-sm leading-6 text-blue-100/64">
                  Completed conversations can be committed into the learning loop later, but no model training or fine-tuning is implemented here.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {stage === 3 ? (
        <div className="glass-panel rounded-[28px] p-5">
          <SectionTitle icon={Clock3} title="Step 3. Review" subtitle="Confirm the journey, then save a draft or activate it." />

          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.85fr]">
            <div className="rounded-[24px] border border-blue-400/20 bg-[#091827]/55 p-4">
              <div className="text-sm font-semibold text-white">Compact pipeline</div>
              <div className="mt-4 grid gap-3 text-sm text-blue-100/72">
                {["Event", "Routing", "Playbook", "AI Enhancements", "Conversation", "Approval Mode", "Safety Rules", "Activate"].map((item, index) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-400/18 bg-[#102338]/72 text-xs font-semibold text-cyan-200">{index + 1}</div>
                    <div>{item}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-blue-400/20 bg-[#091827]/55 p-4">
              <div className="text-sm font-semibold text-white">Summary</div>
              <div className="mt-4 space-y-3 text-sm text-blue-100/72">
                <SummaryLine label="Trigger" value={labelForEventType(draft.triggerEventType)} />
                <SummaryLine label="Audience" value={draft.category || "General"} />
                <SummaryLine label="Conversation" value={draft.description || "No summary yet."} />
                <SummaryLine label="Approval mode" value={humanizeApprovalMode(draft.builderConfig.workspace?.approval?.mode)} />
                <SummaryLine label="Safety limits" value={`${draft.maxSendsPerFan} sends / ${draft.cooldownHours}h cooldown`} />
                <SummaryLine label="Estimated message count" value={String(draft.steps.length)} />
                <SummaryLine label="Cooldown rules" value={humanizeExecution(draft.builderConfig.workspace?.execution?.mode)} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton icon={Save} label="Save Draft" onClick={onSave} busy={saving} tone="accent" />
                <ActionButton icon={Play} label="Activate" onClick={onActivate} busy={saving} tone="accent" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="glass-panel rounded-[28px] p-5">
        <details>
          <summary className="cursor-pointer list-none text-lg font-semibold text-white">Advanced Settings</summary>
          <div className="mt-4 space-y-5">
            <div className="rounded-[24px] border border-blue-400/20 bg-[#091827]/55 p-4">
              <SectionTitle icon={CircleOff} title="Hidden technical configuration" subtitle="These are collapsed so default operators never have to think about them." />
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <Field label="Script Name">
                  <input value={draft.name} onChange={(event) => onDraftChange((current) => (current ? { ...current, name: event.target.value } : current))} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                </Field>
                <Field label="Category">
                  <input value={draft.category} onChange={(event) => onDraftChange((current) => (current ? { ...current, category: event.target.value } : current))} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                </Field>
                <Field label="Folder">
                  <input value={draft.folderName} onChange={(event) => onDraftChange((current) => (current ? { ...current, folderName: event.target.value } : current))} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                </Field>
                <Field label="Trigger Event">
                  <select value={draft.triggerEventType} onChange={(event) => onDraftChange((current) => (current ? { ...current, triggerEventType: event.target.value } : current))} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                    {eventOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select value={draft.status} onChange={(event) => onDraftChange((current) => (current ? { ...current, status: event.target.value as OfMessageScript["status"] } : current))} className="command-card w-full rounded-2xl px-4 py-3 text-sm">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
                <Field label="Execution Mode">
                  <select
                    value={draft.builderConfig.workspace?.execution?.mode}
                    onChange={(event) => onUpdateWorkspace({ execution: { mode: event.target.value as ScriptExecutionMode } })}
                    className="command-card w-full rounded-2xl px-4 py-3 text-sm"
                  >
                    {executionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="AI Mode">
                  <select
                    value={draft.builderConfig.workspace?.ai?.mode}
                    onChange={(event) => onUpdateWorkspace({ ai: { mode: event.target.value as ScriptAiMode } })}
                    className="command-card w-full rounded-2xl px-4 py-3 text-sm"
                  >
                    {aiOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Approval Mode">
                  <select
                    value={draft.builderConfig.workspace?.approval?.mode}
                    onChange={(event) => onUpdateWorkspace({ approval: { mode: event.target.value as ScriptApprovalMode } })}
                    className="command-card w-full rounded-2xl px-4 py-3 text-sm"
                  >
                    {approvalOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Cooldown Hours">
                  <input
                    type="number"
                    min={0}
                    value={draft.cooldownHours}
                    onChange={(event) => onDraftChange((current) => (current ? { ...current, cooldownHours: toInt(event.target.value, 24) } : current))}
                    className="command-card w-full rounded-2xl px-4 py-3 text-sm"
                  />
                </Field>
                <Field label="Max Sends Per Fan">
                  <input
                    type="number"
                    min={0}
                    value={draft.maxSendsPerFan}
                    onChange={(event) => onDraftChange((current) => (current ? { ...current, maxSendsPerFan: toInt(event.target.value, 1) } : current))}
                    className="command-card w-full rounded-2xl px-4 py-3 text-sm"
                  />
                </Field>
                <Field label="Tags">
                  <input
                    value={draft.tags.join(", ")}
                    onChange={(event) => onDraftChange((current) => (current ? { ...current, tags: csv(event.target.value) } : current))}
                    className="command-card w-full rounded-2xl px-4 py-3 text-sm"
                    placeholder="welcome, relationship, premium"
                  />
                </Field>
                <Field label="Description">
                  <textarea value={draft.description} onChange={(event) => onDraftChange((current) => (current ? { ...current, description: event.target.value } : current))} rows={4} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                </Field>
              </div>
            </div>

            <div className="rounded-[24px] border border-blue-400/20 bg-[#091827]/55 p-4">
              <SectionTitle icon={Gift} title="Message sequence" subtitle="This remains editable, but it’s no longer the center of the UX." />
              <div className="mt-4 space-y-4">
                {draft.steps.map((step, index) => (
                  <div key={step.id} className="rounded-[24px] border border-blue-400/14 p-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
                        <Field label="Type">
                          <select value={step.type} onChange={(event) => onUpdateStep(step.id, { type: event.target.value as DraftStep["type"] })} className="command-card w-full rounded-2xl px-3 py-2 text-sm">
                            {stepTypeOptions.map((option) => (
                              <option key={option} value={option}>
                                {humanizeStepType(option)}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Delay Minutes">
                          <input
                            type="number"
                            min={0}
                            value={step.delayMinutes}
                            onChange={(event) => onUpdateStep(step.id, { delayMinutes: toInt(event.target.value, 0) })}
                            className="command-card w-full rounded-2xl px-3 py-2 text-sm"
                          />
                        </Field>
                        <Field label="Label">
                          <input
                            value={step.metadata.label ?? ""}
                            onChange={(event) => onUpdateStepMetadata(step.id, { label: event.target.value })}
                            className="command-card w-full rounded-2xl px-3 py-2 text-sm"
                          />
                        </Field>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <SmallButton label="Up" onClick={() => onMoveStep(step.id, -1)} disabled={index === 0} />
                        <SmallButton label="Down" onClick={() => onMoveStep(step.id, 1)} disabled={index === draft.steps.length - 1} />
                        <SmallButton label="Copy" onClick={() => onDuplicateStep(step.id)} />
                        <SmallButton label="Remove" onClick={() => onRemoveStep(step.id)} tone="danger" />
                      </div>
                    </div>
                    {requiresBody(step.type) ? (
                      <Field label="Message Body">
                        <textarea value={step.body} onChange={(event) => onUpdateStep(step.id, { body: event.target.value })} rows={4} className="command-card w-full rounded-2xl px-4 py-3 text-sm" />
                      </Field>
                    ) : null}
                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      <Field label="Next Step ID">
                        <input value={step.nextStepId} onChange={(event) => onUpdateStep(step.id, { nextStepId: event.target.value })} className="command-card w-full rounded-2xl px-3 py-2 text-sm" />
                      </Field>
                      <Field label="Fallback Step ID">
                        <input value={step.fallbackStepId} onChange={(event) => onUpdateStep(step.id, { fallbackStepId: event.target.value })} className="command-card w-full rounded-2xl px-3 py-2 text-sm" />
                      </Field>
                    </div>
                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      <Field label="Message Generation">
                        <select
                          value={step.metadata.messageGenerationMode ?? "template"}
                          onChange={(event) => onUpdateStepMetadata(step.id, { messageGenerationMode: event.target.value as ScriptMessageGenerationMode })}
                          className="command-card w-full rounded-2xl px-3 py-2 text-sm"
                        >
                          <option value="template">Template</option>
                          <option value="ai_generated">AI generated</option>
                        </select>
                      </Field>
                      <Field label="Media Kind">
                        <select value={step.metadata.mediaKind ?? ""} onChange={(event) => onUpdateStepMetadata(step.id, { mediaKind: emptyToNull(event.target.value) as ScriptMediaKind | undefined })} className="command-card w-full rounded-2xl px-3 py-2 text-sm">
                          <option value="">None</option>
                          {mediaKindOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <div className="mt-4 rounded-[20px] border border-blue-400/14 bg-[#071423]/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">Stop rules</div>
                          <div className="text-xs text-blue-100/56">Hidden technical rules can still be edited here if needed.</div>
                        </div>
                        <SmallButton label="Add stop rule" onClick={() => onAddStepCondition(step.id)} />
                      </div>
                      <div className="mt-3 space-y-3">
                        {(step.metadata.stopConditions ?? []).map((condition, conditionIndex) => (
                          <ConditionRow
                            key={conditionKey(condition, conditionIndex)}
                            condition={condition}
                            onChange={(patch) => onUpdateStepCondition(step.id, conditionIndex, patch)}
                            onRemove={() => onRemoveStepCondition(step.id, conditionIndex)}
                          />
                        ))}
                        {!(step.metadata.stopConditions ?? []).length ? <div className="text-sm text-blue-100/58">No stop rules yet.</div> : null}
                      </div>
                    </div>
                  </div>
                ))}
                <SmallButton label="Add step" onClick={onAddStep} />
              </div>
            </div>

            <div className="rounded-[24px] border border-blue-400/20 bg-[#091827]/55 p-4">
              <SectionTitle icon={Bot} title="Playbook workspace details" subtitle="These are normally left untouched, but remain available for power users." />
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <Field label="Variable Templates">
                  <div className="space-y-3">
                    {(draft.builderConfig.variables ?? []).map((variable, index) => (
                      <div key={`${variable.key}:${index}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                        <input
                          value={variable.key}
                          onChange={(event) =>
                            onDraftChange((current) =>
                              current
                                ? {
                                    ...current,
                                    builderConfig: {
                                      ...current.builderConfig,
                                      variables: updateVariable(current.builderConfig.variables ?? [], index, { key: event.target.value })
                                    }
                                  }
                                : current
                            )
                          }
                          className="command-card rounded-2xl px-3 py-2 text-sm"
                          placeholder="key"
                        />
                        <input
                          value={variable.defaultValue ?? ""}
                          onChange={(event) =>
                            onDraftChange((current) =>
                              current
                                ? {
                                    ...current,
                                    builderConfig: {
                                      ...current.builderConfig,
                                      variables: updateVariable(current.builderConfig.variables ?? [], index, { defaultValue: event.target.value })
                                    }
                                  }
                                : current
                            )
                          }
                          className="command-card rounded-2xl px-3 py-2 text-sm"
                          placeholder="default value"
                        />
                        <SmallButton
                          label="Remove"
                          tone="danger"
                          onClick={() =>
                            onDraftChange((current) =>
                              current
                                ? {
                                    ...current,
                                    builderConfig: {
                                      ...current.builderConfig,
                                      variables: (current.builderConfig.variables ?? []).filter((_, variableIndex) => variableIndex !== index)
                                    }
                                  }
                                : current
                            )
                          }
                        />
                      </div>
                    ))}
                    <SmallButton
                      label="Add variable"
                      onClick={() =>
                        onDraftChange((current) =>
                          current
                            ? {
                                ...current,
                                builderConfig: {
                                  ...current.builderConfig,
                                  variables: [...(current.builderConfig.variables ?? []), { key: "", label: "", defaultValue: "" }]
                                }
                              }
                            : current
                        )
                      }
                    />
                  </div>
                </Field>

                <Field label="Rule Conditions">
                  <div className="space-y-3">
                    {(draft.builderConfig.workspace?.conditions ?? []).map((condition, index) => (
                      <ConditionRow
                        key={conditionKey(condition, index)}
                        condition={condition}
                        onChange={(patch) => onUpdateCondition(index, patch)}
                        onRemove={() => onRemoveCondition(index)}
                      />
                    ))}
                    {!draft.builderConfig.workspace?.conditions?.length ? <div className="text-sm text-blue-100/58">No global conditions yet.</div> : null}
                    <SmallButton label="Add condition" onClick={onAddCondition} />
                  </div>
                </Field>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

function GoalCard({ goal, active, onClick }: { goal: OfAutomationRegistryEntry; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[26px] border p-4 text-left transition hover:-translate-y-0.5 ${
        active ? "selected-glow border-cyan-300/25 text-white" : "border-blue-400/18 bg-[#091827]/50 text-blue-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{goal.label}</div>
          <div className="mt-1 text-sm leading-6 text-blue-100/72">{goal.description}</div>
        </div>
        {goal.premium ? <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">Premium</span> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-blue-100/60">
        <span className="rounded-full border border-blue-400/20 px-2 py-1">{stringRegistryValue(goal.metadata.trigger_event_type, goal.category ?? "Event")}</span>
        <span className="rounded-full border border-blue-400/20 px-2 py-1">{goal.category ?? "General"}</span>
        <span className="rounded-full border border-blue-400/20 px-2 py-1">{numberRegistryValue(goal.metadata.cooldown_hours, 0)}h cooldown</span>
      </div>
    </button>
  );
}

function StyleCard({ style, active, onClick }: { style: OfAutomationRegistryEntry; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[26px] border p-4 text-left transition hover:-translate-y-0.5 ${
        active ? "selected-glow border-cyan-300/25 text-white" : "border-blue-400/18 bg-[#091827]/50 text-blue-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{style.label}</div>
          <div className="mt-1 text-sm leading-6 text-blue-100/72">{style.description}</div>
        </div>
        {style.premium ? <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">Premium</span> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-blue-100/60">
        <span className="rounded-full border border-blue-400/20 px-2 py-1">{humanizeAiMode(stringRegistryValue(style.metadata.ai_mode, "draft_only") as ScriptAiMode)}</span>
        <span className="rounded-full border border-blue-400/20 px-2 py-1">{humanizeApprovalMode(stringRegistryValue(style.metadata.approval_mode, "always_approve") as ScriptApprovalMode)}</span>
      </div>
    </button>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-blue-400/14 px-3 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">{label}</div>
      <div className="mt-1 text-sm text-blue-50">{value}</div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-blue-400/14 px-3 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">{label}</div>
      <div className="max-w-[70%] text-right text-blue-50">{value}</div>
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-blue-100/62">{label}</div>
      {children}
    </label>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: typeof FileText; label: string; value: string; detail: string }) {
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

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof Sparkles; title: string; subtitle: string }) {
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

function filteredScripts(workspace: ScriptsWorkspaceData, search: string, creatorFilter: string, libraryFilter: "active" | "inactive" | "archived" | "all") {
  const query = search.trim().toLowerCase();
  return workspace.scripts.filter((script) => {
    const workspaceConfig = script.builder_config?.workspace ?? defaultWorkspaceConfig();
    const archived = Boolean(workspaceConfig.archivedAt);
    const matchesCreator = creatorFilter === "all" ? true : script.creator_id === creatorFilter;
    const matchesSearch = !query
      ? true
      : [script.name, script.description ?? "", script.category ?? "", script.folder_name ?? "", ...(script.tags ?? []), script.of_creators?.display_name ?? "", script.of_creators?.username ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query);
    const matchesView =
      libraryFilter === "all"
        ? true
        : libraryFilter === "archived"
          ? archived
          : libraryFilter === "active"
            ? !archived && script.status === "active"
            : !archived && script.status === "inactive";
    return matchesCreator && matchesSearch && matchesView;
  });
}

function toDraft(script: OfMessageScript): ScriptDraft {
  return {
    id: script.id,
    creatorId: script.creator_id,
    name: script.name,
    description: script.description ?? "",
    category: script.category ?? "",
    folderName: script.folder_name ?? "",
    status: script.status,
    triggerEventType: script.trigger_event_type,
    tags: [...(script.tags ?? [])],
    cooldownHours: script.cooldown_hours,
    maxSendsPerFan: script.max_sends_per_fan,
    builderConfig: {
      schemaVersion: script.builder_config?.schemaVersion ?? 1,
      variables: [...(script.builder_config?.variables ?? [])],
      workspace: {
        ...defaultWorkspaceConfig(),
        ...script.builder_config?.workspace
      }
    },
    steps: (script.steps ?? []).map((step) => ({
      id: step.id,
      type: step.step_type as DraftStep["type"],
      body: step.message_body ?? "",
      delayMinutes: step.delay_minutes ?? 0,
      nextStepId: step.next_step_id ?? "",
      fallbackStepId: step.fallback_step_id ?? "",
      metadata: {
        ...defaultStepMetadata(step.step_type as DraftStep["type"]),
        ...(step.metadata ?? {})
      }
    }))
  };
}

function toTemplate(draft: ScriptDraft): MessageScriptTemplate {
  return {
    name: draft.name.trim() || "Untitled Script",
    description: draft.description.trim(),
    triggerEventType: draft.triggerEventType || "manual",
    autoSendEnabled: draft.builderConfig.workspace?.ai?.mode === "auto_send",
    requiresApproval: draft.builderConfig.workspace?.approval?.mode !== "never_approve",
    actionMode: draft.builderConfig.workspace?.ai?.mode === "auto_send" ? "auto_send" : "draft_for_approval",
    cooldownHours: draft.cooldownHours,
    maxSendsPerFan: draft.maxSendsPerFan,
    folderName: draft.folderName.trim(),
    category: draft.category.trim(),
    tags: draft.tags,
    versionNumber: 1,
    sourceScriptId: null,
    builderConfig: {
      schemaVersion: 1,
      variables: (draft.builderConfig.variables ?? []).filter((item) => item.key.trim()),
      workspace: {
        ...defaultWorkspaceConfig(),
        ...draft.builderConfig.workspace,
        conditions: (draft.builderConfig.workspace?.conditions ?? []).filter((item) => item.key.trim())
      }
    },
    steps: draft.steps.map((step, index) => ({
      id: step.id,
      order: index,
      type: step.type,
      body: requiresBody(step.type) ? step.body : undefined,
      delayMinutes: step.delayMinutes || undefined,
      nextStepId: step.nextStepId || undefined,
      fallbackStepId: step.fallbackStepId || undefined,
      metadata: sanitizeStepMetadata(step.metadata)
    }))
  };
}

function sanitizeStepMetadata(metadata: ScriptBuilderStepMetadata): ScriptBuilderStepMetadata {
  return {
    ...metadata,
    label: metadata.label?.trim() || undefined,
    mediaUrl: metadata.mediaUrl?.trim() || undefined,
    ppvTitle: metadata.ppvTitle?.trim() || undefined,
    notes: metadata.notes?.trim() || undefined,
    stopConditions: (metadata.stopConditions ?? []).filter((item) => item.key.trim())
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

function defaultStepMetadata(type: DraftStep["type"]): ScriptBuilderStepMetadata {
  return {
    label: humanizeStepType(type),
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
    messageGenerationMode: "template",
    stopConditions: []
  };
}

function newScriptTemplate(): MessageScriptTemplate {
  return {
    name: "New Playbook",
    description: "Journey ready for trigger, style, AI enrichment, approval, and simulation.",
    triggerEventType: "manual",
    autoSendEnabled: false,
    requiresApproval: true,
    actionMode: "draft_for_approval",
    cooldownHours: 24,
    maxSendsPerFan: 1,
    folderName: "Journey Library",
    category: "General",
    tags: ["manual", "playbook"],
    versionNumber: 1,
    sourceScriptId: null,
    builderConfig: {
      schemaVersion: 1,
      variables: defaultVariables(),
      workspace: {
        ...defaultWorkspaceConfig(),
        templateKey: "manual_campaign",
        styleKey: "friendly"
      }
    },
    steps: [
      {
        id: tempId(),
        order: 0,
        type: "message",
        body: "Hey {{subscriber_name}}, I wanted to reach out personally.",
        metadata: defaultStepMetadata("message")
      },
      {
        id: tempId(),
        order: 1,
        type: "follow_up",
        body: "Just checking back in to keep the conversation warm.",
        delayMinutes: 180,
        metadata: defaultStepMetadata("follow_up")
      }
    ]
  };
}

function defaultVariables(): ScriptBuilderVariable[] {
  return [
    { key: "subscriber_name", label: "Subscriber Name", defaultValue: "there" },
    { key: "creator_name", label: "Creator Name", defaultValue: "creator" }
  ];
}

function defaultTestRunner(): TestRunnerDraft {
  return {
    creatorId: "",
    eventType: "manual",
    name: "Mason",
    username: "late_night_mason",
    subscriptionStatus: "active",
    renewalState: "current",
    spendLevel: "high",
    lifetimeValue: 180,
    historySummary: "Warm buyer. Replies quickly. Has purchased PPV before and likes direct but playful energy."
  };
}

function defaultAssistantDraft(): AssistantDraft {
  return {
    creatorPersonality: "Playful, premium, and confident",
    boundaries: "Keep it respectful, direct, and safely on-platform",
    writingStyle: "Short lines, clear pacing, and a human rhythm",
    relationshipStyle: "Personal and warm with room for teasing",
    confidenceLevel: "Assured but not pushy",
    audience: "New subscribers and returning fans",
    sellingApproach: "Soft-to-direct depending on the value signal",
    targetOutcome: "A reply, a follow-up, or a clean conversion"
  };
}

function assistantFromDraft(script: OfMessageScript): AssistantDraft {
  return {
    ...defaultAssistantDraft(),
    audience: script.category || "Existing subscribers",
    targetOutcome: script.description || "Keep the conversation moving"
  };
}

function buildAiPreview(assistant: AssistantDraft) {
  return {
    conversation: `${assistant.creatorPersonality}. ${assistant.relationshipStyle}.`,
    opener: `Hey {{subscriber_name}}, ${assistant.writingStyle.toLowerCase()} based on a ${assistant.confidenceLevel.toLowerCase()} voice.`,
    branches: `If interest is high, move toward ${assistant.sellingApproach.toLowerCase()}. If not, keep it light and reopen later.`,
    fallback: `No stress if now is not the right time. ${assistant.boundaries}.`,
    timing: `Use the first follow-up within 2 to 4 hours, then widen the gap if the fan stays quiet.`,
    escalation: `Escalate to human review when the fan signals risk, asks for a boundary exception, or needs VIP handling.`
  };
}

function updateVariable(variables: ScriptBuilderVariable[], index: number, patch: Partial<ScriptBuilderVariable>) {
  const next = [...variables];
  next[index] = { ...next[index], ...patch };
  return next;
}

function requiresBody(type: DraftStep["type"]) {
  return type === "message" || type === "follow_up" || type === "question";
}

function uniqueTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function csv(value: string) {
  return uniqueTags(value.split(","));
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function tempId() {
  return `temp-${Math.random().toString(36).slice(2, 10)}`;
}

function blankCondition(): ScriptBuilderCondition {
  return { source: "relationship", key: "", operator: "gte", value: "" };
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}

function toInt(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

function emptyToNull(value: string) {
  const next = value.trim();
  return next ? next : undefined;
}

function conditionKey(condition: ScriptBuilderCondition, index: number) {
  return `${condition.source}:${condition.key}:${condition.operator}:${index}`;
}

function updateStep(setDraft: Dispatch<SetStateAction<ScriptDraft | null>>, stepId: string, patch: Partial<DraftStep>) {
  setDraft((current) =>
    current
      ? {
          ...current,
          steps: current.steps.map((step) =>
            step.id === stepId
              ? {
                  ...step,
                  ...patch,
                  metadata:
                    "type" in patch && patch.type
                      ? {
                          ...step.metadata,
                          ...defaultStepMetadata(patch.type),
                          label: step.metadata.label ?? humanizeStepType(patch.type)
                        }
                      : step.metadata
                }
              : step
          )
        }
      : current
  );
}

function updateStepMetadata(setDraft: Dispatch<SetStateAction<ScriptDraft | null>>, stepId: string, patch: Partial<ScriptBuilderStepMetadata>) {
  setDraft((current) =>
    current
      ? {
          ...current,
          steps: current.steps.map((step) => (step.id === stepId ? { ...step, metadata: { ...step.metadata, ...patch } } : step))
        }
      : current
  );
}

function addStep(setDraft: Dispatch<SetStateAction<ScriptDraft | null>>) {
  setDraft((current) =>
    current
      ? {
          ...current,
          steps: [
            ...current.steps,
            {
              id: tempId(),
              type: "message",
              body: "",
              delayMinutes: 0,
              nextStepId: "",
              fallbackStepId: "",
              metadata: defaultStepMetadata("message")
            }
          ]
        }
      : current
  );
}

function removeStep(setDraft: Dispatch<SetStateAction<ScriptDraft | null>>, stepId: string) {
  setDraft((current) => (current ? { ...current, steps: current.steps.filter((step) => step.id !== stepId) } : current));
}

function duplicateStep(setDraft: Dispatch<SetStateAction<ScriptDraft | null>>, stepId: string) {
  setDraft((current) => {
    if (!current) return current;
    const step = current.steps.find((item) => item.id === stepId);
    if (!step) return current;
    return {
      ...current,
      steps: [...current.steps, { ...step, id: tempId(), metadata: { ...step.metadata, label: `${step.metadata.label ?? humanizeStepType(step.type)} Copy` } }]
    };
  });
}

function moveStep(setDraft: Dispatch<SetStateAction<ScriptDraft | null>>, stepId: string, direction: -1 | 1) {
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

function addStepCondition(setDraft: Dispatch<SetStateAction<ScriptDraft | null>>, stepId: string) {
  setDraft((current) =>
    current
      ? {
          ...current,
          steps: current.steps.map((step) =>
            step.id === stepId ? { ...step, metadata: { ...step.metadata, stopConditions: [...(step.metadata.stopConditions ?? []), blankCondition()] } } : step
          )
        }
      : current
  );
}

function updateStepCondition(
  setDraft: Dispatch<SetStateAction<ScriptDraft | null>>,
  stepId: string,
  conditionIndex: number,
  patch: Partial<ScriptBuilderCondition>
) {
  setDraft((current) =>
    current
      ? {
          ...current,
          steps: current.steps.map((step) => {
            if (step.id !== stepId) return step;
            const stopConditions = [...(step.metadata.stopConditions ?? [])];
            stopConditions[conditionIndex] = { ...stopConditions[conditionIndex], ...patch };
            return { ...step, metadata: { ...step.metadata, stopConditions } };
          })
        }
      : current
  );
}

function removeStepCondition(setDraft: Dispatch<SetStateAction<ScriptDraft | null>>, stepId: string, conditionIndex: number) {
  setDraft((current) =>
    current
      ? {
          ...current,
          steps: current.steps.map((step) => {
            if (step.id !== stepId) return step;
            const stopConditions = [...(step.metadata.stopConditions ?? [])];
            stopConditions.splice(conditionIndex, 1);
            return { ...step, metadata: { ...step.metadata, stopConditions } };
          })
        }
      : current
  );
}

function updateWorkspace(setDraft: Dispatch<SetStateAction<ScriptDraft | null>>, patch: Partial<NonNullable<ScriptDraft["builderConfig"]["workspace"]>>) {
  setDraft((current) =>
    current
      ? {
          ...current,
          builderConfig: {
            ...current.builderConfig,
            workspace: {
              ...defaultWorkspaceConfig(),
              ...current.builderConfig.workspace,
              ...patch
            }
          }
        }
      : current
  );
}

function updateCondition(setDraft: Dispatch<SetStateAction<ScriptDraft | null>>, index: number, patch: Partial<ScriptBuilderCondition>) {
  setDraft((current) => {
    if (!current) return current;
    const conditions = [...(current.builderConfig.workspace?.conditions ?? [])];
    conditions[index] = { ...conditions[index], ...patch };
    return {
      ...current,
      builderConfig: {
        ...current.builderConfig,
        workspace: {
          ...defaultWorkspaceConfig(),
          ...current.builderConfig.workspace,
          conditions
        }
      }
    };
  });
}

function addCondition(setDraft: Dispatch<SetStateAction<ScriptDraft | null>>) {
  setDraft((current) => {
    if (!current) return current;
    return {
      ...current,
      builderConfig: {
        ...current.builderConfig,
        workspace: {
          ...defaultWorkspaceConfig(),
          ...current.builderConfig.workspace,
          conditions: [...(current.builderConfig.workspace?.conditions ?? []), blankCondition()]
        }
      }
    };
  });
}

function removeCondition(setDraft: Dispatch<SetStateAction<ScriptDraft | null>>, index: number) {
  setDraft((current) => {
    if (!current) return current;
    const conditions = [...(current.builderConfig.workspace?.conditions ?? [])];
    conditions.splice(index, 1);
    return {
      ...current,
      builderConfig: {
        ...current.builderConfig,
        workspace: {
          ...defaultWorkspaceConfig(),
          ...current.builderConfig.workspace,
          conditions
        }
      }
    };
  });
}

function eventTypeOptions() {
  return [
    { value: "subscriber_created", label: "New Subscriber" },
    { value: "trial_subscriber", label: "Trial Subscriber" },
    { value: "subscription_renewal", label: "Subscription Renewal" },
    { value: "subscription_expired", label: "Subscription Expired" },
    { value: "resubscribed", label: "Resubscribed" },
    { value: "ppv_purchased", label: "PPV Purchased" },
    { value: "tip_received", label: "Tip Received" },
    { value: "high_spender", label: "High Spend Threshold" },
    { value: "custom_content_purchased", label: "Custom Content Purchased" },
    { value: "tracked_link_click", label: "Tracked Link Click" },
    { value: "landing_page_conversion", label: "Landing Page Conversion" },
    { value: "external_campaign", label: "External Campaign" },
    { value: "mass_message_response", label: "Mass Message Response" },
    { value: "new_conversation", label: "New Conversation" },
    { value: "reply_to_automation", label: "Reply to Automation" },
    { value: "reply_to_creator", label: "Reply to Creator" },
    { value: "reply_after_inactivity", label: "Reply after Inactivity" },
    { value: "existing_conversation", label: "Existing Conversation Continues" },
    { value: "creator_initiated_chat", label: "Creator Initiated Chat" },
    { value: "agency_initiated_chat", label: "Agency Initiated Chat" },
    { value: "manual_assignment", label: "Manual Assignment" },
    { value: "ai_reply_approved", label: "AI Reply Approved" },
    { value: "ai_reply_rejected", label: "AI Reply Rejected" },
    { value: "automation_paused", label: "Automation Paused" },
    { value: "automation_resumed", label: "Automation Resumed" },
    { value: "manual", label: "Manual" }
  ];
}

function humanizeTrigger(value: string) {
  const map: Record<string, string> = {
    subscriber_created: "New Subscriber",
    trial_subscriber: "Trial Subscriber",
    subscription_renewal: "Subscription Renewal",
    subscription_expired: "Subscription Expired",
    resubscribed: "Resubscribed",
    ppv_purchased: "PPV Purchased",
    tip_received: "Tip Received",
    high_spender: "High Spend Threshold",
    custom_content_purchased: "Custom Content Purchased",
    tracked_link_click: "Tracked Link Click",
    landing_page_conversion: "Landing Page Conversion",
    external_campaign: "External Campaign",
    mass_message_response: "Mass Message Response",
    new_conversation: "New Conversation",
    reply_to_automation: "Reply to Automation",
    reply_to_creator: "Reply to Creator",
    reply_after_inactivity: "Reply after Inactivity",
    existing_conversation: "Existing Conversation Continues",
    creator_initiated_chat: "Creator Initiated Chat",
    agency_initiated_chat: "Agency Initiated Chat",
    manual_assignment: "Manual Assignment",
    ai_reply_approved: "AI Reply Approved",
    ai_reply_rejected: "AI Reply Rejected",
    automation_paused: "Automation Paused",
    automation_resumed: "Automation Resumed",
    manual: "Manual"
  };
  return map[value] ?? value.replaceAll("_", " ");
}

function humanizeExecution(value?: ScriptExecutionMode) {
  return executionOptions.find((option) => option.value === value)?.label ?? "Immediate";
}

function humanizeAiMode(value?: ScriptAiMode) {
  return aiOptions.find((option) => option.value === value)?.label ?? "Draft only";
}

function humanizeApprovalMode(value?: ScriptApprovalMode) {
  return approvalOptions.find((option) => option.value === value)?.label ?? "Always approve";
}

function humanizeStepType(value: DraftStep["type"]) {
  return value.replaceAll("_", " ");
}

function registryEntryLabel(entries: OfAutomationRegistryEntry[], key: string, fallback: string) {
  return entries.find((entry) => entry.registry_key === key)?.label ?? fallback;
}

function stringRegistryValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberRegistryValue(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringRegistryStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function registryPreviewSteps(goal: OfAutomationRegistryEntry, current: ScriptDraft) {
  const previewSteps = goal.metadata.preview_steps;
  if (!Array.isArray(previewSteps) || !previewSteps.length) return current.steps;

  return previewSteps.map((step, index) => {
    const record = step !== null && typeof step === "object" && !Array.isArray(step) ? (step as Record<string, unknown>) : {};
    const type = isDraftStepType(record.type) ? record.type : "message";
    return {
      id: current.steps[index]?.id ?? tempId(),
      type,
      body: typeof record.body === "string" ? record.body : "",
      delayMinutes: typeof record.delayMinutes === "number" ? record.delayMinutes : 0,
      nextStepId: current.steps[index]?.nextStepId ?? "",
      fallbackStepId: current.steps[index]?.fallbackStepId ?? "",
      metadata: defaultStepMetadata(type)
    };
  });
}

function isDraftStepType(value: unknown): value is DraftStep["type"] {
  return value === "message" || value === "follow_up" || value === "question" || value === "wait" || value === "branch" || value === "set_variable" || value === "end";
}

function scriptBadgeTone(script: OfMessageScript, archivedAt?: string | null) {
  if (archivedAt) return "bg-amber-500/12 text-amber-200";
  if (script.status === "active") return "bg-emerald-500/14 text-emerald-200";
  return "bg-blue-400/12 text-blue-100";
}

function buildStats(scripts: OfMessageScript[]) {
  return scripts.reduce(
    (acc, script) => {
      const workspaceConfig = script.builder_config?.workspace ?? defaultWorkspaceConfig();
      acc.total += 1;
      if (workspaceConfig.archivedAt) acc.archived += 1;
      else if (script.status === "active") acc.active += 1;
      if ((workspaceConfig.execution?.mode ?? "immediate") === "manual_only") acc.manualOnly += 1;
      if (script.category && ["Revenue", "Customs"].includes(script.category)) acc.revenue += 1;
      if (workspaceConfig.templateKey) acc.seeded += 1;
      return acc;
    },
    { total: 0, active: 0, archived: 0, manualOnly: 0, revenue: 0, seeded: 0 }
  );
}

function matchesGoal(goal: GoalCardDefinition, draft: ScriptDraft) {
  return draft.triggerEventType === goal.triggerEventType && draft.category === goal.category;
}

function matchesStyle(style: StyleCardDefinition, draft: ScriptDraft) {
  return draft.builderConfig.workspace?.ai?.mode === style.aiMode && draft.builderConfig.workspace?.approval?.mode === style.approvalMode;
}

function humanizeGoal(goal: GoalCardDefinition) {
  return goal.title;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected scripts workspace error";
}
