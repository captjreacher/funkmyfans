import { CheckCircle2, Clock3, ListChecks, Play, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { OfCreator, OfTask, TaskStatus } from "@of-pilot/of-types";
import { PriorityBadge } from "../components/PriorityBadge";
import { fetchTasks, updateTask } from "../lib/api";

export function Tasks({ creators, initialTasks }: { creators: OfCreator[]; initialTasks: OfTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [creator, setCreator] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [taskType, setTaskType] = useState("all");

  useEffect(() => {
    void refreshTasks();
  }, [creator, priority, status, taskType]);

  const taskTypes = useMemo(() => Array.from(new Set(tasks.map((task) => task.task_type))).sort(), [tasks]);
  const counts = {
    open: tasks.filter((task) => task.status === "open").length,
    in_progress: tasks.filter((task) => task.status === "in_progress").length,
    done: tasks.filter((task) => task.status === "done").length,
    dismissed: tasks.filter((task) => task.status === "dismissed").length
  };

  async function refreshTasks() {
    const result = await fetchTasks({ creator, status, priority, task_type: taskType });
    setTasks(result.tasks);
  }

  async function setTaskStatus(task: OfTask, nextStatus: TaskStatus) {
    const result = await updateTask(task.id, { status: nextStatus });
    setTasks((current) => current.map((item) => (item.id === task.id ? result.task : item)));
  }

  return (
    <main className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CountCard label="Open" value={counts.open} icon={ListChecks} />
        <CountCard label="In Progress" value={counts.in_progress} icon={Play} />
        <CountCard label="Done" value={counts.done} icon={CheckCircle2} />
        <CountCard label="Dismissed" value={counts.dismissed} icon={XCircle} />
      </section>

      <section className="grid gap-3 rounded-md border border-stone-200 bg-white p-3 md:grid-cols-4">
        <select value={creator} onChange={(event) => setCreator(event.target.value)} className="rounded-md border border-stone-200 px-3 py-2 text-sm">
          <option value="all">All creators</option>
          {creators.map((item) => <option key={item.id} value={item.id}>{item.display_name || item.username}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border border-stone-200 px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <select value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-md border border-stone-200 px-3 py-2 text-sm">
          <option value="all">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={taskType} onChange={(event) => setTaskType(event.target.value)} className="rounded-md border border-stone-200 px-3 py-2 text-sm">
          <option value="all">All task types</option>
          {taskTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </section>

      <section className="overflow-hidden rounded-md border border-stone-200 bg-white">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-stone-100 text-stone-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Task</th>
              <th className="px-4 py-3 font-semibold">Creator</th>
              <th className="px-4 py-3 font-semibold">Task Type</th>
              <th className="px-4 py-3 font-semibold">Priority</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Due Date</th>
              <th className="px-4 py-3 font-semibold">Source</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {tasks.map((task) => (
              <tr key={task.id}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-stone-950">{task.title}</div>
                  <div className="mt-1 text-xs text-stone-500">{task.description}</div>
                </td>
                <td className="px-4 py-3 text-stone-700">{creatorName(task, creators)}</td>
                <td className="px-4 py-3 text-stone-700">{task.task_type}</td>
                <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                <td className="px-4 py-3 text-stone-700">{task.status}</td>
                <td className="px-4 py-3 text-stone-700">{date(task.due_at)}</td>
                <td className="px-4 py-3 text-stone-700">{task.source_type}:{task.source_id ?? "none"}</td>
                <td className="px-4 py-3 text-stone-700">{date(task.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <TaskButton label="Mark In Progress" onClick={() => void setTaskStatus(task, "in_progress")} disabled={task.status === "in_progress" || task.status === "done"} />
                    <TaskButton label="Mark Done" onClick={() => void setTaskStatus(task, "done")} disabled={task.status === "done"} />
                    <TaskButton label="Dismiss" onClick={() => void setTaskStatus(task, "dismissed")} disabled={task.status === "dismissed" || task.status === "done"} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function CountCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Clock3 }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-stone-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-stone-950">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-teal-700" aria-hidden="true" />
      </div>
    </div>
  );
}

function TaskButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-45">
      {label}
    </button>
  );
}

function creatorName(task: OfTask, creators: OfCreator[]) {
  if (task.of_creators) return task.of_creators.display_name || task.of_creators.username;
  const creator = creators.find((item) => item.id === task.creator_id);
  return creator?.display_name || creator?.username || "Unknown creator";
}

function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}
