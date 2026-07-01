import { AlertCircle, Archive, CheckCircle2, Clock3, ExternalLink, Eye, Inbox, LoaderCircle, MessageSquare, MoreHorizontal, PauseCircle, RotateCcw, Search, ShieldAlert, Sparkles, UserRound, XCircle, type LucideIcon } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { OfCreator, OfSubscriberRelationship, OfTask, TaskPriority, TaskStatus } from "@funkmyfans/of-types";
import { fetchTasks, updateTask } from "../lib/api";
import { getDisplayTaskPriority } from "../lib/taskPriority";

const statuses: Array<{ value: TaskStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting", label: "Waiting" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "ignored", label: "Ignored" },
  { value: "archived", label: "Archived" }
];

export function Tasks({
  creators,
  relationships,
  initialTasks
}: {
  creators: OfCreator[];
  relationships: OfSubscriberRelationship[];
  initialTasks: OfTask[];
}) {
  const [tasks, setTasks] = useState(sortTasks(initialTasks, relationships));
  const [creator, setCreator] = useState("all");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [taskType, setTaskType] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTasks[0]?.id ?? null);
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshTasks();
  }, [creator, status, taskType]);

  const taskTypes = useMemo(() => Array.from(new Set(tasks.map((task) => task.task_type))).sort(), [tasks]);
  const visibleTasks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (!needle) return true;
      const subscriber = subscriberName(task, relationships).toLowerCase();
      return [task.title, task.reason, task.recommended_action, task.rule_name, creatorName(task, creators), subscriber].some((value) => value?.toLowerCase().includes(needle));
    });
  }, [creators, query, relationships, tasks]);
  const selectedTask = visibleTasks.find((task) => task.id === selectedTaskId) ?? visibleTasks[0] ?? null;
  const metrics = taskMetrics(tasks, relationships);

  async function refreshTasks() {
    const result = await fetchTasks({ creator, status, task_type: taskType });
    const nextTasks = sortTasks(result.tasks, relationships);
    setTasks(nextTasks);
    setSelectedTaskId((current) => current ?? nextTasks[0]?.id ?? null);
  }

  async function selectTask(task: OfTask) {
    setSelectedTaskId(task.id);
    if (!task.viewed_at) {
      try {
        const result = await updateTask(task.id, { viewed: true });
        setTasks((current) => sortTasks(current.map((item) => (item.id === task.id ? result.task : item)), relationships));
      } catch (caught) {
        setError(errorMessage(caught));
      }
    }
  }

  async function setTaskStatus(task: OfTask, nextStatus: TaskStatus) {
    setUpdatingTaskId(task.id);
    setError(null);
    try {
      const result = await updateTask(task.id, { status: nextStatus, actor: "operator" });
      setTasks((current) => sortTasks(current.map((item) => (item.id === task.id ? result.task : item)), relationships));
      setSelectedTaskId(result.task.id);
      setOpenMenuTaskId(null);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setUpdatingTaskId(null);
    }
  }

  return (
    <main className="space-y-4 animate-in-soft">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Open" value={metrics.open} icon={Inbox} />
        <Metric label="Completed Today" value={metrics.completedToday} icon={CheckCircle2} />
        <Metric label="Overdue" value={metrics.overdue} icon={Clock3} />
        <Metric label="Revenue Ops" value={metrics.revenue} icon={Sparkles} />
        <Metric label="High Priority" value={metrics.highPriority} icon={ShieldAlert} />
        <Metric label="Avg Response" value={metrics.averageResponse} icon={Eye} />
      </section>

      <section className="command-card grid gap-3 rounded-2xl p-3 lg:grid-cols-[1fr_180px_180px_180px]">
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-blue-500/20 bg-[#0D1B2A]/72 px-3">
          <Search className="h-4 w-4 text-cyan-300" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search queues, creators, subscribers" />
        </label>
        <select value={creator} onChange={(event) => setCreator(event.target.value)} className="rounded-xl border border-blue-500/20 bg-[#0D1B2A]/72 px-3 py-2 text-sm">
          <option value="all">All creators</option>
          {creators.map((item) => <option key={item.id} value={item.id}>{item.display_name || item.username}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus | "all")} className="rounded-xl border border-blue-500/20 bg-[#0D1B2A]/72 px-3 py-2 text-sm">
          {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <select value={taskType} onChange={(event) => setTaskType(event.target.value)} className="rounded-xl border border-blue-500/20 bg-[#0D1B2A]/72 px-3 py-2 text-sm">
          <option value="all">All task types</option>
          {taskTypes.map((type) => <option key={type} value={type}>{labelize(type)}</option>)}
        </select>
      </section>

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-300/24 bg-rose-400/12 px-4 py-3 text-sm font-medium text-rose-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="glass-panel grid min-h-[680px] overflow-hidden rounded-2xl xl:grid-cols-[440px_1fr]">
        <div className="border-b border-blue-500/20 xl:border-b-0 xl:border-r">
          <div className="flex items-center justify-between border-b border-blue-500/20 px-4 py-4">
          <div>
              <h2 className="text-base font-semibold text-white">Queue Inbox</h2>
              <p className="mt-1 text-sm text-blue-100/58">Prioritized by operational urgency and due time.</p>
            </div>
            <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-sm font-semibold text-cyan-200">{visibleTasks.length}</span>
          </div>
          <div className="max-h-[620px] space-y-3 overflow-y-auto p-3">
            {visibleTasks.map((task) => (
              <TaskInboxCard
                key={task.id}
                task={task}
                creators={creators}
                relationships={relationships}
                selected={selectedTask?.id === task.id}
                menuOpen={openMenuTaskId === task.id}
                updating={updatingTaskId === task.id}
                onOpen={() => void selectTask(task)}
                onToggleMenu={() => setOpenMenuTaskId((current) => (current === task.id ? null : task.id))}
                onStatus={(nextStatus) => void setTaskStatus(task, nextStatus)}
              />
            ))}
            {!visibleTasks.length ? <div className="p-6 text-sm text-blue-100/58">No queue items match the current filters.</div> : null}
          </div>
        </div>

        {selectedTask ? (
          <TaskDetail
            task={selectedTask}
            creators={creators}
            relationships={relationships}
            updating={updatingTaskId === selectedTask.id}
            onStatus={(nextStatus) => void setTaskStatus(selectedTask, nextStatus)}
          />
        ) : (
          <div className="flex items-center justify-center p-8 text-sm text-blue-100/58">Select a queue item.</div>
        )}
      </section>
    </main>
  );
}

function TaskInboxCard({
  task,
  creators,
  relationships,
  selected,
  menuOpen,
  updating,
  onOpen,
  onToggleMenu,
  onStatus
}: {
  task: OfTask;
  creators: OfCreator[];
  relationships: OfSubscriberRelationship[];
  selected: boolean;
  menuOpen: boolean;
  updating: boolean;
  onOpen: () => void;
  onToggleMenu: () => void;
  onStatus: (status: TaskStatus) => void;
}) {
  const relationship = relationshipForTask(task, relationships);
  const displayPriority = getDisplayTaskPriority(task, relationship);

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      aria-current={selected}
      className={`group relative block w-full cursor-pointer rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/58 px-4 py-3 text-left premium-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${selected ? "selected-glow" : ""}`}
    >
                <div className="flex items-start gap-3">
                  <SubscriberAvatar name={subscriberName(task, relationships)} src={relationship?.avatar_url ?? undefined} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-white">{task.title}</div>
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-blue-100/58">
                          <span>{creatorName(task, creators)}</span>
                          <span>{subscriberName(task, relationships)}</span>
                        </div>
                      </div>
                      <ScorePill score={displayPriority.score} priority={displayPriority.priority} />
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm text-blue-100/68">{task.reason ?? task.description}</div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                      <span className={`rounded-lg px-2 py-1 font-semibold ${statusTone(task.status)}`}>{labelize(task.status)}</span>
                      <span className={isOverdue(task) ? "font-semibold text-rose-300" : "text-blue-100/52"}>{task.due_at ? `Due ${date(task.due_at)}` : date(task.created_at)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                      <RowActionButton label="Open" icon={Eye} onClick={onOpen} />
                      <LifecycleButton status="in_progress" label="Start" icon={Clock3} task={task} updating={updating} onStatus={onStatus} />
                      <LifecycleButton status="completed" label="Complete" icon={CheckCircle2} task={task} updating={updating} onStatus={onStatus} />
                      <LifecycleButton status="waiting" label="Waiting" icon={PauseCircle} task={task} updating={updating} onStatus={onStatus} />
                      <LifecycleButton status="ignored" label="Ignore" icon={XCircle} task={task} updating={updating} onStatus={onStatus} />
                      <LifecycleButton status="cancelled" label="Cancel" icon={XCircle} task={task} updating={updating} onStatus={onStatus} />
                      {task.status !== "open" ? <LifecycleButton status="open" label="Reopen" icon={RotateCcw} task={task} updating={updating} onStatus={onStatus} /> : null}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleMenu();
                        }}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-blue-500/20 bg-[#071423]/70 px-2 text-xs font-semibold text-blue-50 hover:border-cyan-300/40"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                        More
                      </button>
                    </div>
                  </div>
                </div>

      {menuOpen ? (
        <div
          role="menu"
          aria-label={`Actions for ${task.title}`}
          className="absolute right-3 top-12 z-20 w-48 rounded-2xl border border-blue-500/20 bg-[#071423] p-2 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <MenuItem label="View Details" icon={Eye} onClick={onOpen} />
          <MenuItem label="Start" icon={Clock3} onClick={() => onStatus("in_progress")} disabled={updating || task.status === "in_progress" || task.status === "completed"} />
          <MenuItem label="Complete" icon={CheckCircle2} onClick={() => onStatus("completed")} disabled={updating || task.status === "completed"} />
          <MenuItem label="Waiting" icon={PauseCircle} onClick={() => onStatus("waiting")} disabled={updating || task.status === "waiting" || task.status === "completed"} />
          <MenuItem label="Ignore" icon={XCircle} onClick={() => onStatus("ignored")} disabled={updating || task.status === "ignored" || task.status === "completed"} />
          <MenuItem label="Cancel" icon={XCircle} onClick={() => onStatus("cancelled")} disabled={updating || task.status === "cancelled" || task.status === "completed"} />
          <MenuItem label="Reopen" icon={RotateCcw} onClick={() => onStatus("open")} disabled={updating || task.status === "open"} />
        </div>
      ) : null}
      {updating ? <LoaderCircle className="absolute right-4 top-4 h-4 w-4 animate-spin text-cyan-300" aria-label="Updating task" /> : null}
    </article>
  );
}

function TaskDetail({
  task,
  creators,
  relationships,
  updating,
  onStatus
}: {
  task: OfTask;
  creators: OfCreator[];
  relationships: OfSubscriberRelationship[];
  updating: boolean;
  onStatus: (status: TaskStatus) => void;
}) {
  const subscriber = relationshipForTask(task, relationships);
  const timeline = [...(task.of_task_timeline ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const ai = task.ai_suggestion ?? {};
  const displayPriority = getDisplayTaskPriority(task, subscriber);

  return (
    <div className="min-w-0">
      <div className="border-b border-blue-500/20 px-5 py-4">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div className="flex gap-4">
            <SubscriberAvatar name={subscriberName(task, relationships)} src={subscriber?.avatar_url ?? undefined} large />
            <div>
            <div className="text-sm font-semibold text-cyan-300">{labelize(task.task_type)}</div>
            <h2 className="mt-1 text-xl font-semibold text-white">{task.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-blue-100/58">
              <span>{creatorName(task, creators)}</span>
              <span>{subscriberName(task, relationships)}</span>
              <span>Generated by {task.rule_name}</span>
            </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton label="Start" icon={Clock3} onClick={() => onStatus("in_progress")} disabled={updating || task.status === "in_progress" || task.status === "completed"} />
            <ActionButton label="Waiting" icon={PauseCircle} onClick={() => onStatus("waiting")} disabled={updating || task.status === "waiting" || task.status === "completed"} />
            <ActionButton label="Complete" icon={CheckCircle2} onClick={() => onStatus("completed")} disabled={updating || task.status === "completed"} />
            <ActionButton label="Ignore" icon={XCircle} onClick={() => onStatus("ignored")} disabled={updating || task.status === "ignored" || task.status === "completed"} />
            <ActionButton label="Cancel" icon={XCircle} onClick={() => onStatus("cancelled")} disabled={updating || task.status === "cancelled" || task.status === "completed"} />
            <ActionButton label="Reopen" icon={RotateCcw} onClick={() => onStatus("open")} disabled={updating || task.status === "open"} />
            <ActionButton label="Archive" icon={Archive} onClick={() => onStatus("archived")} disabled={updating || task.status === "archived"} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Panel title="Task">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Priority Score" value={`${displayPriority.score}/100`} />
              <Field label="Priority Label" value={labelize(displayPriority.priority)} />
              <Field label="Confidence" value={`${task.confidence}%`} />
              <Field label="Status" value={labelize(task.status)} />
              <Field label="Creator" value={creatorName(task, creators)} />
              <Field label="Subscriber" value={subscriberName(task, relationships)} />
              <Field label="Due Date" value={date(task.due_at)} />
            </div>
            <div className="mt-4 rounded-xl border border-blue-500/15 bg-[#0D1B2A]/70 p-3 text-sm text-blue-50">
              <span className="font-semibold text-cyan-200">Priority reason: </span>
              {displayPriority.reason}
            </div>
            <p className="mt-4 text-sm leading-6 text-blue-100/72">{task.reason ?? task.description ?? "No reason recorded."}</p>
            <p className="mt-3 text-sm font-medium text-white">{task.recommended_action ?? "Review and resolve this task."}</p>
          </Panel>

          <section className="rounded-2xl border border-cyan-300/24 bg-cyan-300/10 p-5 shadow-[0_0_42px_rgba(34,211,238,.10)]">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              <h3 className="text-base font-semibold text-white">AI Copilot</h3>
            </div>
            <div className="rounded-2xl bg-[#071423]/44 p-4">
              <div className="text-xs font-semibold uppercase text-cyan-200/70">Summary</div>
              <p className="mt-2 text-sm leading-6 text-blue-50">{task.reason ?? task.description ?? "Review subscriber context and choose the next best action."}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Field label="Recommended" value={task.suggested_script ?? String(ai.suggested_script ?? task.recommended_action ?? "Operator review")} />
                <Field label="Suggested Action" value={labelize(task.suggested_action ?? "review_task")} />
                <Field label="Suggested Script" value={task.suggested_script ?? String(ai.suggested_script ?? "none")} />
                <Field label="Confidence" value={`${String(ai.confidence ?? task.confidence)}%`} />
                <Field label="Expected Outcome" value={String(ai.expected_outcome ?? "High engagement")} />
                <Field label="Estimated Conversion" value={String(ai.estimated_conversion ?? "unknown")} />
              </div>
              <div className="mt-4 rounded-xl border border-cyan-300/18 bg-cyan-300/10 p-3 text-sm text-cyan-50">
                {String(ai.suggested_reply ?? "Draft not generated. Use the recommended action as the next operator step.")}
              </div>
            </div>
          </section>

          <Panel title="Evidence">
            <div className="grid gap-2">
              {(task.evidence ?? []).map((item, index) => (
                <div key={`${item.label ?? "evidence"}-${index}`} className="rounded-xl bg-[#0D1B2A]/70 px-3 py-2 text-sm">
                  <span className="font-semibold text-white">{item.label ?? "Evidence"}: </span>
                  <span className="text-blue-100/68">{String(item.value ?? "")}</span>
                </div>
              ))}
              {!task.evidence?.length ? <div className="text-sm text-blue-100/58">No evidence recorded.</div> : null}
            </div>
          </Panel>

          <Panel title="Task Timeline">
            <div className="space-y-3">
              {timeline.map((item) => (
                <div key={item.id} className="border-l-2 border-cyan-300 pl-3">
                  <div className="font-medium text-white">{item.title}</div>
                  <div className="text-sm text-blue-100/58">{item.detail ?? labelize(item.event_type)} / {item.actor} / {date(item.created_at)}</div>
                </div>
              ))}
              {!timeline.length ? <div className="text-sm text-blue-100/58">No activity yet.</div> : null}
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title="Related Subscriber">
            <Field label="Subscriber" value={subscriberName(task, relationships)} />
            <Field label="State" value={subscriber?.relationship_state ? labelize(subscriber.relationship_state) : "unknown"} />
            <Field label="LTV" value={money(subscriber?.lifetime_spend)} />
            <Field label="Urgency" value={subscriber ? `${subscriber.urgency_score}/100` : "unknown"} />
            <Field label="Revenue Opportunity" value={subscriber ? `${subscriber.revenue_opportunity_score}/100` : "unknown"} />
            <Field label="VIP Score" value={subscriber ? `${subscriber.vip_score}/100` : "unknown"} />
            <Field label="Churn Risk" value={subscriber ? `${subscriber.churn_risk}/100` : "unknown"} />
          </Panel>

          <Panel title="Quick Actions">
            <div className="grid gap-2">
              <ActionButton label="Subscriber" icon={UserRound} onClick={() => window.alert("Subscriber workspace is available from the Subscribers navigation.")} />
              <ActionButton label="Open Chat" icon={MessageSquare} onClick={() => window.alert("Chat workspace is not connected yet.")} />
              <ActionButton label="Open Source" icon={ExternalLink} onClick={() => window.alert("Source detail is not connected yet.")} />
            </div>
          </Panel>

          <Panel title="Workflow">
            <Field label="Created" value={date(task.created_at)} />
            <Field label="Started" value={date(task.started_at)} />
            <Field label="Due" value={date(task.due_at)} />
            <Field label="Completed" value={date(task.completed_at)} />
            <Field label="Cooldown Until" value={date(task.cooldown_until)} />
            <Field label="Execution Count" value={String(task.execution_count)} />
          </Panel>

          <Panel title="Linked Source">
            <Field label="Source" value={`${task.source_type}:${task.source_id ?? "none"}`} />
            <Field label="Rule" value={`${task.rule_name} / ${task.rule_version}`} />
            <Field label="Suggested Action" value={labelize(task.suggested_action ?? "review_task")} />
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Inbox }) {
  return (
    <div className="premium-card premium-card-hover rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-blue-100/62">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-cyan-300" aria-hidden="true" />
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="premium-card rounded-2xl p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase text-blue-100/58">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="text-xs font-medium uppercase text-blue-100/52">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function ActionButton({ label, icon: Icon, onClick, disabled }: { label: string; icon: LucideIcon; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-blue-500/20 bg-[#0D1B2A]/72 px-3 text-sm font-semibold text-blue-50 hover:border-cyan-300/40 hover:bg-[#1A3655]/70 disabled:cursor-not-allowed disabled:opacity-45">
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function RowActionButton({ label, icon: Icon, onClick, disabled }: { label: string; icon: LucideIcon; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled) onClick();
      }}
      className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-cyan-300/24 bg-cyan-300/10 px-2 text-xs font-semibold text-cyan-100 hover:border-cyan-300/48 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Icon className={`h-3.5 w-3.5 ${Icon === LoaderCircle ? "animate-spin" : ""}`} aria-hidden="true" />
      {label}
    </button>
  );
}

function LifecycleButton({
  status,
  label,
  icon,
  task,
  updating,
  onStatus
}: {
  status: TaskStatus;
  label: string;
  icon: LucideIcon;
  task: OfTask;
  updating: boolean;
  onStatus: (status: TaskStatus) => void;
}) {
  const disabled = updating || task.status === status || (task.status === "completed" && status !== "open");
  return (
    <RowActionButton
      label={updating ? "Updating" : label}
      icon={updating ? LoaderCircle : icon}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onStatus(status);
      }}
    />
  );
}

function MenuItem({ label, icon: Icon, onClick, disabled }: { label: string; icon: LucideIcon; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-blue-50 hover:bg-[#1A3655]/70 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function ScorePill({ score, priority }: { score: number; priority: TaskPriority }) {
  const tone = score >= 85 ? "bg-rose-400/18 text-rose-200" : score >= 70 ? "bg-amber-400/18 text-amber-200" : "bg-cyan-300/12 text-cyan-200";
  return <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${tone}`}>{score} / {labelize(priority)}</span>;
}

function taskMetrics(tasks: OfTask[], relationships: OfSubscriberRelationship[]) {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const active = tasks.filter((task) => isActiveTask(task.status));
  const completed = tasks.filter((task) => task.status === "completed" && task.completed_at?.slice(0, 10) === today).length;
  const responseTimes = tasks
    .filter((task) => task.started_at)
    .map((task) => Math.max(0, new Date(task.started_at as string).getTime() - new Date(task.created_at).getTime()));
  const avgMs = responseTimes.length ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length : 0;

  return {
    open: tasks.filter((task) => task.status === "open").length,
    completedToday: completed,
    overdue: active.filter((task) => task.due_at && new Date(task.due_at).getTime() < now).length,
    revenue: active.filter((task) => task.task_type.includes("transaction") || task.suggested_action?.includes("offer") || task.suggested_action?.includes("upsell")).length,
    highPriority: active.filter((task) => getDisplayTaskPriority(task, relationshipForTask(task, relationships)).score >= 65).length,
    averageResponse: avgMs ? `${Math.round(avgMs / 36e5)}h` : "n/a"
  };
}

function sortTasks(tasks: OfTask[], relationships: OfSubscriberRelationship[]) {
  return [...tasks].sort((a, b) => {
    const score = getDisplayTaskPriority(b, relationshipForTask(b, relationships)).score - getDisplayTaskPriority(a, relationshipForTask(a, relationships)).score;
    if (score !== 0) return score;
    const dueA = a.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER;
    const dueB = b.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER;
    if (dueA !== dueB) return dueA - dueB;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function relationshipForTask(task: OfTask, relationships: OfSubscriberRelationship[]) {
  if (task.source_type === "subscriber") return relationships.find((item) => item.id === task.source_id || item.subscriber_id === task.subscriber_id);
  return relationships.find((item) => item.subscriber_id === task.subscriber_id);
}

function subscriberName(task: OfTask, relationships: OfSubscriberRelationship[]) {
  const subscriber = relationshipForTask(task, relationships);
  return subscriber?.display_name || subscriber?.username || subscriber?.betterfans_subscriber_id || "No subscriber";
}

function creatorName(task: OfTask, creators: OfCreator[]) {
  if (task.of_creators) return task.of_creators.display_name || task.of_creators.username;
  const creator = creators.find((item) => item.id === task.creator_id);
  return creator?.display_name || creator?.username || "Unknown creator";
}

function statusTone(status: TaskStatus) {
  if (status === "completed") return "bg-emerald-400/16 text-emerald-200";
  if (status === "cancelled" || status === "ignored") return "bg-slate-400/14 text-slate-200";
  if (status === "waiting") return "bg-amber-400/16 text-amber-200";
  if (status === "in_progress") return "bg-cyan-300/14 text-cyan-200";
  if (status === "archived") return "bg-violet-400/14 text-violet-200";
  return "bg-blue-400/12 text-blue-100 ring-1 ring-blue-300/20";
}

function isActiveTask(status: TaskStatus) {
  return status === "open" || status === "in_progress" || status === "waiting";
}

function isOverdue(task: OfTask) {
  return Boolean(task.due_at && isActiveTask(task.status) && new Date(task.due_at).getTime() < Date.now());
}

function labelize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(value: number | null | undefined) {
  return value == null ? "unknown" : `$${value.toLocaleString()}`;
}

function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Task update failed.";
}

function SubscriberAvatar({ name, src, large }: { name: string; src?: string; large?: boolean }) {
  const size = large ? "h-14 w-14 rounded-2xl text-base" : "h-10 w-10 rounded-2xl text-sm";
  if (src) {
    return <img src={src} alt="" className={`${size} shrink-0 object-cover ring-1 ring-cyan-300/24`} />;
  }
  return (
    <div className={`${size} flex shrink-0 items-center justify-center bg-gradient-to-br from-blue-500/45 via-cyan-400/20 to-pink-400/35 font-bold text-white ring-1 ring-cyan-300/24`}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}
