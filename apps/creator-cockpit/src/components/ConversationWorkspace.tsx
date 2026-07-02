import { ChevronLeft, HandCoins, LoaderCircle, PauseCircle, Reply, Send, Slash, UserRound, Wand2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { applyQueueItemAction, fetchConversationWorkspace, type ConversationWorkspaceData, type QueueItemAction } from "../lib/api";

type QueueAction = QueueItemAction;

export function ConversationWorkspace({
  conversationId,
  queueItemId,
  onBack,
  onResolved
}: {
  conversationId: string | null;
  queueItemId?: string | null;
  onBack?: () => void;
  onResolved?: () => void;
}) {
  const [data, setData] = useState<ConversationWorkspaceData | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<QueueAction | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setData(null);
      setDecision(null);
      return;
    }

    setData(null);
    setDecision(null);
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

  async function handleDecision(nextDecision: QueueAction) {
    const targetQueueItemId = queueItemId ?? data?.current_queue_item?.id ?? null;
    if (!targetQueueItemId) return;
    setBusy(true);
    try {
      await applyQueueItemAction(targetQueueItemId, nextDecision, { actor: "operator" });
      setDecision(nextDecision);
      await refreshWorkspace();
      if (nextDecision !== "assign") onResolved?.();
    } finally {
      setBusy(false);
    }
  }

  const conversation = data?.detail.conversation ?? null;
  const queueItem = data?.current_queue_item ?? null;
  const actionQueueItemId = queueItemId ?? queueItem?.id ?? null;
  const waitingReason = firstNonEmpty(
    queueItem?.priority_reason,
    conversation?.waiting_reason,
    data?.subscriber_context?.relationship_state,
    data?.detail.relationship ? stringValue(data.detail.relationship, "operator_briefing") : null,
    "Review the waiting action and choose one decision."
  );
  const timeline = useMemo(() => buildTimeline(data), [data]);

  if (!conversationId) {
    return <div className="premium-card rounded-2xl p-6 text-sm text-blue-100/68">Select a queue item to open its workspace.</div>;
  }

  if (!data) {
    return (
      <div className="premium-card rounded-2xl p-6 text-sm text-blue-100/68">
        <div className="mb-3 h-4 w-56 rounded-full shimmer" />
        Loading conversation workspace...
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mb-3 inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-[#0D1B2A]/72 px-3 py-2 text-sm font-semibold text-blue-50 hover:border-cyan-300/40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </button>
          ) : null}
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Dedicated workspace</div>
          <h2 className="mt-1 text-2xl font-semibold text-white">{formatPersonLabel(data.subscriber_context?.display_name, data.subscriber_context?.username)}</h2>
          <p className="mt-1 text-sm text-blue-100/58">The conversation is context. The waiting decision is the focus.</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshWorkspace()}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
        >
          <LoaderCircle className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="premium-card rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 border-b border-blue-500/20 pb-3">
            <div>
              <div className="text-sm font-semibold text-white">Conversation</div>
              <div className="mt-1 text-sm text-blue-100/58">{conversation?.status ?? "unknown"} / {queueItem?.status_label ?? "queue item"}</div>
            </div>
            <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              {decision ? labelize(decision) : "Waiting"}
            </span>
          </div>

          <div className="mt-4 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {timeline.map((entry) => (
              <div
                key={entry.key}
                className={`rounded-2xl border p-4 ${
                  entry.kind === "waiting"
                    ? "border-cyan-300/35 bg-cyan-300/10"
                    : "border-blue-500/15 bg-[#0D1B2A]/65"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">{entry.source}</div>
                    <div className="mt-1 text-sm font-semibold text-white">{entry.title}</div>
                  </div>
                  <div className="text-xs text-blue-100/54">{entry.time}</div>
                </div>
                <div className="mt-2 text-sm leading-6 text-blue-100/68">{entry.detail}</div>
              </div>
            ))}
            {!timeline.length ? <div className="text-sm text-blue-100/58">No conversation context is available yet.</div> : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="premium-card rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              <h3 className="text-base font-semibold text-white">Highlighted waiting action</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-blue-100/68">{waitingReason}</p>

            <div className="mt-4 grid gap-2">
              <ActionButton label="Approve AI" icon={HandCoins} active={decision === "approve_ai"} disabled={busy || !actionQueueItemId} onClick={() => void handleDecision("approve_ai")} />
              <ActionButton label="Respond" icon={Reply} active={decision === "respond"} disabled={busy || !actionQueueItemId} onClick={() => void handleDecision("respond")} />
              <ActionButton label="Assign" icon={UserRound} active={decision === "assign"} disabled={busy || !actionQueueItemId} onClick={() => void handleDecision("assign")} />
              <ActionButton label="Ignore" icon={Slash} active={decision === "ignore"} disabled={busy || !actionQueueItemId} onClick={() => void handleDecision("ignore")} />
              <ActionButton label="Pause" icon={PauseCircle} active={decision === "pause"} disabled={busy || !actionQueueItemId} onClick={() => void handleDecision("pause")} />
            </div>

            <div className="mt-4 rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/60 p-4 text-sm text-blue-100/68">
              {decision ? `Decision recorded as ${labelize(decision)}.` : actionQueueItemId ? "Choose one decision and move on." : "This workspace has no queue item action attached."}
            </div>
          </div>

          <div className="premium-card rounded-2xl p-4">
            <div className="text-sm font-semibold text-white">Context</div>
            <div className="mt-3 space-y-2 text-sm text-blue-100/68">
              <ContextRow label="Queue item" value={queueItem?.title ?? "none"} />
              <ContextRow label="Creator" value={formatPersonLabel(data.selected_creator?.display_name, data.selected_creator?.username)} />
              <ContextRow label="Subscriber" value={formatPersonLabel(data.subscriber_context?.display_name, data.subscriber_context?.username)} />
              <ContextRow label="Conversation" value={conversation?.status ?? "unknown"} />
              <ContextRow label="Execution" value={conversation?.execution_mode ?? "unknown"} />
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}

function buildTimeline(data: ConversationWorkspaceData | null) {
  if (!data) return [];

  const messages = data.detail.outboundMessages.map((message) => ({
    key: `message:${message.id}`,
    kind: "message" as const,
    source: "Outbound message",
    title: message.final_text ?? message.draft_text ?? message.message_body,
    detail: message.status,
    time: formatDate(message.created_at)
  }));

  const history = data.detail.history.map((item) => ({
    key: `history:${item.id}`,
    kind: item.to_status === "waiting" ? ("waiting" as const) : ("history" as const),
    source: "Conversation history",
    title: item.detail ?? item.event_type,
    detail: `${labelize(String(item.from_status ?? "start"))} -> ${labelize(String(item.to_status ?? "current"))}`,
    time: formatDate(item.created_at)
  }));

  const events = data.recent_events.map((item) => ({
    key: `event:${item.id}`,
    kind: "history" as const,
    source: "Recent event",
    title: item.title,
    detail: item.detail ?? item.event_type,
    time: formatDate(item.occurred_at)
  }));

  return [...history, ...messages, ...events].sort((left, right) => String(right.time).localeCompare(String(left.time)));
}

function ActionButton({
  label,
  icon: Icon,
  active,
  disabled,
  onClick
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
        active
          ? "selected-glow text-white"
          : "border-blue-500/20 bg-[#0D1B2A]/72 text-blue-50 hover:border-cyan-300/40 hover:bg-[#1A3655]/70 disabled:cursor-not-allowed disabled:opacity-45"
      }`}
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </span>
      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${active ? "bg-white/12 text-white" : "bg-cyan-300/10 text-cyan-200"}`}>
        {active ? "Selected" : "Action"}
      </span>
    </button>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-blue-500/10 py-1.5 last:border-b-0">
      <span className="text-blue-100/52">{label}</span>
      <span className="max-w-[60%] text-right text-white">{value}</span>
    </div>
  );
}

function formatPersonLabel(displayName: string | null | undefined, username: string | null | undefined) {
  if (displayName && username) return `${displayName} (@${username})`;
  if (displayName) return displayName;
  if (username) return `@${username}`;
  return "Unknown person";
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "Review the current state and choose the next action.";
}

function stringValue(record: Record<string, unknown> | null | undefined, key: string) {
  if (!record) return null;
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function labelize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
