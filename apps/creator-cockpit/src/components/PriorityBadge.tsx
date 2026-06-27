import type { TaskPriority } from "@funkmyfans/of-types";

const styles: Record<TaskPriority, string> = {
  low: "bg-blue-400/12 text-blue-100 ring-blue-300/20",
  medium: "bg-cyan-300/14 text-cyan-200 ring-cyan-300/20",
  high: "bg-amber-400/16 text-amber-200 ring-amber-300/20",
  urgent: "bg-rose-400/18 text-rose-200 ring-rose-300/20"
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <span className={`rounded-lg px-2 py-1 text-xs font-semibold ring-1 ${styles[priority]}`}>{priority}</span>;
}
