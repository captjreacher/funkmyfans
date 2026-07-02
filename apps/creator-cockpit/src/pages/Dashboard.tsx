import { ArrowRight, Building2, ClipboardList, Settings2, Sparkles, TestTube2, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DashboardData } from "../lib/api";

export function Dashboard({
  data,
  onOpenCreators,
  onOpenQueue,
  onOpenPlaybooks,
  onOpenSimulations,
  onOpenSettings
}: {
  data: DashboardData;
  onOpenCreators: () => void;
  onOpenQueue: () => void;
  onOpenPlaybooks: () => void;
  onOpenSimulations: () => void;
  onOpenSettings: () => void;
  onConnectCreator: () => void;
}) {
  const activeCreators = data.creators.filter((creator) => creator.status === "connected").length;
  const creatorsNeedingSync = data.creators.filter((creator) => !creator.last_sync_at || creator.status === "attention" || creator.status === "pending").length;
  const pendingQueueItems = data.tasks.filter((task) => task.status === "open" || task.status === "waiting" || task.status === "in_progress").length;
  const urgentQueueItems = data.tasks.filter((task) => task.priority === "urgent" || task.priority_score >= 85).length;

  return (
    <main className="animate-in-soft space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Creators"
          value={String(activeCreators)}
          detail={`${creatorsNeedingSync} need sync or attention`}
          icon={Users}
          onClick={onOpenCreators}
        />
        <SummaryCard
          title="Agency"
          value={`$${data.morningBrief.missed_revenue.toLocaleString()}`}
          detail="estimated revenue at risk"
          icon={Building2}
          onClick={onOpenPlaybooks}
        />
        <SummaryCard
          title="Queue"
          value={String(pendingQueueItems)}
          detail={`${urgentQueueItems} urgent decisions`}
          icon={ClipboardList}
          onClick={onOpenQueue}
        />
        <SummaryCard
          title="Simulations"
          value={String(data.dailyOperations.automationsMatchedToday)}
          detail="automation matches today"
          icon={TestTube2}
          onClick={onOpenSimulations}
        />
        <SummaryCard
          title="Settings"
          value={data.creators.length ? "Ready" : "Setup"}
          detail="users, providers, billing, API"
          icon={Settings2}
          onClick={onOpenSettings}
        />
      </section>

      <section className="premium-card rounded-lg p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">Agency launchpad</div>
            <h2 className="mt-2 text-xl font-semibold text-white">{data.morningBrief.headline}</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-blue-100/68">{data.morningBrief.summary}</p>
          </div>
          <Sparkles className="h-5 w-5 shrink-0 text-cyan-300" aria-hidden="true" />
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  detail,
  icon: Icon,
  onClick
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="premium-card premium-card-hover rounded-lg p-4 text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">{title}</div>
          <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
          <div className="mt-1 text-sm text-blue-100/62">{detail}</div>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-200">
        Open
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </div>
    </button>
  );
}
