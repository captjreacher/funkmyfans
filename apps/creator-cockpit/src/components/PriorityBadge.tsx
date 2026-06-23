import type { TaskPriority } from "@of-pilot/of-types";

const styles: Record<TaskPriority, string> = {
  low: "bg-stone-100 text-stone-700",
  medium: "bg-sky-100 text-sky-800",
  high: "bg-amber-100 text-amber-900",
  urgent: "bg-rose-100 text-rose-800"
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <span className={`rounded px-2 py-1 text-xs font-semibold ${styles[priority]}`}>{priority}</span>;
}
