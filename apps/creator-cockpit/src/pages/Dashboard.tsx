import { AlertTriangle, ArrowUpRight, Bot, Clock3, ClipboardList, DollarSign, HeartPulse, Plus, Sparkles } from "lucide-react";
import { MetricTile } from "../components/MetricTile";
import type { DashboardData } from "../lib/api";

export function Dashboard({
  data,
  onOpenCreator,
  onOpenSubscribers,
  onConnectCreator
}: {
  data: DashboardData;
  onOpenCreator: (id: string) => void;
  onOpenSubscribers: (filters: Record<string, string>) => void;
  onConnectCreator: () => void;
}) {
  const latestSnapshot = data.snapshots[0];
  const now = Date.now();
  const openTasks = data.tasks.filter((task) => isActiveTask(task.status)).length;
  const urgentTasks = data.tasks.filter((task) => isActiveTask(task.status) && task.priority_score >= 85).length;
  const overdueTasks = data.tasks.filter((task) => task.due_at && new Date(task.due_at).getTime() < now && isActiveTask(task.status)).length;
  const topSubscribers = [...data.relationships].sort((left, right) => subscriberPriorityScore(right) - subscriberPriorityScore(left)).slice(0, 5);

  return (
    <main className="space-y-6 animate-in-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white">Dashboard</h2>
          <p className="mt-1 text-sm text-blue-100/58">Operational status, task pressure, and the next creator move.</p>
        </div>
        <button type="button" onClick={onConnectCreator} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_0_1px_rgba(34,211,238,0.15)] hover:bg-cyan-300">
          <Plus className="h-4 w-4" aria-hidden="true" />
          + Connect Creator
        </button>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="glass-panel overflow-hidden rounded-2xl p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-sm font-semibold text-cyan-200">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Morning Brief
              </div>
              <h2 className="mt-4 text-3xl font-semibold text-white">{data.morningBrief.headline}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/68">{data.morningBrief.summary}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MetricTile label="Missed Revenue" value={`$${data.morningBrief.missed_revenue.toLocaleString()}`} icon={DollarSign} />
                <MetricTile label="Overdue Welcomes" value={String(data.morningBrief.overdue_welcome_conversations)} icon={Clock3} />
                <MetricTile label="Provider" value={data.morningBrief.provider} icon={Bot} />
              </div>
            </div>
            <div className="rounded-2xl border border-pink-300/20 bg-pink-400/10 px-4 py-3 text-right">
              <div className="text-sm font-medium text-pink-100/75">Highest Priority</div>
              <div className="mt-1 text-2xl font-semibold text-pink-200">{data.morningBrief.highest_priority_subscriber}</div>
              <div className="mt-2 text-xs leading-5 text-pink-100/78">{data.morningBrief.highest_priority_reason}</div>
            </div>
          </div>
        </div>

        <div className="premium-card rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Today&apos;s Focus</h2>
              <p className="mt-1 text-sm text-blue-100/62">One click into the right subscriber slice.</p>
            </div>
            <HeartPulse className="h-5 w-5 text-cyan-300" aria-hidden="true" />
          </div>
          <div className="mt-4 grid gap-3">
            {data.dailyFocusQueue.map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => onOpenSubscribers(card.filter)}
                className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/70 p-4 text-left transition hover:border-cyan-300/30 hover:bg-[#102338]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl" aria-hidden="true">
                      {card.emoji}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-white">{card.title}</div>
                      <div className="text-xs text-blue-100/54">{card.description}</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-sm font-semibold text-cyan-200">{card.count}</span>
                </div>
                <div className="mt-2 text-xs leading-5 text-blue-100/58">{card.reason}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr_0.8fr]">
        <div className="premium-card rounded-2xl">
          <div className="border-b border-blue-500/20 px-4 py-4">
            <h2 className="text-base font-semibold text-white">Creator Health</h2>
            <p className="mt-1 text-sm text-blue-100/58">Operational load by creator.</p>
          </div>
          <div className="divide-y divide-blue-500/10">
            {data.creators.map((creator) => (
              <button
                key={creator.id}
                type="button"
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-[#1A3655]/55"
                onClick={() => onOpenCreator(creator.id)}
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-white">{creator.display_name || creator.username}</div>
                  <div className="text-sm text-blue-100/58">@{creator.username}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium text-cyan-200">{latestSnapshot?.active_subscribers.toLocaleString() ?? 0} active</div>
                  <div className="text-blue-100/58">{creatorTaskSummary(data.tasks, creator.id)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="premium-card rounded-2xl">
          <div className="border-b border-blue-500/20 px-4 py-4">
            <h2 className="text-base font-semibold text-white">Top Subscriber Briefs</h2>
            <p className="mt-1 text-sm text-blue-100/58">Who deserves the next operator minute.</p>
          </div>
          <div className="space-y-3 p-4">
            {topSubscribers.map((relationship) => (
              <button
                key={relationship.id}
                type="button"
                className="w-full rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/70 p-3 text-left hover:bg-[#102338]"
                onClick={() => onOpenSubscribers({ creator: relationship.creator_id, persona: String(relationship.persona_key ?? "all") })}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={relationship.display_name || relationship.username || relationship.betterfans_subscriber_id} src={relationship.avatar_url ?? undefined} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{relationship.display_name || relationship.username || relationship.betterfans_subscriber_id}</div>
                    <div className="truncate text-xs text-blue-100/54">
                      {relationship.persona_emoji ?? "•"} {relationship.persona_name ?? "Subscriber"}
                    </div>
                    <div className="mt-1 truncate text-xs text-blue-100/54">{relationship.operator_briefing ?? relationship.recommended_next_action ?? "Monitor relationship"}</div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="premium-card rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Workload</h2>
              <p className="mt-1 text-sm text-blue-100/62">The traditional backlog is still here, just not in charge.</p>
            </div>
            <ClipboardList className="h-5 w-5 text-cyan-300" aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-3">
            <MetricTile label="Open Tasks" value={String(openTasks)} icon={ClipboardList} />
            <MetricTile label="Urgent Tasks" value={String(urgentTasks)} icon={AlertTriangle} />
            <MetricTile label="Overdue Tasks" value={String(overdueTasks)} icon={Clock3} />
          </div>
          <div className="mt-4 rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/60 p-4">
            <div className="text-sm font-semibold text-white">Active Task Pulse</div>
            <div className="mt-1 text-sm text-blue-100/58">
              {openTasks} active tasks across {data.creators.length} creators. The focus queue should guide the next move.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Avatar({ name, src }: { name: string; src?: string }) {
  if (src) {
    return <img src={src} alt="" className="h-10 w-10 shrink-0 rounded-2xl object-cover ring-1 ring-cyan-300/20" />;
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/40 via-cyan-400/20 to-pink-400/30 text-sm font-bold text-white ring-1 ring-cyan-300/20">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function creatorTaskSummary(tasks: DashboardData["tasks"], creatorId: string) {
  const active = tasks.filter((task) => task.creator_id === creatorId && isActiveTask(task.status)).length;
  return `${active} active tasks`;
}

function subscriberPriorityScore(subscriber: DashboardData["relationships"][number]) {
  return (
    subscriber.urgency_score * 1.2 +
    subscriber.revenue_opportunity_score * 0.9 +
    subscriber.vip_score * 0.7 +
    subscriber.churn_risk * 0.6 +
    subscriber.engagement_score * 0.35 +
    (subscriber.persona_key === "vip" ? 30 : 0) +
    (subscriber.persona_key === "drifting_away" ? 28 : 0) +
    (subscriber.persona_key === "new_fan" ? 18 : 0)
  );
}

function isActiveTask(status: string) {
  return status === "open" || status === "in_progress" || status === "waiting";
}
