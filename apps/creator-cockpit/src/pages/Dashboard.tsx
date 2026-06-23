import { AlertTriangle, CheckCircle2, Clock3, ClipboardList } from "lucide-react";
import { MetricTile } from "../components/MetricTile";
import { PriorityBadge } from "../components/PriorityBadge";
import type { DashboardData } from "../lib/api";

export function Dashboard({ data, onOpenCreator }: { data: DashboardData; onOpenCreator: (id: string) => void }) {
  const latestSnapshot = data.snapshots[0];
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const openTasks = data.tasks.filter((task) => task.status === "open").length;
  const urgentTasks = data.tasks.filter((task) => task.priority === "urgent" && task.status !== "done" && task.status !== "dismissed").length;
  const overdueTasks = data.tasks.filter((task) => task.due_at && new Date(task.due_at).getTime() < now && task.status !== "done" && task.status !== "dismissed").length;
  const completedToday = data.tasks.filter((task) => task.status === "done" && task.completed_at?.slice(0, 10) === today).length;

  return (
    <main className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Open Tasks" value={String(openTasks)} icon={ClipboardList} />
        <MetricTile label="Urgent Tasks" value={String(urgentTasks)} icon={AlertTriangle} />
        <MetricTile label="Overdue Tasks" value={String(overdueTasks)} icon={Clock3} />
        <MetricTile label="Completed Today" value={String(completedToday)} icon={CheckCircle2} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-stone-200 bg-white">
          <div className="border-b border-stone-200 px-4 py-3">
            <h2 className="text-base font-semibold text-stone-950">Creators</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {data.creators.map((creator) => (
              <button
                key={creator.id}
                type="button"
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-stone-50"
                onClick={() => onOpenCreator(creator.id)}
              >
                <div>
                  <div className="font-semibold text-stone-950">{creator.display_name || creator.username}</div>
                  <div className="text-sm text-stone-500">@{creator.username}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium text-stone-900">{latestSnapshot?.active_subscribers.toLocaleString() ?? 0} active</div>
                  <div className="text-stone-500">{creatorTaskSummary(data.tasks, creator.id)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-stone-200 bg-white">
          <div className="border-b border-stone-200 px-4 py-3">
            <h2 className="text-base font-semibold text-stone-950">Agency Tasks</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {data.tasks.map((task) => (
              <div key={task.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-stone-950">{task.title}</div>
                  <PriorityBadge priority={task.priority} />
                </div>
                <div className="mt-1 text-sm text-stone-500">{task.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function creatorTaskSummary(tasks: DashboardData["tasks"], creatorId: string) {
  const active = tasks.filter((task) => task.creator_id === creatorId && task.status !== "done" && task.status !== "dismissed").length;
  return `${active} active tasks`;
}
