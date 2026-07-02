import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  HeartPulse,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Send,
  UserRoundCheck,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  OfAutomationRun,
  OfMessageScript,
  OfOutboundMessage,
  OfSubscriber,
  OfSubscriberRelationship,
  SyncType,
} from "@funkmyfans/of-types";
import { summarizeEventType } from "@funkmyfans/of-types";
import { MetricTile } from "../components/MetricTile";
import { PriorityBadge } from "../components/PriorityBadge";
import { ScriptBuilderPanel } from "../components/ScriptBuilderPanel";
import {
  fetchOutboundMessages,
  fetchQueueWorkspace,
  fetchCreatorAutomationRuns,
  fetchCreatorDetail,
  fetchCreatorScripts,
  generateCreatorTasks,
  runEventAutomations,
  startSimulation,
  syncCreatorSection,
  updateScript,
  updateOutboundMessage,
  updateTask,
  type SimulationDetailData,
  type QueueWorkspaceData,
  type AutomationRunSummary,
  type CreatorDetailData,
  type TaskGenerationSummary
} from "../lib/api";
import { buildOutboundBuckets as buildCanonicalOutboundBuckets } from "../lib/outboundBuckets";

const tabs = ["Chat Ops", "Profile", "Relationships", "Subscribers", "Chats", "Queues", "Scripts", "Timeline"] as const;
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
  const [queueWorkspace, setQueueWorkspace] = useState<QueueWorkspaceData | null>(null);
  const [outboundMessages, setOutboundMessages] = useState<OfOutboundMessage[]>([]);
  const [simulationPreview, setSimulationPreview] = useState<SimulationDetailData | null>(null);
  const [tab, setTab] = useState<Tab>("Chat Ops");
  const [runningSync, setRunningSync] = useState<SyncType | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [taskGeneration, setTaskGeneration] = useState<TaskGenerationSummary | null>(null);
  const [scripts, setScripts] = useState<OfMessageScript[]>([]);
  const [automationRuns, setAutomationRuns] = useState<OfAutomationRun[]>([]);
  const [automationResult, setAutomationResult] = useState<AutomationRunSummary | null>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedPreviewScriptId, setSelectedPreviewScriptId] = useState<string | null>(null);
  const [selectedPreviewSubscriberId, setSelectedPreviewSubscriberId] = useState<string | null>(null);
  const [selectedPreviewChatId, setSelectedPreviewChatId] = useState<string | null>(null);

  async function loadScripts() {
    try {
      const result = await fetchCreatorScripts(creatorId);
      setScripts(result.scripts);
      setSelectedPreviewScriptId((current) => current ?? result.scripts[0]?.id ?? null);
      setScriptError(null);
      return result.scripts;
    } catch (error: unknown) {
      console.error("Failed to fetch creator scripts", error);
      setScripts([]);
      setScriptError(errorMessage(error));
      return [];
    }
  }

  useEffect(() => {
    setSimulationPreview(null);
    setSelectedPreviewSubscriberId(null);
    setSelectedPreviewChatId(null);
    setSelectedPreviewScriptId(null);
    void refreshWorkspace();
    void loadScripts();
  }, [creatorId]);

  const queueBuckets = useMemo(() => buildCanonicalOutboundBuckets(outboundMessages), [outboundMessages]);
  const queueCounts = useMemo(() => buildQueueCounts(queueWorkspace, outboundMessages, data?.tasks ?? []), [data?.tasks, outboundMessages, queueWorkspace]);

  if (!data) {
    return <main className="premium-card rounded-2xl p-6 text-sm text-blue-100/68">Loading creator operations...</main>;
  }

  const latest = data.snapshots[0];
  const latestSync = data.syncRuns[0];
  const selectedScript = scripts.find((item) => item.id === selectedPreviewScriptId) ?? scripts[0] ?? null;
  const selectedSubscriber = selectedPreviewSubscriberId ? data.subscribers.find((item) => item.id === selectedPreviewSubscriberId) ?? data.relationships.find((item) => item.subscriber_id === selectedPreviewSubscriberId) ?? null : data.subscribers[0] ?? data.relationships[0] ?? null;
  const selectedChat = selectedPreviewChatId ? data.chats.find((item) => item.id === selectedPreviewChatId) ?? null : data.chats[0] ?? null;
  const activeQueues = queueWorkspace?.queues.slice(0, 4) ?? [];

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

  async function refreshWorkspace() {
    await Promise.all([
      fetchCreatorDetail(creatorId).then(setData),
      fetchCreatorAutomationRuns(creatorId).then((result) => setAutomationRuns(result.runs)),
      fetchQueueWorkspace({ creatorId }).then(setQueueWorkspace).catch((error: unknown) => {
        console.error("Failed to load creator queue workspace", error);
        setQueueWorkspace(null);
      }),
      fetchOutboundMessages().then((result) => setOutboundMessages(result.messages.filter((message) => message.creator_id === creatorId))).catch((error: unknown) => {
        console.error("Failed to load outbound messages", error);
        setOutboundMessages([]);
      })
    ]);
  }

  async function handleGenerateTasks() {
    setGeneratingTasks(true);
    const result = await generateCreatorTasks(creatorId);
    const detail = await fetchCreatorDetail(creatorId);
    setTaskGeneration(result);
    setData(detail);
    setGeneratingTasks(false);
    setTab("Queues");
  }

  async function handleTaskStatus(taskId: string, status: "in_progress" | "waiting" | "completed" | "ignored") {
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
      await loadScripts();
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

  async function handlePreviewSimulation() {
    if (!selectedScript) return;
    setPreviewBusy(true);
    setPreviewError(null);
    try {
      const subscriber = selectedSubscriber ? simulationSubscriberFromSelection(selectedSubscriber, selectedChat) : defaultPreviewSubscriber(selectedChat);
      const detail = await startSimulation(creatorId, {
        scriptId: selectedScript.id,
        eventType: selectedScript.trigger_event_type || "chat_message",
        subscriber,
        eventPayload: {
          source: "creator-cockpit",
          selected_chat_id: selectedChat?.id ?? null
        },
        variables: {
          subscriber_name: subscriber.name,
          creator_name: data!.creator.display_name ?? data!.creator.username,
          chat_id: selectedChat?.platform_chat_id ?? selectedChat?.id ?? null
        }
      });
      setSimulationPreview(detail);
      setPreviewError(null);
    } catch (error) {
      setPreviewError(errorMessage(error));
    } finally {
      setPreviewBusy(false);
    }
  }

  async function handleApproveMessage(message: OfOutboundMessage) {
    await updatePreviewOutbound(message.id, {
      draft_text: message.draft_text ?? message.message_body,
      final_text: message.final_text ?? message.draft_text ?? message.message_body,
      approval_status: "approved",
      approved_by: "operator"
    });
  }

  async function handleRejectMessage(message: OfOutboundMessage) {
    await updatePreviewOutbound(message.id, {
      approval_status: "rejected",
      approved_by: "operator",
      reason: "Rejected from creator cockpit"
    });
  }

  async function handleHumanReview(message: OfOutboundMessage) {
    await updatePreviewOutbound(message.id, {
      status: "failed",
      approved_by: "operator",
      reason: "Needs human review",
      error_message: "Needs human review"
    });
  }

  async function updatePreviewOutbound(messageId: string, patch: Parameters<typeof updateOutboundMessage>[1]) {
    const result = await updateOutboundMessage(messageId, patch as never);
    setOutboundMessages((current) => current.map((item) => (item.id === messageId ? result.message : item)));
  }

  return (
    <main className="space-y-5 animate-in-soft">
      <section className="premium-card rounded-2xl p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">Creator Cockpit</div>
            <h1 className="mt-2 text-2xl font-semibold text-white">{data.creator.display_name || data.creator.username}</h1>
            <div className="mt-1 text-sm text-blue-100/62">@{data.creator.username} / {data.creator.status}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {syncButtons.map((button) => (
              <button
                key={button.type}
                type="button"
                onClick={() => void handleSync(button.type)}
                disabled={runningSync !== null}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50 disabled:cursor-not-allowed disabled:opacity-45"
                title={button.label}
              >
                <RefreshCw className={`h-4 w-4 ${runningSync === button.type ? "animate-spin" : ""}`} aria-hidden="true" />
                <span>{runningSync === button.type ? "Running" : button.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Pending Approval" value={String(queueCounts.needsApproval)} trend={`${queueCounts.readyToSend} ready`} icon={ShieldAlert} />
        <MetricTile label="Ready to Send" value={String(queueCounts.readyToSend)} trend={`${queueCounts.sending} sending`} icon={Send} />
        <MetricTile label="Failed" value={String(queueCounts.failed)} trend={`${queueCounts.humanReview} human review`} icon={AlertTriangle} />
        <MetricTile label="Automation Suggestions" value={String(queueCounts.suggestions)} trend={`${queueCounts.activeQueues} active queues`} icon={Sparkles} />
      </section>

      {syncError ? <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{syncError}</div> : null}
      {scriptError ? <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{scriptError}</div> : null}
      {previewError ? <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{previewError}</div> : null}

      <section className="grid gap-5 xl:grid-cols-[300px_1fr]">
        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <SummaryPanel title="Creator Side Panel">
            <div className="space-y-2">
              <ContextField label="Status" value={data.creator.status} />
              <ContextField label="Last Sync" value={date(latestSync?.completed_at ?? latestSync?.started_at ?? data.creator.last_sync_at)} />
              <ContextField label="Subscribers" value={String(latest?.subscribers_count ?? data.subscribers.length)} />
              <ContextField label="Active Chats" value={String(data.chats.length)} />
              <ContextField label="Pending Outbound" value={String(queueCounts.needsApproval + queueCounts.readyToSend)} />
              <ContextField label="Approval Queue" value={String(queueCounts.needsApproval)} />
            </div>
          </SummaryPanel>

          <SummaryPanel title="Active Queues">
            <div className="space-y-2">
              {activeQueues.map((queue) => (
                <div key={queue.id} className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/72 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{queue.label}</div>
                      <div className="mt-1 text-xs text-blue-100/54">{queue.description ?? queue.name}</div>
                    </div>
                    <div className="text-right text-xs text-blue-100/58">
                      <div className="font-semibold text-white">{queue.active_item_count}</div>
                      <div>{queue.resolved_item_count} done</div>
                    </div>
                  </div>
                </div>
              ))}
              {!activeQueues.length ? <div className="text-sm text-blue-100/58">No active queues found for this creator yet.</div> : null}
            </div>
          </SummaryPanel>

          <SummaryPanel title="Attached Scripts">
            <div className="space-y-2">
              {scripts.slice(0, 5).map((script) => (
                <button
                  key={script.id}
                  type="button"
                  onClick={() => {
                    setSelectedPreviewScriptId(script.id);
                    setTab("Chat Ops");
                  }}
                  className={`w-full rounded-2xl border px-3 py-3 text-left ${script.id === selectedPreviewScriptId ? "border-cyan-300/40 bg-cyan-300/10" : "border-blue-500/15 bg-[#0D1B2A]/72"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{script.name}</div>
                      <div className="mt-1 truncate text-xs text-blue-100/54">{script.trigger_event_type} / {script.action_mode}</div>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${script.status === "active" ? "bg-emerald-400/16 text-emerald-200" : "bg-slate-400/14 text-slate-200"}`}>
                      {script.status}
                    </span>
                  </div>
                </button>
              ))}
              {!scripts.length ? <div className="text-sm text-blue-100/58">No scripts attached yet.</div> : null}
            </div>
          </SummaryPanel>

          <SummaryPanel title="Subscriber / Chat Links">
            <div className="space-y-2">
              {data.subscribers.slice(0, 4).map((subscriber) => (
                <div key={subscriber.id} className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/72 p-3">
                  <div className="text-sm font-semibold text-white">{subscriber.display_name || subscriber.username || subscriber.betterfans_subscriber_id}</div>
                  <div className="mt-1 text-xs text-blue-100/54">{subscriber.subscription_status ?? subscriber.status ?? "unknown"} / {subscriber.total_spend != null ? `$${subscriber.total_spend.toLocaleString()}` : "unknown"}</div>
                </div>
              ))}
              {data.chats.slice(0, 4).map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => setSelectedPreviewChatId(chat.id)}
                  className={`w-full rounded-2xl border px-3 py-3 text-left ${chat.id === selectedPreviewChatId ? "border-cyan-300/40 bg-cyan-300/10" : "border-blue-500/15 bg-[#0D1B2A]/72"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{chat.fan_display_name || chat.fan_username || chat.platform_user_id || chat.platform_chat_id}</div>
                      <div className="mt-1 truncate text-xs text-blue-100/54">{chat.unread_count ? `${chat.unread_count} unread` : chat.unread ? "Unread" : "Quiet"} / {chat.priority ? "priority" : "normal"}</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                  </div>
                </button>
              ))}
              {!data.subscribers.length && !data.chats.length ? <div className="text-sm text-blue-100/58">No subscriber or chat links available yet.</div> : null}
            </div>
          </SummaryPanel>

          <SummaryPanel title="Pending Outbound">
            <div className="space-y-2">
              {queueBuckets.needsApproval.slice(0, 3).map((message) => (
                <OutboundCard
                  key={message.id}
                  message={message}
                  tone="approval"
                  onApprove={() => void handleApproveMessage(message)}
                  onReject={() => void handleRejectMessage(message)}
                  onHumanReview={() => void handleHumanReview(message)}
                />
              ))}
              {!queueBuckets.needsApproval.length ? <div className="text-sm text-blue-100/58">No outbound drafts are waiting for approval.</div> : null}
            </div>
          </SummaryPanel>
        </aside>

        <section className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <MetricTile label="Subscribers" value={String(latest?.subscribers_count ?? 0)} trend={`${latest?.active_subscribers ?? 0} active`} icon={UserRoundCheck} />
            <MetricTile label="Revenue" value={`$${Number(latest?.revenue ?? 0).toLocaleString()}`} trend="latest snapshot" icon={Sparkles} />
            <MetricTile label="Risk" value={riskLabel(data.relationships, latest?.expired_subscribers ?? 0)} trend={`${data.relationships.filter((item) => item.churn_risk >= 70).length} at risk`} icon={ShieldAlert} />
          </div>

          <section className="premium-card rounded-2xl p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Test Preview</div>
                <div className="mt-1 text-sm text-blue-100/62">Simulate a script against the selected creator, chat, or subscriber. The result stays inside the approval flow.</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handlePreviewSimulation()}
                  disabled={!selectedScript || previewBusy}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <RefreshCw className={`h-4 w-4 ${previewBusy ? "animate-spin" : ""}`} aria-hidden="true" />
                  {previewBusy ? "Running Preview" : "Run Safe Preview"}
                </button>
                <button
                  type="button"
                  onClick={() => setTab("Scripts")}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-400/20 bg-[#102338]/72 px-4 py-2.5 text-sm font-semibold text-blue-50"
                >
                  Open Script Builder
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr_1fr]">
              <select value={selectedPreviewScriptId ?? ""} onChange={(event) => setSelectedPreviewScriptId(event.target.value || null)} className="rounded-xl border border-blue-500/20 bg-[#0D1B2A] px-4 py-3 text-sm text-white outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B2A]">
                <option value="">Select a script</option>
                {scripts.map((script) => <option key={script.id} value={script.id}>{script.name}</option>)}
              </select>
              <select value={selectedPreviewSubscriberId ?? ""} onChange={(event) => setSelectedPreviewSubscriberId(event.target.value || null)} className="rounded-xl border border-blue-500/20 bg-[#0D1B2A] px-4 py-3 text-sm text-white outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B2A]">
                <option value="">Selected subscriber</option>
                {data.subscribers.map((subscriber) => <option key={subscriber.id} value={subscriber.id}>{subscriber.display_name || subscriber.username || subscriber.betterfans_subscriber_id}</option>)}
              </select>
              <select value={selectedPreviewChatId ?? ""} onChange={(event) => setSelectedPreviewChatId(event.target.value || null)} className="rounded-xl border border-blue-500/20 bg-[#0D1B2A] px-4 py-3 text-sm text-white outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B2A]">
                <option value="">Selected chat</option>
                {data.chats.map((chat) => <option key={chat.id} value={chat.id}>{chat.fan_display_name || chat.fan_username || chat.platform_chat_id}</option>)}
              </select>
            </div>

            {simulationPreview ? (
              <div className="mt-4 grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/72 p-4">
                  <div className="text-sm font-semibold text-white">Preview Result</div>
                  <div className="mt-2 grid gap-2">
                    <ContextField label="Simulation Status" value={simulationPreview.simulation.status} />
                    <ContextField label="Script" value={simulationPreview.simulation.script?.name ?? "Unknown"} />
                    <ContextField label="Event Type" value={simulationPreview.simulation.event_type} />
                    <ContextField label="Preview Outbounds" value={String(simulationPreview.outboundMessages.length)} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab("Chat Ops")}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-300/24 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100"
                  >
                    Review in Chat Ops
                  </button>
                </div>
                <div className="space-y-3">
                  {simulationPreview.outboundMessages.map((message) => (
                    <article key={message.id} className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/72 p-4">
                      <div className="flex items-center justify-between gap-3 text-xs text-blue-100/58">
                        <span>{message.status}</span>
                        <span>{message.approval_status}</span>
                      </div>
                      <div className="mt-3 text-sm leading-6 text-white">{message.final_text ?? message.draft_text ?? message.message_body}</div>
                    </article>
                  ))}
                  {!simulationPreview.outboundMessages.length ? <div className="text-sm text-blue-100/58">No outbound draft was generated by the preview.</div> : null}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/72 p-4 text-sm text-blue-100/58">
                Run a preview to inspect the generated outbound draft before it enters approval.
              </div>
            )}
          </section>

          <div className="flex gap-1 overflow-x-auto border-b border-blue-500/20">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`whitespace-nowrap px-3 py-2 text-sm font-semibold ${tab === item ? "border-b-2 border-cyan-300 text-cyan-200" : "text-blue-100/58 hover:text-white"}`}
          >
            {item}
          </button>
        ))}
          </div>
        </section>
      </section>

      {tab === "Chat Ops" ? <ChatOpsQueuePanel data={data} queueWorkspace={queueWorkspace} outboundMessages={outboundMessages} queueBuckets={queueBuckets} queueCounts={queueCounts} selectedScript={selectedScript} selectedSubscriber={selectedSubscriber} selectedChat={selectedChat} onApprove={handleApproveMessage} onReject={handleRejectMessage} onHumanReview={handleHumanReview} /> : null}
      {tab === "Profile" ? <ProfilePanel data={data} /> : null}
      {tab === "Relationships" ? <RelationshipsPanel data={data} /> : null}
      {tab === "Subscribers" ? <SubscribersPanel data={data} /> : null}
      {tab === "Chats" ? <ChatsPanel data={data} /> : null}
      {tab === "Queues" ? <TasksPanel data={data} onStatus={handleTaskStatus} /> : null}
      {tab === "Scripts" ? (
        <ScriptsPanel
          creatorId={creatorId}
          scripts={scripts}
          runs={automationRuns}
          result={automationResult}
          error={scriptError}
          onReload={loadScripts}
          onPatch={handleScriptPatch}
          onRunTest={handleRunTestTrigger}
        />
      ) : null}
      {tab === "Timeline" ? <TimelinePanel data={data} /> : null}
    </main>
  );
}

function RelationshipsPanel({ data }: { data: CreatorDetailData }) {
  const relationships = [...data.relationships].sort((a, b) => b.relationship_score - a.relationship_score);
  const activeContextEvents = data.contextEvents.filter((event) => event.delivery_status === "pending");

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <RelationshipStat label="Average Relationship" value={`${averageScore(relationships, "relationship_score")}/100`} />
        <RelationshipStat label="Engagement" value={`${averageScore(relationships, "engagement_score")}/100`} />
        <RelationshipStat label="Churn Risk" value={`${averageScore(relationships, "churn_risk")}/100`} />
        <RelationshipStat label="Context Hooks" value={String(activeContextEvents.length)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-stone-100 text-stone-600">
              <tr>
                {["Subscriber", "State", "LTV", "Scores", "Last Interaction", "Summary", "Next Action"].map((header) => (
                  <th key={header} className="px-4 py-3 font-semibold">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {relationships.map((relationship) => {
                const summary = relationshipSummary(relationship);
                return (
                  <tr key={relationship.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-stone-950">{relationship.display_name || relationship.username || relationship.betterfans_subscriber_id}</div>
                      <div className="text-xs text-stone-500">{relationship.country || relationship.current_subscription_status || "unknown"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${stateTone(relationship.relationship_state)}`}>
                        {relationship.relationship_state.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-700">
                      <div>{money(relationship.lifetime_spend)}</div>
                      <div className="text-xs text-stone-500">{relationship.purchase_count} purchases / {relationship.revenue_trend}</div>
                    </td>
                    <td className="px-4 py-3 text-stone-700">
                      <ScoreLine label="Rel" value={relationship.relationship_score} />
                      <ScoreLine label="VIP" value={relationship.vip_score} />
                      <ScoreLine label="Risk" value={relationship.churn_risk} />
                    </td>
                    <td className="px-4 py-3 text-stone-700">
                      <div>{date(relationship.last_subscriber_message_at ?? relationship.last_creator_response_at ?? relationship.last_seen_at)}</div>
                      <div className="text-xs text-stone-500">{relationship.conversation_count} conversations</div>
                    </td>
                    <td className="max-w-sm px-4 py-3 text-stone-700">{summary}</td>
                    <td className="px-4 py-3 text-stone-700">{relationship.recommended_next_action ?? "Monitor relationship"}</td>
                  </tr>
                );
              })}
              {!relationships.length ? <tr><td colSpan={7} className="px-4 py-6 text-stone-500">No relationship profiles have been built yet.</td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border border-stone-200 bg-white">
          <div className="border-b border-stone-200 px-4 py-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-stone-950">
              <HeartPulse className="h-4 w-4 text-teal-700" aria-hidden="true" />
              MGRNZ Context Queue
            </h2>
          </div>
          <div className="divide-y divide-stone-100">
            {data.contextEvents.slice(0, 8).map((event) => (
              <div key={event.id} className="px-4 py-3">
                <div className="font-medium text-stone-950">{event.event_type.replaceAll("_", " ")}</div>
                <div className="mt-1 text-xs text-stone-500">{event.delivery_status} / {date(event.emitted_at)}</div>
              </div>
            ))}
            {!data.contextEvents.length ? <div className="p-4 text-sm text-stone-500">No context events emitted yet.</div> : null}
          </div>
        </div>
      </div>
    </section>
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

function TasksPanel({ data, onStatus }: { data: CreatorDetailData; onStatus: (taskId: string, status: "in_progress" | "waiting" | "completed" | "ignored") => void }) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <TaskGroup title="Open Queue Items" tasks={data.tasks.filter((task) => task.status === "open")} onStatus={onStatus} />
      <TaskGroup title="In Progress Queue Items" tasks={data.tasks.filter((task) => task.status === "in_progress")} onStatus={onStatus} />
      <TaskGroup title="Waiting Queue Items" tasks={data.tasks.filter((task) => task.status === "waiting")} onStatus={onStatus} />
      <TaskGroup title="Completed Queue Items" tasks={data.tasks.filter((task) => task.status === "completed")} onStatus={onStatus} />
    </section>
  );
}

function ScriptsPanel({
  creatorId,
  scripts,
  runs,
  result,
  error,
  onReload,
  onPatch,
  onRunTest
}: {
  creatorId: string;
  scripts: OfMessageScript[];
  runs: OfAutomationRun[];
  result: AutomationRunSummary | null;
  error: string | null;
  onReload: () => Promise<OfMessageScript[]>;
  onPatch: (scriptId: string, patch: Partial<OfMessageScript>) => void;
  onRunTest: (script: OfMessageScript) => void;
}) {
  return <ScriptBuilderPanel creatorId={creatorId} scripts={scripts} runs={runs} result={result} error={error} onReload={onReload} onPatch={onPatch} onRunTest={onRunTest} />;
}

function ChatOpsQueuePanel({
  data,
  queueWorkspace,
  outboundMessages,
  queueBuckets,
  queueCounts,
  selectedScript,
  selectedSubscriber,
  selectedChat,
  onApprove,
  onReject,
  onHumanReview
}: {
  data: CreatorDetailData;
  queueWorkspace: QueueWorkspaceData | null;
  outboundMessages: OfOutboundMessage[];
  queueBuckets: ReturnType<typeof buildCanonicalOutboundBuckets>;
  queueCounts: ReturnType<typeof buildQueueCounts>;
  selectedScript: OfMessageScript | null;
  selectedSubscriber: OfSubscriber | OfSubscriberRelationship | null;
  selectedChat: CreatorDetailData["chats"][number] | null;
  onApprove: (message: OfOutboundMessage) => Promise<void>;
  onReject: (message: OfOutboundMessage) => Promise<void>;
  onHumanReview: (message: OfOutboundMessage) => Promise<void>;
}) {
  const selectedCreator = queueWorkspace?.selected_creator ?? data.creator;

  return (
    <section className="space-y-5 animate-in-soft">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SummaryPanel title="Queue Snapshot">
          <div className="grid gap-2 sm:grid-cols-2">
            <ContextField label="Selected Creator" value={selectedCreator?.display_name ?? selectedCreator?.username ?? data.creator.username} />
            <ContextField label="Active Queues" value={String(queueCounts.activeQueues)} />
            <ContextField label="Pending Approval" value={String(queueCounts.needsApproval)} />
            <ContextField label="Ready to Send" value={String(queueCounts.readyToSend)} />
            <ContextField label="Failed" value={String(queueCounts.failed)} />
              <ContextField label="Human Review" value={String(queueCounts.humanReview)} />
          </div>
        </SummaryPanel>

        <SummaryPanel title="Preview Context">
          <div className="space-y-2">
            <ContextField label="Selected Script" value={selectedScript?.name ?? "No script selected"} />
            <ContextField
              label="Subscriber"
              value={selectedSubscriber ? subscriberLabel(selectedSubscriber) : "No subscriber selected"}
            />
            <ContextField
              label="Chat"
              value={selectedChat ? selectedChat.fan_display_name ?? selectedChat.fan_username ?? selectedChat.platform_chat_id : "No chat selected"}
            />
            <ContextField label="Approval Path" value="Simulation drafts stay pending until reviewed by an operator." />
          </div>
        </SummaryPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <QueueLane title="Needs Approval" tone="approval" count={queueBuckets.needsApproval.length}>
          {queueBuckets.needsApproval.map((message) => (
            <OutboundCard key={message.id} message={message} tone="approval" onApprove={() => void onApprove(message)} onReject={() => void onReject(message)} onHumanReview={() => void onHumanReview(message)} />
          ))}
        </QueueLane>

        <QueueLane title="Ready to Send" tone="sending" count={queueBuckets.readyToSend.length}>
          {queueBuckets.readyToSend.map((message) => (
            <OutboundCard key={message.id} message={message} tone="sending" />
          ))}
        </QueueLane>

        <QueueLane title="Sent" tone="sent" count={queueBuckets.sent.length}>
          {queueBuckets.sent.map((message) => (
            <OutboundCard key={message.id} message={message} tone="sent" />
          ))}
        </QueueLane>

        <QueueLane title="Failed" tone="failed" count={queueBuckets.failed.length}>
          {queueBuckets.failed.map((message) => (
            <OutboundCard key={message.id} message={message} tone="failed" onHumanReview={() => void onHumanReview(message)} />
          ))}
        </QueueLane>

        <QueueLane title="Human Review" tone="review" count={queueBuckets.humanReview.length}>
          {queueBuckets.humanReview.map((message) => (
            <OutboundCard key={message.id} message={message} tone="review" onHumanReview={() => void onHumanReview(message)} />
          ))}
        </QueueLane>

        <QueueLane title="Automation Suggestions" tone="suggestion" count={queueCounts.suggestions}>
          {data.tasks.filter((task) => Boolean(task.recommended_action || task.ai_suggestion?.suggested_reply || task.ai_suggestion?.suggested_script)).slice(0, 4).map((task) => (
            <div key={task.id} className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/72 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{task.title}</div>
                  <div className="mt-1 text-xs text-blue-100/54">{task.rule_name} / {task.priority}</div>
                </div>
                <div className="text-right text-xs text-cyan-200">{task.priority_score}</div>
              </div>
              <div className="mt-2 text-sm leading-6 text-blue-50">{task.recommended_action ?? task.ai_suggestion?.suggested_reply ?? "Review suggested work."}</div>
            </div>
          ))}
          {!queueCounts.suggestions ? <div className="text-sm text-blue-100/58">No automation suggestions are available right now.</div> : null}
        </QueueLane>
      </section>

      <section className="premium-card rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Outbound Coverage</div>
            <div className="mt-1 text-sm text-blue-100/62">
              {outboundMessages.length} creator messages tracked with approval, send, and review status.
            </div>
          </div>
          <div className="text-sm text-blue-100/58">
            Queue workspace: {queueWorkspace?.queues.length ?? 0} queues / {queueWorkspace?.items.length ?? 0} items
          </div>
        </div>
      </section>
    </section>
  );
}

function QueueLane({
  title,
  tone,
  count,
  children
}: {
  title: string;
  tone: "approval" | "sending" | "sent" | "failed" | "review" | "suggestion";
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="premium-card rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-white">{title}</div>
          <div className="text-sm text-blue-100/58">{laneSubtitle(tone)}</div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${laneTone(tone)}`}>{count}</span>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function OutboundCard({
  message,
  tone,
  onApprove,
  onReject,
  onHumanReview
}: {
  message: OfOutboundMessage;
  tone: "approval" | "sending" | "sent" | "failed" | "review";
  onApprove?: () => void;
  onReject?: () => void;
  onHumanReview?: () => void;
}) {
  const body = message.final_text ?? message.draft_text ?? message.message_body;
  return (
    <article className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/72 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">{creatorLabel(message)}</div>
          <div className="mt-1 truncate text-xs text-blue-100/54">{message.fan_id} / {message.of_message_scripts?.name ?? message.script_id ?? "Direct script"}</div>
        </div>
        <div className="flex flex-col items-end gap-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
          <span className={`rounded-full px-2 py-1 ${messageTone(message.status, tone)}`}>{message.status}</span>
          <span className={`rounded-full px-2 py-1 ${messageTone(message.approval_status, tone)}`}>{message.approval_status}</span>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-[#071423]/72 px-3 py-2 text-sm leading-6 text-blue-50">{body}</div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-blue-100/58">
        <span>{date(message.created_at)}</span>
        {message.failure_reason ? <span>{message.failure_reason}</span> : null}
        {message.error_message ? <span>{message.error_message}</span> : null}
      </div>
      {tone === "approval" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={onApprove} className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950">Approve</button>
          <button type="button" onClick={onReject} className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100">Reject</button>
          <button type="button" onClick={onHumanReview} className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100">Human Review</button>
        </div>
      ) : tone === "failed" || tone === "review" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={onHumanReview} className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100">Mark Human Review</button>
        </div>
      ) : null}
    </article>
  );
}

function SummaryPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="premium-card rounded-2xl p-4">
      <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-100/58">{title}</div>
      {children}
    </section>
  );
}

function ContextField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-blue-500/10 bg-[#0D1B2A]/48 px-3 py-2 text-sm">
      <span className="text-blue-100/54">{label}</span>
      <span className="max-w-[65%] text-right text-white">{value}</span>
    </div>
  );
}

function laneSubtitle(tone: "approval" | "sending" | "sent" | "failed" | "review" | "suggestion") {
  if (tone === "approval") return "Needs operator review before any send.";
  if (tone === "sending") return "Cleared messages moving through delivery.";
  if (tone === "sent") return "Messages already delivered.";
  if (tone === "failed") return "Delivery failures and rejected drafts.";
  if (tone === "review") return "Edge cases that need human judgment.";
  return "Likely next actions and drafting opportunities.";
}

function laneTone(tone: "approval" | "sending" | "sent" | "failed" | "review" | "suggestion") {
  if (tone === "approval") return "bg-amber-400/16 text-amber-100";
  if (tone === "sending") return "bg-cyan-300/14 text-cyan-100";
  if (tone === "sent") return "bg-emerald-400/16 text-emerald-100";
  if (tone === "failed") return "bg-rose-400/16 text-rose-100";
  if (tone === "review") return "bg-violet-400/16 text-violet-100";
  return "bg-blue-400/12 text-blue-100";
}

function messageTone(value: string | null, tone: "approval" | "sending" | "sent" | "failed" | "review") {
  if (tone === "approval") return value === "pending" ? "bg-amber-400/16 text-amber-100" : "bg-blue-400/12 text-blue-100";
  if (tone === "sending") return "bg-cyan-300/14 text-cyan-100";
  if (tone === "sent") return "bg-emerald-400/16 text-emerald-100";
  if (tone === "failed") return "bg-rose-400/16 text-rose-100";
  return "bg-violet-400/16 text-violet-100";
}

type OutboundBuckets = ReturnType<typeof buildCanonicalOutboundBuckets>;

function buildQueueCounts(queueWorkspace: QueueWorkspaceData | null, outboundMessages: OfOutboundMessage[], tasks: CreatorDetailData["tasks"]) {
  const buckets = buildCanonicalOutboundBuckets(outboundMessages);
  return {
    activeQueues: queueWorkspace?.queues.length ?? 0,
    needsApproval: buckets.needsApproval.length,
    readyToSend: buckets.readyToSend.length,
    sending: buckets.sending.length,
    sent: buckets.sent.length,
    failed: buckets.failed.length,
    humanReview: buckets.humanReview.length,
    suggestions: tasks.filter((task) => Boolean(task.recommended_action || task.ai_suggestion?.suggested_reply || task.ai_suggestion?.suggested_script)).length
  };
}

function simulationSubscriberFromSelection(subscriber: OfSubscriber | OfSubscriberRelationship, chat: CreatorDetailData["chats"][number] | null) {
  return {
    name: subscriberNameFromSelection(subscriber, chat),
    username: subscriberUsernameFromSelection(subscriber, chat),
    subscription_status: subscriptionStatusFromSubscriber(subscriber),
    renewal_state: "current",
    spend_level: spendLevelFromSubscriber(subscriber),
    lifetime_value: lifetimeValueFromSubscriber(subscriber),
    message_history_summary: "Preview generated from the creator cockpit selected context.",
    custom_variables: {
      creator_source: "creator-cockpit",
      selected_chat_id: chat?.id ?? null
    }
  };
}

function defaultPreviewSubscriber(chat: CreatorDetailData["chats"][number] | null) {
  return {
    name: chat?.fan_display_name ?? chat?.fan_username ?? "Selected subscriber",
    username: chat?.fan_username ?? chat?.platform_user_id ?? "selected_subscriber",
    subscription_status: "active",
    renewal_state: "current",
    spend_level: "medium",
    lifetime_value: 0,
    message_history_summary: "Preview generated without a selected subscriber.",
    custom_variables: {
      creator_source: "creator-cockpit",
      selected_chat_id: chat?.id ?? null
    }
  };
}

function subscriberLabel(subscriber: OfSubscriber | OfSubscriberRelationship) {
  return subscriber.display_name || subscriber.username || "Unknown subscriber";
}

function subscriberNameFromSelection(subscriber: OfSubscriber | OfSubscriberRelationship, chat: CreatorDetailData["chats"][number] | null) {
  return subscriber.display_name ?? subscriber.username ?? chat?.fan_display_name ?? chat?.fan_username ?? "Selected subscriber";
}

function subscriberUsernameFromSelection(subscriber: OfSubscriber | OfSubscriberRelationship, chat: CreatorDetailData["chats"][number] | null) {
  return subscriber.username ?? chat?.fan_username ?? chat?.platform_user_id ?? "selected_subscriber";
}

function spendLevelFromSubscriber(subscriber: OfSubscriber | OfSubscriberRelationship) {
  const spend = "total_spend" in subscriber ? Number(subscriber.total_spend ?? 0) : Number(subscriber.lifetime_spend ?? 0);
  if (spend >= 1000) return "high";
  if (spend >= 250) return "medium";
  return "low";
}

function lifetimeValueFromSubscriber(subscriber: OfSubscriber | OfSubscriberRelationship) {
  if ("total_spend" in subscriber) return Number(subscriber.total_spend ?? 0);
  return Number(subscriber.lifetime_spend ?? 0);
}

function subscriptionStatusFromSubscriber(subscriber: OfSubscriber | OfSubscriberRelationship) {
  if ("current_subscription_status" in subscriber) return subscriber.current_subscription_status ?? "active";
  if ("subscription_status" in subscriber) return subscriber.subscription_status ?? "active";
  return "active";
}

function creatorLabel(message: OfOutboundMessage) {
  return message.of_creators?.display_name ?? message.of_creators?.username ?? message.creator_id;
}

function TaskGroup({ title, tasks, onStatus }: { title: string; tasks: CreatorDetailData["tasks"]; onStatus: (taskId: string, status: "in_progress" | "waiting" | "completed" | "ignored") => void }) {
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
              <button type="button" onClick={() => onStatus(task.id, "in_progress")} disabled={task.status === "in_progress" || task.status === "completed"} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-45">
                Mark In Progress
              </button>
              <button type="button" onClick={() => onStatus(task.id, "waiting")} disabled={task.status === "waiting" || task.status === "completed"} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-45">
                Waiting
              </button>
              <button type="button" onClick={() => onStatus(task.id, "completed")} disabled={task.status === "completed"} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-45">
                Complete
              </button>
              <button type="button" onClick={() => onStatus(task.id, "ignored")} disabled={task.status === "ignored" || task.status === "completed"} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-45">
                Ignore
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
  const relationshipEvents = data.relationshipTimeline.map((item) => [
    `relationship.${item.timeline_type}`,
    `${item.title}${item.detail ? ` / ${item.detail}` : ""}${item.amount ? ` / ${money(item.amount)}` : ""}`,
    date(item.occurred_at)
  ]);
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

  return <Table rows={[...relationshipEvents, ...syncEvents, ...betterFansEvents, ...systemEvents]} headers={["Event", "Detail", "Time"]} />;
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

function RelationshipStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <div className="text-sm font-medium text-stone-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-stone-950">{value}</div>
    </div>
  );
}

function ScoreLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-xs font-medium text-stone-500">{label}</span>
      <span className="h-1.5 w-20 rounded-full bg-stone-200">
        <span className="block h-1.5 rounded-full bg-teal-700" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </span>
      <span className="text-xs tabular-nums text-stone-600">{value}</span>
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

function riskLabel(relationships: OfSubscriberRelationship[], expired: number) {
  if (relationships.some((item) => item.churn_risk >= 70)) return "High";
  if (relationships.some((item) => item.churn_risk >= 45)) return "Watch";
  if (expired > 100) return "High";
  if (expired > 25) return "Watch";
  return "Stable";
}

function money(value: number | null) {
  return value == null ? "unknown" : `$${value.toLocaleString()}`;
}

function averageScore(relationships: OfSubscriberRelationship[], key: "relationship_score" | "vip_score" | "engagement_score" | "churn_risk") {
  if (!relationships.length) return 0;
  return Math.round(relationships.reduce((sum, relationship) => sum + relationship[key], 0) / relationships.length);
}

function relationshipSummary(relationship: OfSubscriberRelationship) {
  const summaries = relationship.of_relationship_summaries;
  const summary = Array.isArray(summaries) ? summaries[0] : summaries;
  return summary?.operational_summary || "No relationship summary yet.";
}

function stateTone(state: string) {
  if (state === "vip" || state === "reactivated") return "bg-emerald-50 text-emerald-800";
  if (state === "at_risk" || state === "expired") return "bg-rose-50 text-rose-800";
  if (state === "cooling") return "bg-amber-50 text-amber-900";
  return "bg-teal-50 text-teal-800";
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
