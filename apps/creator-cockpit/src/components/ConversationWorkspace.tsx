import { ChevronLeft, ClipboardCheck, LoaderCircle, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { ConversationOperationsDetail } from "@funkmyfans/of-types";
import {
  cancelOperationsConversation,
  duplicateConversationAsSimulation,
  exportOperationsConversation,
  fetchConversationWorkspace,
  restartOperationsConversation,
  resumeOperationsConversation,
  retryOperationsConversation,
  type ConversationWorkspaceData
} from "../lib/api";

export function ConversationWorkspace({
  conversationId,
  onBack
}: {
  conversationId: string | null;
  onBack: () => void;
}) {
  const [data, setData] = useState<ConversationWorkspaceData | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) {
      setData(null);
      return;
    }
    setData(null);
    void refreshWorkspace(conversationId);
  }, [conversationId]);

  async function refreshWorkspace(targetConversationId = conversationId) {
    if (!targetConversationId) return;
    setLoading(true);
    try {
      const next = await fetchConversationWorkspace(targetConversationId);
      setData(next);
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action: () => Promise<ConversationOperationsDetail>) {
    if (!data) return;
    setBusy(true);
    try {
      await action();
      await refreshWorkspace();
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    if (!data) return;
    setBusy(true);
    try {
      const exported = await exportOperationsConversation(data.detail.conversation.id);
      await navigator.clipboard.writeText(JSON.stringify(exported, null, 2));
    } finally {
      setBusy(false);
    }
  }

  if (!conversationId) {
    return (
      <main className="premium-card rounded-2xl p-6 text-sm text-blue-100/68">
        Select a queue item to open the Conversation Workspace.
      </main>
    );
  }

  if (!data) {
    return (
      <main className="premium-card rounded-2xl p-6 text-sm text-blue-100/68">
        <div className="mb-3 h-4 w-56 rounded-full shimmer" />
        Loading conversation workspace...
      </main>
    );
  }

  const conversation = data.detail.conversation;
  const canResume = conversation.status === "waiting_delay" || conversation.status === "waiting_reply" || conversation.status === "waiting_approval";
  const canRetry = conversation.status === "failed";
  const currentQueueItem = data.current_queue_item;

  return (
    <main className="space-y-6 animate-in-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-[#0D1B2A]/72 px-3 py-2 text-sm font-semibold text-blue-50 hover:border-cyan-300/40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back to Queue Workspace
          </button>
          <h2 className="text-2xl font-semibold text-white">Conversation Workspace</h2>
          <p className="mt-1 text-sm text-blue-100/58">
            Conversation, queue item, queue, subscriber context, timeline, recent events, and action history in one dedicated surface.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshWorkspace()}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Lifecycle" value={conversation.lifecycle_state} icon={Sparkles} />
        <MetricCard label="Queue Item" value={currentQueueItem?.status_label ?? "unknown"} icon={ClipboardCheck} />
        <MetricCard label="Subscriber" value={data.subscriber_context?.relationship_state ?? "unknown"} icon={ShieldAlert} />
        <MetricCard label="Events" value={String(data.recent_events.length)} icon={LoaderCircle} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-6">
          <SummaryPanel title="Conversation">
            <div className="grid gap-2">
              <ContextField label="Lifecycle" value={conversation.lifecycle_state} />
              <ContextField label="Status" value={conversation.status} />
              <ContextField label="Mode" value={conversation.execution_mode} />
              <ContextField label="Current step" value={conversation.current_step?.step_type ?? "n/a"} />
              <ContextField label="Next step" value={conversation.next_step?.step_type ?? "n/a"} />
              <ContextField label="Waiting until" value={formatDate(conversation.waiting_until)} />
              <ContextField label="Last error" value={conversation.last_error ?? "n/a"} />
              <ContextField label="Retries" value={String(conversation.retry_count ?? 0)} />
            </div>
          </SummaryPanel>

          <SummaryPanel title="Current Queue Item">
            {currentQueueItem ? (
              <div className="grid gap-2">
                <ContextField label="Title" value={currentQueueItem.title} />
                <ContextField label="Status" value={currentQueueItem.status_label} />
                <ContextField label="Priority" value={`${currentQueueItem.priority.toUpperCase()} - ${currentQueueItem.priority_score}`} />
                <ContextField label="Assignment" value={currentQueueItem.assignment_label ?? "Unassigned"} />
                <ContextField label="Queue" value={currentQueueItem.queue_label} />
                <ContextField label="Queue Item ID" value={currentQueueItem.id} />
              </div>
            ) : (
              <div className="text-sm text-blue-100/58">No canonical queue item is linked yet.</div>
            )}
          </SummaryPanel>

          <SummaryPanel title="Current Queue">
            {data.current_queue ? (
              <div className="grid gap-2">
                <ContextField label="Label" value={data.current_queue.label} />
                <ContextField label="Name" value={data.current_queue.name} />
                <ContextField label="Status" value={data.current_queue.operational_status} />
                <ContextField label="Visibility" value={data.current_queue.visibility_state} />
                <ContextField label="Priority" value={data.current_queue.priority} />
                <ContextField label="Queue ID" value={data.current_queue.id} />
              </div>
            ) : (
              <div className="text-sm text-blue-100/58">No current queue is linked to this conversation.</div>
            )}
          </SummaryPanel>

          <SummaryPanel title="Subscriber Context">
            {data.subscriber_context ? (
              <div className="grid gap-2">
                <ContextField
                  label="Subscriber"
                  value={
                    data.subscriber_context.display_name
                      ? `${data.subscriber_context.display_name}${data.subscriber_context.username ? ` (@${data.subscriber_context.username})` : ""}`
                      : data.subscriber_context.username ?? "Unknown subscriber"
                  }
                />
                <ContextField label="Relationship State" value={data.subscriber_context.relationship_state ?? "unknown"} />
                <ContextField label="Subscription Status" value={data.subscriber_context.subscription_status ?? "unknown"} />
                <ContextField label="Urgency" value={data.subscriber_context.urgency_score != null ? String(data.subscriber_context.urgency_score) : "unknown"} />
                <ContextField label="Lifetime Spend" value={data.subscriber_context.lifetime_spend != null ? `$${data.subscriber_context.lifetime_spend.toLocaleString()}` : "unknown"} />
              </div>
            ) : (
              <div className="text-sm text-blue-100/58">No subscriber context is available for this conversation.</div>
            )}
          </SummaryPanel>

          <SummaryPanel title="Attachments">
            {data.attachments.length ? (
              <div className="space-y-3">
                {data.attachments.map((attachment) => (
                  <div key={attachment.id} className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-3">
                    <div className="text-sm font-medium text-white">{attachment.name}</div>
                    <div className="mt-1 text-xs text-blue-100/54">{attachment.kind}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-blue-100/58">No attachments are linked yet.</div>
            )}
          </SummaryPanel>
        </section>

        <section className="space-y-6">
          <SummaryPanel title="Timeline">
            <div className="space-y-3">
              {conversation.history.map((item) => (
                <div key={item.id} className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-3">
                  <div className="flex items-center justify-between gap-3 text-xs text-blue-100/58">
                    <span>{item.event_type}</span>
                    <span>{formatDate(item.occurred_at)}</span>
                  </div>
                  <div className="mt-2 text-sm font-medium text-white">{item.detail ?? "No detail recorded."}</div>
                  <div className="mt-1 text-xs text-blue-100/54">
                    {item.from_state ?? "start"} to {item.to_state ?? "current"}
                  </div>
                </div>
              ))}
            </div>
          </SummaryPanel>

          <SummaryPanel title="Recent Events">
            <div className="space-y-3">
              {data.recent_events.length ? (
                data.recent_events.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-3">
                    <div className="flex items-center justify-between gap-3 text-xs text-blue-100/58">
                      <span>{event.event_type}</span>
                      <span>{formatDate(event.occurred_at)}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">{event.title}</div>
                    {event.detail ? <div className="mt-1 text-sm text-blue-100/68">{event.detail}</div> : null}
                  </div>
                ))
              ) : (
                <div className="text-sm text-blue-100/58">No recent events are linked yet.</div>
              )}
            </div>
          </SummaryPanel>

          <SummaryPanel title="Action History">
            <div className="space-y-3">
              {data.detail.auditTrail.length ? (
                data.detail.auditTrail.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-3">
                    <div className="flex items-center justify-between gap-3 text-xs text-blue-100/58">
                      <span>{item.action}</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                    <div className="mt-2 text-sm text-white">{item.detail ?? "Audit event recorded."}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-blue-100/58">No action history has been recorded for this conversation yet.</div>
              )}
            </div>
          </SummaryPanel>

          <SummaryPanel title="Outbound Messages">
            <div className="space-y-3">
              {data.detail.outboundMessages.length ? (
                data.detail.outboundMessages.map((message) => (
                  <div key={message.id} className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-3">
                    <div className="flex items-center justify-between gap-3 text-xs text-blue-100/58">
                      <span>{message.status}</span>
                      <span>{formatDate(message.created_at)}</span>
                    </div>
                    <div className="mt-2 text-sm text-white">{message.final_text || message.draft_text || message.message_body}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-blue-100/58">No outbound messages recorded for this conversation yet.</div>
              )}
            </div>
          </SummaryPanel>

          <div className="flex flex-wrap gap-2">
            <ActionButton label="Retry" disabled={busy || !canRetry} onClick={() => void runAction(() => retryOperationsConversation(conversation.id))} />
            <ActionButton
              label="Resume"
              disabled={busy || !canResume}
              onClick={() => void runAction(() => resumeOperationsConversation(conversation.id))}
            />
            <ActionButton
              label="Cancel"
              disabled={busy}
              onClick={() => {
                const reason = window.prompt("Cancellation reason", "Cancelled by operator");
                if (!reason) return;
                void runAction(() => cancelOperationsConversation(conversation.id, reason));
              }}
            />
            <ActionButton label="Restart" disabled={busy} onClick={() => void runAction(() => restartOperationsConversation(conversation.id))} />
            <ActionButton label="Sim Copy" disabled={busy} onClick={() => void runAction(() => duplicateConversationAsSimulation(conversation.id))} />
            <ActionButton label="Export" disabled={busy} onClick={() => void handleExport()} />
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="premium-card rounded-2xl p-5">
      <div className="mb-3 text-sm font-semibold uppercase text-blue-100/58">{title}</div>
      {children}
    </section>
  );
}

function ContextField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-blue-500/10 py-2 text-sm last:border-b-0">
      <span className="text-blue-100/54">{label}</span>
      <span className="max-w-[60%] text-right text-white">{value}</span>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof ClipboardCheck }) {
  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-blue-100/58">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-cyan-300" aria-hidden="true" />
      </div>
    </div>
  );
}

function ActionButton({
  label,
  disabled,
  onClick
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}
