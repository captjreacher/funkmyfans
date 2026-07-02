import {
  ArrowRight,
  BarChart3,
  Bot,
  ClipboardList,
  PlaySquare,
  Settings2,
  Sparkles,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MetricTile } from "../components/MetricTile";
import type { DashboardData } from "../lib/api";

export function Dashboard({
  data,
  onOpenCreators,
  onOpenQueue,
  onOpenPlaybooks,
  onOpenSimulations,
  onOpenSettings,
  onConnectCreator
}: {
  data: DashboardData;
  onOpenCreators: () => void;
  onOpenQueue: () => void;
  onOpenPlaybooks: () => void;
  onOpenSimulations: () => void;
  onOpenSettings: () => void;
  onConnectCreator: () => void;
}) {
  const openTasks = data.tasks.filter((task) => isActiveTask(task.status)).length;
  const urgentTasks = data.tasks.filter((task) => isActiveTask(task.status) && task.priority_score >= 85).length;
  const overdueTasks = data.tasks.filter((task) => task.due_at && new Date(task.due_at).getTime() < Date.now() && isActiveTask(task.status)).length;
  const connectedCreators = data.creators.filter((creator) => creator.status === "connected").length;
  const creatorsNeedingAttention = data.creators.filter((creator) => creator.status === "attention" || creator.status === "pending").length;

  return (
    <main className="space-y-6 animate-in-soft">
      <section className="glass-panel rounded-[28px] p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-sm font-semibold text-cyan-200">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Agency health
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-white">Dashboard</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/68">
              This workspace is only for orientation. No operational work happens here.
            </p>
          </div>

          <button
            type="button"
            onClick={onConnectCreator}
            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_0_1px_rgba(34,211,238,0.15)] hover:bg-cyan-300"
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            Connect Creator
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Creators Connected" value={String(connectedCreators)} icon={Users} />
          <MetricTile label="Creators Needing Attention" value={String(creatorsNeedingAttention)} icon={Bot} />
          <MetricTile label="Open Queue Items" value={String(openTasks)} icon={ClipboardList} />
          <MetricTile label="Urgent / Overdue" value={`${urgentTasks} / ${overdueTasks}`} icon={BarChart3} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NavCard title="Creators" detail="Search, connect, sync, and inspect a creator workspace." icon={Users} onClick={onOpenCreators} />
        <NavCard title="Queue" detail="Resolve human-required exceptions in a dedicated workspace." icon={ClipboardList} onClick={onOpenQueue} />
        <NavCard title="Playbooks" detail="Build reusable automation with the full-screen wizard." icon={PlaySquare} onClick={onOpenPlaybooks} />
        <NavCard title="Simulations" detail="Validate playbooks before they touch a live creator." icon={Sparkles} onClick={onOpenSimulations} />
        <NavCard title="Settings" detail="Manage users, providers, integrations, billing, API, and flags." icon={Settings2} onClick={onOpenSettings} />
        <NavCard title="Morning Brief" detail={data.morningBrief.summary} icon={ArrowRight} onClick={onOpenQueue} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="premium-card rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Today&apos;s summary</h3>
              <p className="mt-1 text-sm text-blue-100/62">The few numbers the operator needs to know first.</p>
            </div>
            <Sparkles className="h-5 w-5 text-cyan-300" aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MetricTile label="Missed Revenue" value={`$${data.morningBrief.missed_revenue.toLocaleString()}`} icon={Sparkles} />
            <MetricTile label="Overdue Welcomes" value={String(data.morningBrief.overdue_welcome_conversations)} icon={ClipboardList} />
            <MetricTile label="Automations Matched" value={String(data.dailyOperations.automationsMatchedToday)} icon={Bot} />
          </div>
          <div className="mt-4 rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/60 p-4">
            <div className="text-sm font-semibold text-white">{data.morningBrief.headline}</div>
            <div className="mt-2 text-sm leading-6 text-blue-100/68">{data.morningBrief.summary}</div>
          </div>
        </div>

        <div className="premium-card rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Operating posture</h3>
              <p className="mt-1 text-sm text-blue-100/62">Human-first by default.</p>
            </div>
            <Settings2 className="h-5 w-5 text-cyan-300" aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-3">
            <MetricTile label="Drafts Needing Approval" value={String(data.dailyOperations.draftsNeedingApproval)} icon={ClipboardList} />
            <MetricTile label="Failed Sends" value={String(data.dailyOperations.failedSends)} icon={BarChart3} />
            <MetricTile label="Fans Needing Reply" value={String(data.dailyOperations.fansNeedingReply)} icon={Bot} />
          </div>
        </div>
      </section>
    </main>
  );
}

function NavCard({
  title,
  detail,
  icon: Icon,
  onClick
}: {
  title: string;
  detail: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="premium-card premium-card-hover rounded-[24px] p-5 text-left"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-[80%]">
          <div className="text-lg font-semibold text-white">{title}</div>
          <div className="mt-2 text-sm leading-6 text-blue-100/64">{detail}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200">
        Open
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </div>
    </button>
  );
}

function isActiveTask(status: string) {
  return status === "open" || status === "in_progress" || status === "waiting";
}
