import { AlertTriangle, ArrowUpRight, Bot, Clock3, ClipboardList, DollarSign, HeartPulse, Sparkles, Users, Zap } from "lucide-react";
import { MetricTile } from "../components/MetricTile";
import { PriorityBadge } from "../components/PriorityBadge";
import type { DashboardData } from "../lib/api";
import { getDisplayTaskPriority } from "../lib/taskPriority";

export function Dashboard({ data, onOpenCreator }: { data: DashboardData; onOpenCreator: (id: string) => void }) {
  const latestSnapshot = data.snapshots[0];
  const now = Date.now();
  const openTasks = data.tasks.filter((task) => task.status === "open").length;
  const urgentTasks = data.tasks.filter((task) => getDisplayTaskPriority(task, relationshipForTask(task, data.relationships)).score >= 85 && isActiveTask(task.status)).length;
  const overdueTasks = data.tasks.filter((task) => task.due_at && new Date(task.due_at).getTime() < now && isActiveTask(task.status)).length;
  const activeTasks = data.tasks.filter((task) => isActiveTask(task.status));
  const highUrgencySubscribers = data.relationships.filter((item) => item.urgency_score >= 70).length;
  const vipOpportunities = data.relationships.filter((item) => item.vip_score >= 75 || item.relationship_state === "vip").length;
  const revenueOpportunities = data.relationships.filter((item) => item.revenue_opportunity_score >= 70).length;
  const churnRisks = data.relationships.filter((item) => item.churn_risk >= 70 || item.relationship_state === "at_risk").length;
  const potentialRevenue = Math.round(data.relationships.reduce((sum, item) => sum + ((item.revenue_opportunity_score || 0) / 100) * Math.max(50, item.average_order_value || 80), 0));
  const aiRecommendations = data.relationships.filter((item) => item.ai_confidence_score >= 65 && item.recommended_next_action).length + activeTasks.filter((task) => task.ai_suggestion || task.recommended_action || task.suggested_script).length;
  const topTasks = [...activeTasks].sort((a, b) => getDisplayTaskPriority(b, relationshipForTask(b, data.relationships)).score - getDisplayTaskPriority(a, relationshipForTask(a, data.relationships)).score).slice(0, 5);
  const topRelationships = [...data.relationships]
    .sort((a, b) => b.urgency_score + b.revenue_opportunity_score + b.vip_score + b.churn_risk - (a.urgency_score + a.revenue_opportunity_score + a.vip_score + a.churn_risk))
    .slice(0, 5);

  return (
    <main className="space-y-6 animate-in-soft">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel overflow-hidden rounded-2xl p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-sm font-semibold text-cyan-200">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Morning Brief
              </div>
              <h2 className="mt-4 max-w-2xl text-3xl font-semibold text-white">Start with revenue, risk, and the highest-confidence AI moves.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/68">Your agency has fresh subscriber signals, VIP opportunities, churn warnings, and recommended actions ready for operator review.</p>
            </div>
            <div className="rounded-2xl border border-pink-300/20 bg-pink-400/10 px-4 py-3 text-right">
              <div className="text-sm font-medium text-pink-100/75">Potential Revenue</div>
              <div className="mt-1 text-3xl font-semibold text-pink-200">${potentialRevenue.toLocaleString()}</div>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <BriefMetric label="New Subscribers" value={String(latestSnapshot?.active_subscribers ?? 0)} icon={Users} tone="text-cyan-300" />
            <BriefMetric label="High Urgency" value={String(highUrgencySubscribers)} icon={Zap} tone="text-rose-300" />
            <BriefMetric label="VIP Opportunities" value={String(vipOpportunities)} icon={Sparkles} tone="text-pink-300" />
            <BriefMetric label="Revenue Opportunities" value={String(revenueOpportunities)} icon={DollarSign} tone="text-emerald-300" />
            <BriefMetric label="Churn Risks" value={String(churnRisks)} icon={AlertTriangle} tone="text-amber-300" />
            <BriefMetric label="AI Recommendations" value={String(aiRecommendations)} icon={Bot} tone="text-violet-300" />
            <BriefMetric label="Overdue Tasks" value={String(overdueTasks)} icon={Clock3} tone="text-orange-300" />
          </div>
        </div>

        <div className="premium-card rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Agency Performance</h2>
              <p className="mt-1 text-sm text-blue-100/62">Live workload and response posture.</p>
            </div>
            <HeartPulse className="h-5 w-5 text-cyan-300" aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-3">
            <MetricTile label="Open Tasks" value={String(openTasks)} icon={ClipboardList} />
            <MetricTile label="Urgent Tasks" value={String(urgentTasks)} icon={AlertTriangle} />
            <MetricTile label="Overdue Tasks" value={String(overdueTasks)} icon={Clock3} />
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
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={creator.display_name || creator.username} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">{creator.display_name || creator.username}</div>
                    <div className="text-sm text-blue-100/58">@{creator.username}</div>
                  </div>
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
            <h2 className="text-base font-semibold text-white">Top Opportunities</h2>
            <p className="mt-1 text-sm text-blue-100/58">Highest priority work to move first.</p>
          </div>
          <div className="divide-y divide-blue-500/10">
            {topTasks.map((task) => {
              const displayPriority = getDisplayTaskPriority(task, relationshipForTask(task, data.relationships));
              return (
              <div key={task.id} className="premium-card-hover px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-white">{task.title}</div>
                  <PriorityBadge priority={displayPriority.priority} />
                </div>
                <div className="mt-1 line-clamp-2 text-sm text-blue-100/62">{task.reason ?? task.description}</div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-cyan-300">
                    <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                    {displayPriority.score}/100
                  </span>
                  <span className="text-blue-100/52">{task.due_at ? `Due ${date(task.due_at)}` : date(task.created_at)}</span>
                </div>
              </div>
            );
            })}
          </div>
        </div>

        <div className="premium-card rounded-2xl">
          <div className="border-b border-blue-500/20 px-4 py-4">
            <h2 className="text-base font-semibold text-white">Recent Activity</h2>
            <p className="mt-1 text-sm text-blue-100/58">Signals from events and fans.</p>
          </div>
          <div className="space-y-3 p-4">
            {topRelationships.map((relationship) => (
              <div key={relationship.id} className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/70 p-3">
                <div className="flex items-center gap-3">
                  <Avatar name={relationship.display_name || relationship.username || relationship.betterfans_subscriber_id} src={relationship.avatar_url ?? undefined} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{relationship.display_name || relationship.username || relationship.betterfans_subscriber_id}</div>
                    <div className="truncate text-xs text-blue-100/54">{relationship.recommended_next_action ?? "Monitor relationship"}</div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function BriefMetric({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Users; tone: string }) {
  return (
    <div className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-blue-100/62">{label}</span>
        <Icon className={`h-4 w-4 ${tone}`} aria-hidden="true" />
      </div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
    </div>
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

function relationshipForTask(task: DashboardData["tasks"][number], relationships: DashboardData["relationships"]) {
  if (task.source_type === "subscriber") return relationships.find((item) => item.id === task.source_id || item.subscriber_id === task.subscriber_id);
  return relationships.find((item) => item.subscriber_id === task.subscriber_id);
}

function isActiveTask(status: string) {
  return status === "open" || status === "in_progress" || status === "waiting";
}

function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}
