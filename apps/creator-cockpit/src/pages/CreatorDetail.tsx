import { Bot, ClipboardList, Gauge, Link2, PlaySquare, RefreshCw, Send, Sparkles, UserRound, Users, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CreatorPlaybookProposal, FmfCreatorFyvRelationship, ReadinessSummary, SyncType } from "@funkmyfans/of-types";
import {
  createBuilderDraftFromProposal,
  createPlaybookProposal,
  fetchCreatorDetail,
  fetchCreatorFyvRelationship,
  fetchCreatorIntelligence,
  fetchCreatorPlaybookProposals,
  fetchCreatorReadiness,
  fetchCreatorScripts,
  fetchQueueWorkspace,
  importCreatorIntelligenceFixture,
  inviteCreatorToFyv,
  syncCreatorSection,
  updateTask,
  updatePlaybookProposal,
  type CreatorDetailData,
  type CreatorIntelligenceData,
  type QueueWorkspaceData
} from "../lib/api";
import { PriorityBadge } from "../components/PriorityBadge";

const tabs = ["Profile", "Subscribers", "Queues", "Intelligence", "Playbooks", "Activity"] as const;
type Tab = (typeof tabs)[number];

const syncButtons: Array<{ type: SyncType; label: string }> = [
  { type: "profile", label: "Creator" },
  { type: "subscribers", label: "Subscribers" },
  { type: "chats", label: "Activity" },
  { type: "all", label: "All" }
];

export function CreatorDetail({ creatorId }: { creatorId: string }) {
  const [data, setData] = useState<CreatorDetailData | null>(null);
  const [intelligence, setIntelligence] = useState<CreatorIntelligenceData | null>(null);
  const [playbookProposals, setPlaybookProposals] = useState<CreatorPlaybookProposal[]>([]);
  const [queueWorkspace, setQueueWorkspace] = useState<QueueWorkspaceData | null>(null);
  const [playbooks, setPlaybooks] = useState<Awaited<ReturnType<typeof fetchCreatorScripts>>["scripts"]>([]);
  const [tab, setTab] = useState<Tab>("Profile");
  const [runningSync, setRunningSync] = useState<SyncType | null>(null);
  const [importingFixture, setImportingFixture] = useState(false);
  const [proposalBusy, setProposalBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // FMF-1: FYV relationship state (rendered as a separate card on the Profile tab
  // alongside FYV-1's FyvOnboardingStatus card).
  const [fyvRelationship, setFyvRelationship] = useState<FmfCreatorFyvRelationship | null>(null);
  const [fyvBusy, setFyvBusy] = useState(false);
  // FMF-2: Creator Readiness dashboard (read-only aggregation).
  const [readiness, setReadiness] = useState<ReadinessSummary | null>(null);

  useEffect(() => {
    void refresh();
  }, [creatorId]);

  const latestSnapshot = data?.snapshots[0];
  const openTasks = useMemo(() => data?.tasks.filter((task) => task.status === "open" || task.status === "waiting" || task.status === "in_progress") ?? [], [data]);

  async function refresh() {
    try {
      const [detail, intelligenceResult, proposalsResult, queues, scripts, fyv, readinessResult] = await Promise.all([
        fetchCreatorDetail(creatorId),
        fetchCreatorIntelligence(creatorId).catch(() => null),
        fetchCreatorPlaybookProposals(creatorId).catch(() => ({ proposals: [] })),
        fetchQueueWorkspace({ creatorId }).catch(() => null),
        fetchCreatorScripts(creatorId).catch(() => ({ scripts: [] })),
        fetchCreatorFyvRelationship(creatorId).catch(() => ({ ok: false, relationship: null })),
        fetchCreatorReadiness(creatorId).catch(() => ({ ok: false as const }))
      ]);
      setData(detail);
      setIntelligence(intelligenceResult ?? null);
      setPlaybookProposals(proposalsResult.proposals);
      setQueueWorkspace(queues);
      setPlaybooks(scripts.scripts);
      setFyvRelationship(fyv?.relationship ?? null);
      setReadiness(readinessResult?.readiness ?? null);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load creator workspace");
    }
  }

  // FMF-1: agency Invite action. FMF orchestrates; FYV owns the actual invite
  // delivery. On first click, prompt for the FYV creator id (unless already stored);
  // subsequent clicks are idempotent no-ops (server returns transitioned=false).
  async function handleInviteToFyv() {
    setFyvBusy(true);
    setError(null);
    try {
      let fyvCreatorId = fyvRelationship?.fyv_creator_id ?? undefined;
      if (!fyvCreatorId) {
        const prompted = window.prompt("Enter the FYV creator id to link to this FMF creator:");
        if (!prompted) return;
        fyvCreatorId = prompted.trim();
        if (!fyvCreatorId) return;
      }
      const result = await inviteCreatorToFyv(creatorId, { fyv_creator_id: fyvCreatorId });
      if (result.ok && result.relationship) {
        setFyvRelationship(result.relationship);
      } else {
        setError(result.error ?? "Unable to send FYV invite");
      }
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to send FYV invite");
    } finally {
      setFyvBusy(false);
    }
  }

  async function handleSync(type: SyncType) {
    setRunningSync(type);
    setError(null);
    try {
      const result = await syncCreatorSection(creatorId, type);
      if (result.status === "failed") setError(result.error ?? result.syncRun.error_message ?? "Sync failed");
      await refresh();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Sync failed");
    } finally {
      setRunningSync(null);
    }
  }

  async function handleImportFixture() {
    setImportingFixture(true);
    setError(null);
    try {
      const result = await importCreatorIntelligenceFixture(creatorId);
      setIntelligence(result);
      await refresh();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Unable to import creator intelligence fixture");
    } finally {
      setImportingFixture(false);
    }
  }

  async function handleCreateProposal(opportunityId: string) {
    setProposalBusy(opportunityId);
    setError(null);
    try {
      await createPlaybookProposal(creatorId, opportunityId);
      const proposals = await fetchCreatorPlaybookProposals(creatorId);
      setPlaybookProposals(proposals.proposals);
    } catch (proposalError) {
      setError(proposalError instanceof Error ? proposalError.message : "Unable to create playbook proposal");
    } finally {
      setProposalBusy(null);
    }
  }

  async function handleProposalState(proposalId: string, state: "accepted" | "dismissed") {
    setProposalBusy(proposalId);
    setError(null);
    try {
      await updatePlaybookProposal(proposalId, state);
      const proposals = await fetchCreatorPlaybookProposals(creatorId);
      setPlaybookProposals(proposals.proposals);
    } catch (proposalError) {
      setError(proposalError instanceof Error ? proposalError.message : "Unable to update playbook proposal");
    } finally {
      setProposalBusy(null);
    }
  }

  async function handleCreateBuilderDraft(proposalId: string) {
    setProposalBusy(proposalId);
    setError(null);
    try {
      await createBuilderDraftFromProposal(proposalId);
      const scripts = await fetchCreatorScripts(creatorId);
      setPlaybooks(scripts.scripts);
      setTab("Playbooks");
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : "Unable to create builder draft from proposal");
    } finally {
      setProposalBusy(null);
    }
  }

  async function resolveTask(taskId: string, status: "in_progress" | "completed" | "ignored") {
    await updateTask(taskId, { status });
    await refresh();
  }

  if (!data) {
    return (
      <main className="premium-card rounded-lg p-6 text-sm text-blue-100/68">
        <div className="mb-3 h-4 w-56 rounded-full shimmer" />
        Loading creator workspace...
      </main>
    );
  }

  return (
    <main className="animate-in-soft space-y-4">
      <section className="premium-card rounded-lg p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Creator workspace</div>
            <h1 className="mt-1 text-2xl font-semibold text-white">{data.creator.display_name || data.creator.username}</h1>
            <div className="mt-1 text-sm text-blue-100/58">@{data.creator.username} / {data.creator.status}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {syncButtons.map((button) => (
              <button key={button.type} type="button" onClick={() => void handleSync(button.type)} disabled={runningSync !== null} className="inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50 disabled:opacity-45">
                <RefreshCw className={`h-4 w-4 ${runningSync === button.type ? "animate-spin" : ""}`} aria-hidden="true" />
                Sync {button.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Subscribers" value={String(latestSnapshot?.active_subscribers ?? data.subscribers.length)} icon={Users} />
        <Metric label="Queue Items" value={String(queueWorkspace?.items.length ?? openTasks.length)} icon={ClipboardList} />
        <Metric label="Open Decisions" value={String(openTasks.length)} icon={Bot} />
        <Metric label="Playbooks" value={String(playbooks.length)} icon={PlaySquare} />
        <Metric label="Chats" value={String(data.chats.length)} icon={Send} />
      </section>

      <nav className="premium-card flex gap-1 overflow-x-auto rounded-lg p-1">
        {tabs.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-md px-3 py-2 text-sm font-semibold ${tab === item ? "selected-glow text-white" : "text-blue-100/64 hover:bg-[#1A3655]/55 hover:text-white"}`}>
            {item}
          </button>
        ))}
      </nav>

      {tab === "Profile" ? (
        <ProfileTab
          data={data}
          fyvRelationship={fyvRelationship}
          fyvBusy={fyvBusy}
          onInviteToFyv={handleInviteToFyv}
          readiness={readiness}
        />
      ) : null}
      {tab === "Subscribers" ? <SubscribersTab data={data} /> : null}
      {tab === "Queues" ? <QueuesTab data={data} queueWorkspace={queueWorkspace} onResolve={resolveTask} /> : null}
      {tab === "Intelligence" ? (
        <IntelligenceTab
          data={intelligence}
          proposals={playbookProposals}
          onImportFixture={handleImportFixture}
          importingFixture={importingFixture}
          onCreateProposal={handleCreateProposal}
          onProposalState={handleProposalState}
          onCreateBuilderDraft={handleCreateBuilderDraft}
          proposalBusy={proposalBusy}
        />
      ) : null}
      {tab === "Playbooks" ? <PlaybooksTab playbooks={playbooks} /> : null}
      {tab === "Activity" ? <ActivityTab data={data} /> : null}
    </main>
  );
}

// FMF-2: Creator Readiness dashboard card. Pure display of the ReadinessSummary
// aggregated by GET /api/creators/:id/readiness. NOT a wizard, NOT a profile
// duplicate — one card summarising "Is this creator operationally ready?".
function CreatorReadinessCard({ readiness }: { readiness: ReadinessSummary | null }) {
  if (!readiness) {
    return (
      <section className="premium-card rounded-lg p-4">
        <SectionTitle icon={Gauge} title="Creator readiness" />
        <div className="mt-3 text-sm text-blue-100/58">Readiness snapshot unavailable.</div>
      </section>
    );
  }
  const { readinessScore, readinessStatus, nextAction, betterfans, intelligence, fyvAccess, opportunities, journeys } = readiness;
  return (
    <section className="premium-card rounded-lg p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <SectionTitle icon={Gauge} title="Creator readiness" />
          <div className="mt-2 text-sm text-blue-100/58">Is this creator operationally ready?</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-3xl font-semibold tabular-nums text-white">{readinessScore}%</div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${readinessBadgeTone(readinessStatus)}`}>{readinessStatus}</span>
        </div>
      </div>
      {nextAction ? (
        <div className="mt-3 rounded-md border border-cyan-300/25 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
          Next: {nextAction}
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          All operational checks pass — production ready.
        </div>
      )}
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ReadinessSectionRow
          title="BetterFans"
          status={betterfans.status}
          score={betterfans.score}
          tone={betterfans.status === "Connected" ? "good" : betterfans.status === "Sync Required" ? "warn" : "muted"}
          rows={[
            ["Account", betterfans.betterfans_account_id ?? "not linked"],
            ["Last sync", betterfans.last_sync_at ? formatDate(betterfans.last_sync_at) : "never"],
            ["Profile synced", betterfans.profile_synced ? "yes" : "no"]
          ]}
        />
        <ReadinessSectionRow
          title="FYV Intelligence"
          status={intelligence.status}
          score={intelligence.score}
          tone={intelligence.status === "Imported" ? "good" : intelligence.status === "Out of Date" ? "warn" : "muted"}
          rows={[
            ["Package", intelligence.source_package_reference ?? "not imported"],
            ["Snapshot id", intelligence.latest_snapshot_id ?? "—"],
            ["Imported", intelligence.imported_at ? formatDate(intelligence.imported_at) : "—"]
          ]}
        />
        <ReadinessSectionRow
          title="FYV Access"
          status={fyvAccess.status}
          score={fyvAccess.score}
          tone={fyvAccess.status === "Active" ? "good" : fyvAccess.status === "Accepted" || fyvAccess.status === "Invited" ? "warn" : "muted"}
          rows={[
            ["FYV creator id", fyvAccess.fyv_creator_id ?? "not linked"],
            ["Relationship", fyvAccess.relationship_state],
            ["Invited", fyvAccess.invited_at ? formatDate(fyvAccess.invited_at) : "—"],
            ["Accepted", fyvAccess.accepted_at ? formatDate(fyvAccess.accepted_at) : "—"]
          ]}
        />
        <ReadinessSectionRow
          title="Opportunities"
          status={opportunities.status}
          score={opportunities.score}
          tone={opportunities.status === "Generated" ? "good" : "muted"}
          rows={[
            ["Count", String(opportunities.count)],
            ["Highest confidence", opportunities.highest_confidence != null ? `${opportunities.highest_confidence}` : "—"],
            ["Highest priority", opportunities.highest_priority != null ? `${opportunities.highest_priority}` : "—"]
          ]}
        />
        <ReadinessSectionRow
          title="Journeys"
          status={journeys.status}
          score={journeys.score}
          tone={journeys.status === "Running" ? "good" : journeys.status === "Configured" ? "warn" : "muted"}
          rows={[
            ["Playbooks", String(journeys.playbook_count)],
            ["Journeys", String(journeys.journey_count)],
            ["Active automations", String(journeys.active_automation_count)]
          ]}
        />
      </div>
    </section>
  );
}

function ReadinessSectionRow({
  title,
  status,
  score,
  tone,
  rows
}: {
  title: string;
  status: string;
  score: number;
  tone: "good" | "warn" | "muted";
  rows: Array<[string, string]>;
}) {
  const chip =
    tone === "good"
      ? "bg-emerald-500/14 text-emerald-200"
      : tone === "warn"
        ? "bg-amber-500/14 text-amber-100"
        : "bg-blue-400/12 text-blue-100";
  return (
    <div className="rounded-md border border-blue-500/12 bg-[#0D1B2A]/55 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-white">{title}</div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${chip}`}>{status}</span>
      </div>
      <div className="mt-1 text-xs text-blue-100/58">Score: {score} / 20</div>
      <div className="mt-2 space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-blue-100/58">{label}</span>
            <span className="truncate font-semibold text-white">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function readinessBadgeTone(badge: ReadinessSummary["readinessStatus"]) {
  if (badge === "Production Ready") return "bg-emerald-500/16 text-emerald-200";
  if (badge === "Operational") return "bg-cyan-500/16 text-cyan-200";
  if (badge === "In Progress") return "bg-amber-500/16 text-amber-100";
  return "bg-rose-500/16 text-rose-200";
}

type FyvPackagePointerView = {
  source_product?: string;
  package_reference?: string;
  assessment_reference?: string | null;
  package_state?: string;
  linked_at?: string;
};

function StatusPill({
  label,
  done,
  doneLabel = "✓",
  pendingLabel = "pending"
}: {
  label: string;
  done: boolean;
  doneLabel?: string;
  pendingLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-blue-500/12 bg-[#0D1B2A]/55 px-3 py-2 text-sm">
      <span className="text-blue-100/68">{label}</span>
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${done ? "bg-emerald-500/14 text-emerald-200" : "bg-blue-400/12 text-blue-100"}`}>
        {done ? doneLabel : pendingLabel}
      </span>
    </div>
  );
}

// FYV -> FMF onboarding status. Derived entirely from the EXISTING creator record
// (relationship_state + metadata.fyv_package pointer + onboarding_status). Read-only
// visibility only: it does not rebuild cockpit architecture and adds no new API call.
function FyvOnboardingStatus({ creator }: { creator: CreatorDetailData["creator"] }) {
  const fyvPackage = (creator.metadata as Record<string, unknown> | null | undefined)?.["fyv_package"] as
    | FyvPackagePointerView
    | undefined;
  const relationshipState = creator.relationship_state ?? null;
  const packageLinked = Boolean(fyvPackage?.package_reference);
  const assessmentComplete = Boolean(fyvPackage?.assessment_reference) || packageLinked;
  // Services readiness reuses the existing onboarding_status: "ready" means the
  // operational services are provisioned; anything else is still pending.
  const servicesReady = creator.onboarding_status === "ready";

  return (
    <div className="premium-card rounded-lg p-4">
      <SectionTitle icon={Sparkles} title="FYV onboarding" />
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <StatusPill label="Assessment complete" done={assessmentComplete} />
        <StatusPill label="FYV package linked" done={packageLinked} />
        <ContextRow label="Onboarding" value={relationshipState ?? "not started"} />
        <StatusPill label="Services" done={servicesReady} doneLabel="ready" />
      </div>
      {fyvPackage?.package_reference ? (
        <div className="mt-3 text-xs text-blue-100/56">
          Linked package <span className="text-blue-100/80">{fyvPackage.package_reference}</span>
          {fyvPackage.source_product ? ` · source ${fyvPackage.source_product}` : ""}
        </div>
      ) : (
        <div className="mt-3 text-xs text-blue-100/56">
          No FYV package linked yet. A published FYV package event advances onboarding to accepted.
        </div>
      )}
    </div>
  );
}

// FMF-1: read-only FYV relationship card. FMF is the source of truth for this
// row; clicking Invite calls the FMF worker which in turn calls FYV. No creator-
// facing UI or duplicate invite logic exists here. Complementary to FYV-1's
// FyvOnboardingStatus (which shows intelligence package linkage) — this card
// shows the FMF↔FYV account link + invite lifecycle.
function FyvRelationshipCard({
  relationship,
  creatorDisplayName,
  busy,
  onInvite
}: {
  relationship: FmfCreatorFyvRelationship | null;
  creatorDisplayName: string;
  busy: boolean;
  onInvite: () => Promise<void>;
}) {
  const connected = Boolean(relationship?.fyv_creator_id);
  const state = relationship?.relationship_state ?? "not_linked";
  const inviteDisabled = busy || state === "invited" || state === "accepted" || state === "active";
  const inviteLabel =
    state === "invited"
      ? "Invited"
      : state === "accepted"
        ? "Accepted"
        : state === "active"
          ? "Active"
          : busy
            ? "Inviting…"
            : "Invite to FYV";
  return (
    <section className="premium-card rounded-lg p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <SectionTitle icon={Link2} title="FYV relationship" />
          <div className="mt-2 text-sm text-blue-100/58">
            Creator: <span className="font-semibold text-white">{creatorDisplayName}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void onInvite()}
          disabled={inviteDisabled}
          className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Send className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />
          {inviteLabel}
        </button>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <ContextRow label="FYV" value={connected ? "Connected" : "Not connected"} />
        <ContextRow label="Relationship" value={state} />
        <ContextRow label="FYV creator id" value={relationship?.fyv_creator_id ?? "not linked"} />
        <ContextRow label="Invited" value={relationship?.invited_at ? formatDate(relationship.invited_at) : "—"} />
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <ContextRow label="Accepted" value={relationship?.accepted_at ? formatDate(relationship.accepted_at) : "—"} />
        <ContextRow label="Activated" value={relationship?.activated_at ? formatDate(relationship.activated_at) : "—"} />
      </div>
    </section>
  );
}

function ProfileTab({
  data,
  fyvRelationship,
  fyvBusy,
  onInviteToFyv,
  readiness
}: {
  data: CreatorDetailData;
  fyvRelationship: FmfCreatorFyvRelationship | null;
  fyvBusy: boolean;
  onInviteToFyv: () => Promise<void>;
  readiness: ReadinessSummary | null;
}) {
  const latest = data.snapshots[0];
  return (
    <div className="space-y-4">
      <CreatorReadinessCard readiness={readiness} />
      <FyvOnboardingStatus creator={data.creator} />
      <FyvRelationshipCard
        relationship={fyvRelationship}
        creatorDisplayName={data.creator.display_name || data.creator.username}
        busy={fyvBusy}
        onInvite={onInviteToFyv}
      />
      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="premium-card rounded-lg p-4">
        <SectionTitle icon={UserRound} title="Profile" />
        <div className="mt-4 space-y-2">
          <ContextRow label="Platform" value={data.creator.platform_provider} />
          <ContextRow label="Account" value={data.creator.betterfans_account_id ?? "none"} />
          <ContextRow label="Onboarding" value={data.creator.onboarding_status} />
          <ContextRow label="Connected" value={formatDate(data.creator.connected_at)} />
          <ContextRow label="Last sync" value={formatDate(data.creator.last_sync_at)} />
        </div>
      </div>
      <div className="premium-card rounded-lg p-4">
        <SectionTitle icon={Users} title="Creator health" />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MiniStat label="Revenue" value={money(latest?.revenue ?? 0)} />
          <MiniStat label="Active subscribers" value={String(latest?.active_subscribers ?? data.subscribers.length)} />
          <MiniStat label="Priority chats" value={String(latest?.priority_chat_count ?? data.chats.filter((chat) => chat.priority).length)} />
        </div>
      </div>
      </section>
    </div>
  );
}

function SubscribersTab({ data }: { data: CreatorDetailData }) {
  const subscribers = data.relationships.length ? data.relationships : data.subscribers;
  return (
    <section className="premium-card overflow-hidden rounded-lg">
      <TableHeader columns={["Subscriber", "State", "Spend", "Next action"]} />
      <div className="divide-y divide-blue-500/12">
        {subscribers.slice(0, 80).map((subscriber) => (
          <div key={subscriber.id} className="grid grid-cols-[1.1fr_0.7fr_0.6fr_1.2fr] gap-3 px-4 py-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-semibold text-white">{subscriber.display_name || subscriber.username || "Unknown subscriber"}</div>
              <div className="truncate text-xs text-blue-100/52">@{subscriber.username ?? "unknown"}</div>
            </div>
            <div className="text-blue-100/68">{"relationship_state" in subscriber ? subscriber.relationship_state : subscriber.subscription_status ?? "unknown"}</div>
            <div className="font-semibold text-white">{money("lifetime_spend" in subscriber ? subscriber.lifetime_spend : subscriber.total_spend ?? 0)}</div>
            <div className="truncate text-blue-100/68">{"recommended_next_action" in subscriber ? subscriber.recommended_next_action ?? "No action" : "No action"}</div>
          </div>
        ))}
        {!subscribers.length ? <div className="px-4 py-6 text-sm text-blue-100/58">No subscriber records yet.</div> : null}
      </div>
    </section>
  );
}

function QueuesTab({
  data,
  queueWorkspace,
  onResolve
}: {
  data: CreatorDetailData;
  queueWorkspace: QueueWorkspaceData | null;
  onResolve: (taskId: string, status: "in_progress" | "completed" | "ignored") => void;
}) {
  const queueItems = queueWorkspace?.items ?? [];
  const tasks = data.tasks.filter((task) => task.status === "open" || task.status === "waiting" || task.status === "in_progress");

  return (
    <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="premium-card rounded-lg p-4">
        <SectionTitle icon={ClipboardList} title="Queues" />
        <div className="mt-4 space-y-2">
          {(queueWorkspace?.queues ?? []).map((queue) => (
            <ContextRow key={queue.id} label={queue.label} value={`${queue.active_item_count} active`} />
          ))}
          {!queueWorkspace?.queues.length ? <div className="text-sm text-blue-100/58">No active queues for this creator.</div> : null}
        </div>
      </div>
      <div className="premium-card overflow-hidden rounded-lg">
        <TableHeader columns={["Decision", "Priority", "State", "Actions"]} />
        <div className="divide-y divide-blue-500/12">
          {tasks.map((task) => (
            <div key={task.id} className="grid grid-cols-[1.3fr_0.45fr_0.55fr_0.9fr] items-center gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-semibold text-white">{task.title}</div>
                <div className="truncate text-xs text-blue-100/52">{task.priority_reason ?? task.description ?? "No reason recorded"}</div>
              </div>
              <PriorityBadge priority={task.priority} />
              <div className="text-blue-100/68">{task.status}</div>
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => void onResolve(task.id, "in_progress")} className="rounded-md border border-blue-400/20 px-2 py-1 text-xs font-semibold text-blue-50">Assign</button>
                <button type="button" onClick={() => void onResolve(task.id, "completed")} className="rounded-md bg-cyan-400 px-2 py-1 text-xs font-semibold text-slate-950">Resolve</button>
                <button type="button" onClick={() => void onResolve(task.id, "ignored")} className="rounded-md border border-rose-400/25 px-2 py-1 text-xs font-semibold text-rose-100">Ignore</button>
              </div>
            </div>
          ))}
          {!tasks.length && !queueItems.length ? <div className="px-4 py-6 text-sm text-blue-100/58">No human-required items for this creator.</div> : null}
        </div>
      </div>
    </section>
  );
}

function PlaybooksTab({ playbooks }: { playbooks: Awaited<ReturnType<typeof fetchCreatorScripts>>["scripts"] }) {
  return (
    <section className="premium-card overflow-hidden rounded-lg">
      <TableHeader columns={["Playbook", "Status", "Trigger", "Mode"]} />
      <div className="divide-y divide-blue-500/12">
        {playbooks.map((playbook) => (
          <div key={playbook.id} className="grid grid-cols-[1.2fr_0.55fr_0.8fr_0.8fr] gap-3 px-4 py-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-semibold text-white">{playbook.name}</div>
              <div className="truncate text-xs text-blue-100/52">{playbook.description ?? playbook.category ?? "No description"}</div>
            </div>
            <div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${playbook.status === "active" ? "bg-emerald-500/14 text-emerald-200" : "bg-blue-400/12 text-blue-100"}`}>{playbook.status}</span></div>
            <div className="text-blue-100/68">{playbook.trigger_event_type}</div>
            <div className="text-blue-100/68">{playbook.action_mode}</div>
          </div>
        ))}
        {!playbooks.length ? <div className="px-4 py-6 text-sm text-blue-100/58">No playbooks attached yet.</div> : null}
      </div>
    </section>
  );
}

function IntelligenceTab({
  data,
  proposals,
  onImportFixture,
  importingFixture,
  onCreateProposal,
  onProposalState,
  onCreateBuilderDraft,
  proposalBusy
}: {
  data: CreatorIntelligenceData | null;
  proposals: CreatorPlaybookProposal[];
  onImportFixture: () => Promise<void>;
  importingFixture: boolean;
  onCreateProposal: (opportunityId: string) => Promise<void>;
  onProposalState: (proposalId: string, state: "accepted" | "dismissed") => Promise<void>;
  onCreateBuilderDraft: (proposalId: string) => Promise<void>;
  proposalBusy: string | null;
}) {
  const summary = data?.summary ?? null;
  const latestSnapshot = data?.latest_snapshot ?? null;
  const snapshots = data?.snapshots ?? [];
  const opportunities = data?.opportunities ?? [];
  const proposalsByOpportunity = useMemo(() => {
    const map = new Map<string, CreatorPlaybookProposal[]>();
    for (const proposal of proposals) {
      const existing = map.get(proposal.creator_intelligence_opportunity_projection_id) ?? [];
      existing.push(proposal);
      map.set(proposal.creator_intelligence_opportunity_projection_id, existing);
    }
    return map;
  }, [proposals]);

  return (
    <section className="space-y-4">
      <div className="premium-card rounded-lg p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Creator intelligence</div>
            <h3 className="mt-1 text-2xl font-semibold text-white">Imported FYV intelligence, projected locally.</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/64">
              FMF stores the source snapshot immutably and projects only operational opportunity records. Playbook generation stays out of v1.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onImportFixture()}
            disabled={importingFixture}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${importingFixture ? "animate-spin" : ""}`} aria-hidden="true" />
            Import MoonSiren fixture
          </button>
        </div>
      </div>

      {summary ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Primary vertical" value={summary.primary_vertical} icon={Sparkles} />
          <Metric label="Archetype journey" value={summary.archetype_journey} icon={Users} />
          <Metric label="Derived scenario" value={summary.derived_scenario} icon={Bot} />
          <Metric label="Imported version" value={summary.intelligence_version} icon={PlaySquare} />
        </div>
      ) : (
        <div className="premium-card rounded-lg p-4 text-sm text-blue-100/64">No intelligence snapshot has been imported yet. Use the fixture button to load the local MoonSiren contract sample.</div>
      )}

      {summary ? (
        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="premium-card rounded-lg p-4">
            <SectionTitle icon={ClipboardList} title="Snapshot" />
            <div className="mt-4 space-y-2">
              <ContextRow label="Source product" value={summary.source_product} />
              <ContextRow label="Contract version" value={summary.contract_version} />
              <ContextRow label="Package reference" value={summary.source_package_reference} />
              <ContextRow label="Assessment reference" value={summary.source_assessment_reference} />
              <ContextRow label="Package state" value={summary.package_state} />
              <ContextRow label="Imported at" value={formatDate(summary.imported_at)} />
              <ContextRow label="Superseded at" value={summary.superseded_at ? formatDate(summary.superseded_at) : "active"} />
            </div>
            <div className="mt-4 rounded-md border border-blue-500/12 bg-[#0D1B2A]/55 p-3 text-sm text-blue-100/72">
              {summary.intelligence_summary}
            </div>
          </div>
          <div className="premium-card rounded-lg p-4">
            <SectionTitle icon={Bot} title="Latest imported snapshot" />
            <div className="mt-4 space-y-2">
              <ContextRow label="Snapshot id" value={latestSnapshot?.id ?? "none"} />
              <ContextRow label="Package payload" value={latestSnapshot ? "stored immutably" : "not available"} />
              <ContextRow label="Available opportunities" value={String(opportunities.length)} />
              <ContextRow label="Projection states" value="available / accepted / dismissed" />
            </div>
            <div className="mt-4 rounded-md border border-blue-500/12 bg-[#0D1B2A]/55 p-3 text-sm text-blue-100/64">
              FYV publishes intelligence. FMF keeps the operational projection separate and never generates playbooks from this tab.
            </div>
          </div>
        </section>
      ) : null}

      <section className="premium-card overflow-hidden rounded-lg">
        <TableHeader columns={["Journey", "Opportunity", "Confidence", "Priority", "State", "Proposal", "Rationale"]} />
        <div className="divide-y divide-blue-500/12">
          {opportunities.map((opportunity) => {
            const opportunityProposals = proposalsByOpportunity.get(opportunity.id) ?? [];
            const currentProposal = opportunityProposals.find((proposal) => proposal.proposal_state === "draft") ?? opportunityProposals[0] ?? null;
            const canCreate = opportunity.projection_state === "available";
            return (
              <div key={opportunity.id} className="grid grid-cols-[0.7fr_1fr_0.42fr_0.32fr_0.52fr_0.72fr_1.15fr] items-center gap-3 px-4 py-3 text-sm">
                <div className="text-blue-100/74">{opportunity.journey_type}</div>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-white">{opportunity.title}</div>
                  <div className="truncate text-xs text-blue-100/52">{opportunity.opportunity_type}</div>
                </div>
                <div className="font-semibold text-white">{opportunity.confidence}%</div>
                <div className="text-blue-100/74">{opportunity.priority}</div>
                <div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${projectionStateTone(opportunity.projection_state)}`}>{opportunity.projection_state}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {currentProposal ? (
                    <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${proposalStateTone(currentProposal.proposal_state)}`}>
                      {currentProposal.proposal_state}
                    </span>
                  ) : null}
                  {canCreate ? (
                    <button
                      type="button"
                      onClick={() => void onCreateProposal(opportunity.id)}
                      disabled={proposalBusy === opportunity.id}
                      className="rounded-md bg-cyan-400 px-2.5 py-1.5 text-xs font-semibold text-slate-950 disabled:opacity-45"
                    >
                      {currentProposal ? "Open Draft" : "Create Proposal"}
                    </button>
                  ) : null}
                </div>
                <div className="text-blue-100/64">{opportunity.rationale}</div>
              </div>
            );
          })}
          {!opportunities.length ? <div className="px-4 py-6 text-sm text-blue-100/58">No projected opportunities available yet.</div> : null}
        </div>
      </section>

      <section className="premium-card rounded-lg p-4">
        <SectionTitle icon={PlaySquare} title="Playbook Proposals" />
        <div className="mt-4 space-y-3">
          {proposals.map((proposal) => (
            <ProposalReviewCard
              key={proposal.id}
              proposal={proposal}
              busy={proposalBusy === proposal.id}
              onState={onProposalState}
              onCreateBuilderDraft={onCreateBuilderDraft}
            />
          ))}
          {!proposals.length ? <div className="text-sm text-blue-100/58">No playbook proposals drafted yet.</div> : null}
        </div>
      </section>

      <section className="premium-card overflow-hidden rounded-lg">
        <TableHeader columns={["Imported snapshot", "State", "Imported at", "Superseded at"]} />
        <div className="divide-y divide-blue-500/12">
          {snapshots.map((snapshot) => (
            <div key={snapshot.id} className="grid grid-cols-[1.1fr_0.5fr_0.7fr_0.7fr] gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-semibold text-white">{snapshot.source_package_reference}</div>
                <div className="truncate text-xs text-blue-100/52">{snapshot.intelligence_version}</div>
              </div>
              <div className="text-blue-100/74">{snapshot.package_payload.package_state}</div>
              <div className="text-blue-100/64">{formatDate(snapshot.imported_at)}</div>
              <div className="text-blue-100/64">{snapshot.superseded_at ? formatDate(snapshot.superseded_at) : "active"}</div>
            </div>
          ))}
          {!snapshots.length ? <div className="px-4 py-6 text-sm text-blue-100/58">No imported snapshots yet.</div> : null}
        </div>
      </section>
    </section>
  );
}

function ActivityTab({ data }: { data: CreatorDetailData }) {
  const rows = [
    ...data.syncRuns.map((run) => ({ id: run.id, source: `Sync ${run.sync_type}`, detail: `${run.status} / ${run.records_processed} records`, time: run.completed_at ?? run.started_at })),
    ...data.events.map((event) => ({ id: event.id, source: event.event_type, detail: event.processing_status, time: event.received_at ?? event.created_at })),
    ...data.relationshipTimeline.map((item) => ({ id: item.id, source: item.title, detail: item.detail ?? item.actor, time: item.occurred_at }))
  ].sort((a, b) => String(b.time).localeCompare(String(a.time))).slice(0, 80);

  return (
    <section className="premium-card overflow-hidden rounded-lg">
      <TableHeader columns={["Activity", "Detail", "Time"]} />
      <div className="divide-y divide-blue-500/12">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[1fr_1.2fr_0.8fr] gap-3 px-4 py-3 text-sm">
            <div className="truncate font-semibold text-white">{row.source}</div>
            <div className="truncate text-blue-100/68">{row.detail}</div>
            <div className="text-blue-100/58">{formatDate(row.time)}</div>
          </div>
        ))}
        {!rows.length ? <div className="px-4 py-6 text-sm text-blue-100/58">No activity yet.</div> : null}
      </div>
    </section>
  );
}

function ProposalReviewCard({
  proposal,
  busy,
  onState,
  onCreateBuilderDraft
}: {
  proposal: CreatorPlaybookProposal;
  busy: boolean;
  onState: (proposalId: string, state: "accepted" | "dismissed") => Promise<void>;
  onCreateBuilderDraft: (proposalId: string) => Promise<void>;
}) {
  const payload = proposal.proposal_payload;
  return (
    <article className="rounded-lg border border-blue-500/14 bg-[#0D1B2A]/55 p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-semibold text-white">{proposal.proposal_title}</h4>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${proposalStateTone(proposal.proposal_state)}`}>{proposal.proposal_state}</span>
          </div>
          <div className="mt-1 text-sm text-blue-100/58">{proposal.journey_type} / {proposal.source_opportunity_type} / {payload.confidence}% confidence</div>
          <p className="mt-3 max-w-5xl text-sm leading-6 text-blue-100/72">{payload.rationale}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onState(proposal.id, "accepted")}
            disabled={busy || proposal.proposal_state === "accepted"}
            className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-45"
          >
            Accept Proposal
          </button>
          {proposal.proposal_state === "accepted" ? (
            <button
              type="button"
              onClick={() => void onCreateBuilderDraft(proposal.id)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-45"
            >
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              Create Builder Draft
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void onState(proposal.id, "dismissed")}
            disabled={busy || proposal.proposal_state === "dismissed"}
            className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100 disabled:opacity-45"
          >
            Dismiss Proposal
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-3">
          <InfoBlock title="Entry Trigger" items={[payload.entry_trigger]} />
          <InfoBlock title="Creator Voice" items={payload.creator_voice_notes} />
          <InfoBlock title="Guardrails" items={payload.guardrails} />
          <InfoBlock title="Endpoints" items={payload.endpoints.map((endpoint) => `${endpoint.label}: ${endpoint.description}`)} />
          <InfoBlock title="Source References" items={payload.source_references.map((source) => `${source.kind}: ${source.reference}`)} />
        </div>
        <div className="space-y-3">
          {payload.steps.map((step) => (
            <div key={step.id} className="rounded-lg border border-blue-500/12 bg-[#102338]/55 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">{step.order}. {step.label}</div>
                  <div className="mt-1 text-xs text-blue-100/54">{step.objective}</div>
                </div>
                {step.endpoint_label ? <span className="rounded-full bg-blue-400/12 px-2 py-1 text-xs font-semibold text-blue-100">{step.endpoint_label}</span> : null}
              </div>
              <div className="mt-3 rounded-md border border-blue-500/12 bg-[#0D1B2A]/70 p-3 text-sm leading-6 text-blue-50">{step.message_draft}</div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <InfoBlock title="Responses" items={step.expected_subscriber_response_options} compact />
                <InfoBlock title="Fork Routing" items={step.fork_routing.map((route) => `${route.response_option} -> ${route.route_to}: ${route.note}`)} compact />
              </div>
            </div>
          ))}
          <InfoBlock title="Fork Map" items={payload.forks.map((fork) => `${fork.from_step_id} / ${fork.response_option} -> ${fork.endpoint_label ?? fork.to_step_id}: ${fork.rationale}`)} />
        </div>
      </div>
    </article>
  );
}

function InfoBlock({ title, items, compact = false }: { title: string; items: string[]; compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-blue-500/12 bg-[#102338]/42 ${compact ? "p-2.5" : "p-3"}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200/72">{title}</div>
      <div className="mt-2 space-y-1.5">
        {items.map((item, index) => (
          <div key={`${title}:${index}`} className="text-sm leading-5 text-blue-100/70">{item}</div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="premium-card rounded-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-cyan-300" aria-hidden="true" />
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2 text-base font-semibold text-white">
      <Icon className="h-4 w-4 text-cyan-300" aria-hidden="true" />
      {title}
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-blue-500/12 bg-[#0D1B2A]/55 px-3 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100/54">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function TableHeader({ columns }: { columns: string[] }) {
  return (
    <div className="grid gap-3 border-b border-blue-500/18 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100/52" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
      {columns.map((column) => <div key={column}>{column}</div>)}
    </div>
  );
}

function money(value: number | null | undefined) {
  return `$${Number(value ?? 0).toLocaleString()}`;
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}

function projectionStateTone(state: string) {
  if (state === "available") return "bg-emerald-500/14 text-emerald-200";
  if (state === "accepted") return "bg-cyan-500/14 text-cyan-100";
  if (state === "dismissed") return "bg-slate-500/16 text-slate-100";
  return "bg-blue-400/12 text-blue-100";
}

function proposalStateTone(state: string) {
  if (state === "draft") return "bg-amber-400/14 text-amber-100";
  if (state === "accepted") return "bg-emerald-500/14 text-emerald-200";
  if (state === "dismissed") return "bg-slate-500/16 text-slate-100";
  return "bg-blue-400/12 text-blue-100";
}
