import { CheckCircle2, MessageSquare, Play, RefreshCw, ShieldAlert, Sparkles, UserRoundCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { OfAutomationRun, OfMessageScript, SyncType } from "@funkmyfans/of-types";
import { summarizeEventType } from "@funkmyfans/of-types";
import { MetricTile } from "../components/MetricTile";
import { PriorityBadge } from "../components/PriorityBadge";
import {
  fetchCreatorAutomationRuns,
  fetchCreatorDetail,
  fetchCreatorScripts,
  generateCreatorTasks,
  runEventAutomations,
  syncCreatorSection,
  updateScript,
  updateTask,
  type AutomationRunSummary,
  type CreatorDetailData,
  type TaskGenerationSummary
} from "../lib/api";

const tabs = ["Profile", "Subscribers", "Chats", "Tasks", "Scripts", "Timeline"] as const;
type Tab = (typeof tabs)[number];
const syncButtons: Array<{ type: SyncType; label: string }> = [
  { type: "profile", label: "Sync Creator" },
  { type: "stats", label: "Sync Stats" },
  { type: "subscribers", label: "Sync Subscribers" },
  { type: "chats", label: "Sync Chats" },
  { type: "all", label: "Sync All" }
];

export function CreatorDetail({ creatorId }: { creatorId: string }) {
  const [data, setData] = useState<CreatorDetailData | null>(null);
  const [tab, setTab] = useState<Tab>("Profile");
  const [runningSync, setRunningSync] = useState<SyncType | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [taskGeneration, setTaskGeneration] = useState<TaskGenerationSummary | null>(null);
  const [scripts, setScripts] = useState<OfMessageScript[]>([]);
  const [automationRuns, setAutomationRuns] = useState<OfAutomationRun[]>([]);
  const [automationResult, setAutomationResult] = useState<AutomationRunSummary | null>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);

  useEffect(() => {
    void fetchCreatorDetail(creatorId).then(setData);
    void fetchCreatorScripts(creatorId)
      .then((result) => {
        setScripts(result.scripts);
        setScriptError(null);
      })
      .catch((error: unknown) => {
        console.error("Failed to fetch creator scripts", error);
        setScripts([]);
        setScriptError(errorMessage(error));
      });
    void fetchCreatorAutomationRuns(creatorId).then((result) => setAutomationRuns(result.runs));
  }, [creatorId]);

  if (!data) {
    return <main className="rounded-md border border-stone-200 bg-white p-6 text-stone-600">Loading creator operations...</main>;
  }

  const latest = data.snapshots[0];
  const latestSync = data.syncRuns[0];

  async function handleSync(syncType: SyncType) {
    setRunningSync(syncType);
    setSyncError(null);
    const result = await syncCreatorSection(creatorId, syncType);
    if (result.status === "failed") {
      setSyncError(result.error ?? result.syncRun.error_message ?? "Sync failed");
    }
    const detail = await fetchCreatorDetail(creatorId);
    setData(detail);
    setRunningSync(null);
  }

  async function handleGenerateTasks() {
    setGeneratingTasks(true);
    const result = await generateCreatorTasks(creatorId);
    const detail = await fetchCreatorDetail(creatorId);
    setTaskGeneration(result);
    setData(detail);
    setGeneratingTasks(false);
    setTab("Tasks");
  }

  async function handleTaskStatus(taskId: string, status: "in_progress" | "done" | "dismissed") {
    await updateTask(taskId, { status });
    const detail = await fetchCreatorDetail(creatorId);
    setData(detail);
  }

  async function handleScriptPatch(scriptId: string, patch: Partial<OfMessageScript>) {
    if (!isUuid(scriptId)) {
      const message = `Cannot update script because "${scriptId}" is not a database UUID.`;
      console.error(message);
      setScriptError(message);
      return;
    }

    try {
      await updateScript(scriptId, patch);
      const result = await fetchCreatorScripts(creatorId);
      setScripts(result.scripts);
      setScriptError(null);
    } catch (error) {
      console.error("Failed to update script", error);
      setScriptError(errorMessage(error));
    }
  }

  async function handleRunTestTrigger(script: OfMessageScript) {
    if (!isUuid(script.id)) {
      const message = `Cannot run test trigger because script "${script.id}" is not a database UUID.`;
      console.error(message);
      setScriptError(message);
      return;
    }

    const event = data?.events.find((item) => item.event_type === script.trigger_event_type);
    if (!event) {
      setAutomationResult({ eventId: "none", matched: 0, queued: 0, skipped: 0, errors: [`No ${script.trigger_event_type} event is available for this creator.`] });
      return;
    }

    if (!isUuid(event.id)) {
      const message = `Cannot run test trigger because event "${event.id}" is not a database UUID.`;
      console.error(message);
      setScriptError(message);
      return;
    }

    try {
      const result = await runEventAutomations(event.id);
      const runs = await fetchCreatorAutomationRuns(creatorId);
      setAutomationResult(result);
      setAutomationRuns(runs.runs);
      setScriptError(null);
    } catch (error) {
      console.error("Failed to run script test trigger", error);
      setScriptError(errorMessage(error));
    }
  }

  return (
    <main className="space-y-5">
      <section className="flex flex-col justify-between gap-4 rounded-md border border-stone-200 bg-white p-4 lg:flex-row lg:items-center">
        <div>
          <div className="text-sm font-medium text-teal-700">Creator 360</div>
          <h1 className="mt-1 text-2xl font-semibold text-stone-950">{data.creator.display_name || data.creator.username}</h1>
          <div className="mt-1 text-sm text-stone-500">@{data.creator.username} / {data.creator.status}</div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {syncButtons.map((button) => (
            <button
              key={button.type}
              type="button"
              onClick={() => void handleSync(button.type)}
              disabled={runningSync !== null}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-stone-950 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
              title={button.label}
            >
              <RefreshCw className={`h-4 w-4 ${runningSync === button.type ? "animate-spin" : ""}`} aria-hidden="true" />
              <span>{runningSync === button.type ? "Running" : button.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 md:grid-cols-4">
        <SyncStat label="Status" value={runningSync ? "Running" : latestSync?.status ?? "Pending"} status={latestSync?.status} />
        <SyncStat label="Records Processed" value={String(latestSync?.records_processed ?? 0)} />
        <SyncStat label="Last Sync" value={date(latestSync?.completed_at ?? latestSync?.started_at ?? data.creator.last_sync_at)} />
        <SyncStat label="Sync Type" value={latestSync?.sync_type ?? "none"} />
        {syncError ? <div className="md:col-span-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">{syncError}</div> : null}
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-stone-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-semibold text-stone-950">Agency Task Engine</div>
          <div className="text-sm text-stone-500">Generate deterministic operator work from synced chats, subscribers, and events.</div>
        </div>
        <button
          type="button"
          onClick={() => void handleGenerateTasks()}
          disabled={generatingTasks}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          <RefreshCw className={`h-4 w-4 ${generatingTasks ? "animate-spin" : ""}`} aria-hidden="true" />
          {generatingTasks ? "Generating" : "Generate Tasks"}
        </button>
      </section>

      {taskGeneration ? (
        <section className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 sm:grid-cols-4">
          <Field label="Created" value={String(taskGeneration.created)} />
          <Field label="Skipped" value={String(taskGeneration.skipped)} />
          <Field label="Duplicates" value={String(taskGeneration.duplicates)} />
          <Field label="Errors" value={String(taskGeneration.errors.length)} />
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Subscribers" value={String(latest?.subscribers_count ?? 0)} trend={`${latest?.active_subscribers ?? 0} active`} icon={UserRoundCheck} />
        <MetricTile label="Revenue" value={`$${Number(latest?.revenue ?? 0).toLocaleString()}`} trend="latest snapshot" icon={Sparkles} />
        <MetricTile label="Engagement" value={`${latest?.chat_count ?? 0} chats`} trend={`${latest?.priority_chat_count ?? 0} priority`} icon={MessageSquare} />
        <MetricTile label="Risk" value={riskLabel(latest?.expired_subscribers ?? 0)} trend={`${latest?.expired_subscribers ?? 0} expired`} icon={ShieldAlert} />
      </section>

      <div className="flex gap-1 overflow-x-auto border-b border-stone-200">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`px-3 py-2 text-sm font-semibold ${tab === item ? "border-b-2 border-teal-700 text-teal-800" : "text-stone-500 hover:text-stone-950"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Profile" ? <ProfilePanel data={data} /> : null}
      {tab === "Subscribers" ? <SubscribersPanel data={data} /> : null}
      {tab === "Chats" ? <ChatsPanel data={data} /> : null}
      {tab === "Tasks" ? <TasksPanel data={data} onStatus={handleTaskStatus} /> : null}
      {tab === "Scripts" ? (
        <ScriptsPanel
          scripts={scripts}
          runs={automationRuns}
          result={automationResult}
          error={scriptError}
          onPatch={handleScriptPatch}
          onRunTest={handleRunTestTrigger}
        />
      ) : null}
      {tab === "Timeline" ? <TimelinePanel data={data} /> : null}
    </main>
  );
}

function ProfilePanel({ data }: { data: CreatorDetailData }) {
  return (
    <section className="grid gap-4 rounded-md border border-stone-200 bg-white p-4 md:grid-cols-2">
      <Field label="Username" value={`@${data.creator.username}`} />
      <Field label="Display Name" value={data.creator.display_name || data.creator.username} />
      <Field label="Status" value={data.creator.status} />
      <Field label="Last Sync" value={date(data.creator.last_sync_at)} />
    </section>
  );
}

function SubscribersPanel({ data }: { data: CreatorDetailData }) {
  return (
    <Table
      rows={data.subscribers.map((item) => [
        item.username ?? item.display_name ?? item.betterfans_subscriber_id,
        item.status ?? item.subscription_status ?? "unknown",
        date(item.renewal_date ?? item.renews_at),
        money(item.total_spend)
      ])}
      headers={["Username", "Status", "Renewal Date", "Spend"]}
    />
  );
}

function ChatsPanel({ data }: { data: CreatorDetailData }) {
  return (
    <Table
      rows={data.chats.map((item) => [
        item.fan_username ?? item.fan_display_name ?? item.platform_user_id ?? item.platform_chat_id,
        date(item.last_activity_at ?? item.last_message_at),
        item.unread_count ? String(item.unread_count) : item.unread ? "yes" : "no",
        item.priority ? "priority" : "normal"
      ])}
      headers={["Fan", "Last Activity", "Unread", "Priority"]}
    />
  );
}

function TasksPanel({ data, onStatus }: { data: CreatorDetailData; onStatus: (taskId: string, status: "in_progress" | "done" | "dismissed") => void }) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <TaskGroup title="Open Tasks" tasks={data.tasks.filter((task) => task.status === "open")} onStatus={onStatus} />
      <TaskGroup title="In Progress Tasks" tasks={data.tasks.filter((task) => task.status === "in_progress")} onStatus={onStatus} />
      <TaskGroup title="Completed Tasks" tasks={data.tasks.filter((task) => task.status === "done")} onStatus={onStatus} />
      <TaskGroup title="Dismissed Tasks" tasks={data.tasks.filter((task) => task.status === "dismissed")} onStatus={onStatus} />
    </section>
  );
}

function ScriptsPanel({
  scripts,
  runs,
  result,
  error,
  onPatch,
  onRunTest
}: {
  scripts: OfMessageScript[];
  runs: OfAutomationRun[];
  result: AutomationRunSummary | null;
  error: string | null;
  onPatch: (scriptId: string, patch: Partial<OfMessageScript>) => void;
  onRunTest: (script: OfMessageScript) => void;
}) {
  const invalidScripts = scripts.filter((script) => !isUuid(script.id));

  return (
    <section className="space-y-4">
      {error ? <div className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">{error}</div> : null}
      {invalidScripts.length ? (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          {invalidScripts.length} script action{invalidScripts.length === 1 ? "" : "s"} blocked because the API returned a non-UUID script ID.
        </div>
      ) : null}
      <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-stone-100 text-stone-600">
            <tr>
              {["Script", "Trigger", "Action", "Status", "Auto-send", "Approval", "Cooldown", "Max / Fan", "Actions"].map((header) => (
                <th key={header} className="px-4 py-3 font-semibold">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {scripts.map((script) => (
              <tr key={script.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-semibold text-stone-950">{script.name}</div>
                  <div className="mt-1 text-xs text-stone-400">ID: {script.id}</div>
                  <div className="mt-2 space-y-1 text-xs text-stone-500">
                    {(script.steps ?? []).map((step) => (
                      <div key={step.id}>{step.step_order}. {step.step_type}{step.delay_minutes ? ` / ${step.delay_minutes}m` : ""}: {step.message_body ?? step.condition_value ?? "end"}</div>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-stone-700">{script.trigger_event_type}</td>
                <td className="px-4 py-3 text-stone-700">{script.action_mode}</td>
                <td className="px-4 py-3 text-stone-700">{script.status}</td>
                <td className="px-4 py-3 text-stone-700">{script.auto_send_enabled ? "enabled" : "off"}</td>
                <td className="px-4 py-3 text-stone-700">{script.requires_approval ? "required" : "not required"}</td>
                <td className="px-4 py-3 text-stone-700">{script.cooldown_hours}h</td>
                <td className="px-4 py-3 text-stone-700">{script.max_sends_per_fan}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onPatch(script.id, { status: script.status === "active" ? "inactive" : "active" })} disabled={!isUuid(script.id)} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-45">
                      {script.status === "active" ? "Disable" : "Enable"}
                    </button>
                    <button type="button" onClick={() => onPatch(script.id, { auto_send_enabled: !script.auto_send_enabled })} disabled={!isUuid(script.id)} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-45">
                      Auto-send
                    </button>
                    <button type="button" onClick={() => onPatch(script.id, { requires_approval: !script.requires_approval })} disabled={!isUuid(script.id)} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-45">
                      Approval
                    </button>
                    <button type="button" onClick={() => onPatch(script.id, { action_mode: "task_only", auto_send_enabled: false, requires_approval: true })} disabled={!isUuid(script.id) || script.action_mode === "task_only"} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-45">
                      Task
                    </button>
                    <button type="button" onClick={() => onPatch(script.id, { action_mode: "draft_for_approval", auto_send_enabled: false, requires_approval: true })} disabled={!isUuid(script.id) || script.action_mode === "draft_for_approval"} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-45">
                      Draft
                    </button>
                    <button type="button" onClick={() => onPatch(script.id, { action_mode: "auto_send", auto_send_enabled: true, requires_approval: false })} disabled={!isUuid(script.id) || script.action_mode === "auto_send"} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-45">
                      Send
                    </button>
                    <button type="button" onClick={() => onRunTest(script)} disabled={!isUuid(script.id)} className="inline-flex items-center gap-1 rounded-md bg-teal-700 px-2 py-1 text-xs font-semibold text-white disabled:bg-stone-400">
                      <Play className="h-3 w-3" aria-hidden="true" />
                      Test
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!scripts.length ? <tr><td colSpan={9} className="px-4 py-6 text-stone-500">No scripts configured.</td></tr> : null}
          </tbody>
        </table>
      </div>

      {result ? (
        <section className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 sm:grid-cols-4">
          <Field label="Matched" value={String(result.matched)} />
          <Field label="Queued" value={String(result.queued)} />
          <Field label="Skipped" value={String(result.skipped)} />
          <Field label="Errors" value={result.errors.join("; ") || "none"} />
        </section>
      ) : null}

      <Table
        headers={["Run", "Script", "Fan", "Status", "Started"]}
        rows={runs.map((run) => [
          run.id.slice(0, 8),
          run.of_message_scripts?.name ?? run.script_id,
          run.fan_id,
          run.error_message ? `${run.status}: ${run.error_message}` : run.status,
          date(run.started_at)
        ])}
      />
    </section>
  );
}

function TaskGroup({ title, tasks, onStatus }: { title: string; tasks: CreatorDetailData["tasks"]; onStatus: (taskId: string, status: "in_progress" | "done" | "dismissed") => void }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-4 py-3">
        <h2 className="text-base font-semibold text-stone-950">{title}</h2>
      </div>
      <div className="divide-y divide-stone-100">
        {tasks.map((task) => (
          <div key={task.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-stone-950">{task.title}</div>
                <div className="mt-1 text-sm text-stone-500">{task.description}</div>
                <div className="mt-2 text-xs text-stone-500">Source: {task.source_type}:{task.source_id ?? "none"} / Rule: {task.rule_name}</div>
              </div>
              <PriorityBadge priority={task.priority} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => onStatus(task.id, "in_progress")} disabled={task.status === "in_progress" || task.status === "done"} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-45">
                Mark In Progress
              </button>
              <button type="button" onClick={() => onStatus(task.id, "done")} disabled={task.status === "done"} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-45">
                Mark Done
              </button>
              <button type="button" onClick={() => onStatus(task.id, "dismissed")} disabled={task.status === "dismissed" || task.status === "done"} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-45">
                Dismiss
              </button>
            </div>
          </div>
        ))}
        {!tasks.length ? <div className="p-4 text-sm text-stone-500">No tasks in this state.</div> : null}
      </div>
    </div>
  );
}

function TimelinePanel({ data }: { data: CreatorDetailData }) {
  const syncEvents = data.syncRuns.map((run) => [
    `sync.${run.sync_type}`,
    `${run.status} / ${run.records_processed} records${run.error_message ? ` / ${run.error_message}` : ""}`,
    date(run.completed_at ?? run.started_at)
  ]);
  const betterFansEvents = data.events.map((event) => [
    event.event_type,
    `${summarizeEventType(event.event_type)} / ${event.processing_status}${event.processing_error ? ` / ${event.processing_error}` : ""}`,
    date(event.received_at ?? event.created_at)
  ]);
  const systemEvents = data.snapshots.map((snapshot) => [
    "system.snapshot_created",
    `${snapshot.active_subscribers} active / ${snapshot.chat_count} chats`,
    date(snapshot.created_at)
  ]);

  return <Table rows={[...syncEvents, ...betterFansEvents, ...systemEvents]} headers={["Event", "Detail", "Time"]} />;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-medium text-stone-500">{label}</div>
      <div className="mt-1 text-base font-semibold text-stone-950">{value}</div>
    </div>
  );
}

function SyncStat({ label, value, status }: { label: string; value: string; status?: string }) {
  const Icon = status === "failed" ? XCircle : CheckCircle2;
  return (
    <div>
      <div className="text-sm font-medium text-stone-500">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-base font-semibold text-stone-950">
        {status ? <Icon className={`h-4 w-4 ${status === "failed" ? "text-rose-600" : "text-emerald-600"}`} aria-hidden="true" /> : null}
        <span>{value}</span>
      </div>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead className="bg-stone-100 text-stone-600">
          <tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row) => <tr key={row.join(":")}>{row.map((cell) => <td key={cell} className="px-4 py-3 text-stone-700">{cell}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

function riskLabel(expired: number) {
  if (expired > 100) return "High";
  if (expired > 25) return "Watch";
  return "Stable";
}

function money(value: number | null) {
  return value == null ? "unknown" : `$${value.toLocaleString()}`;
}

function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected script action error";
}
