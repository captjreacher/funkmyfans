import {
  ArrowRight,
  ChevronLeft,
  ClipboardCheck,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { ConversationOperationsDetail } from "@funkmyfans/of-types";
import {
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
        Select a work item to open the Conversation Workspace.
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
  const canRestart = conversation.status === "completed" || conversation.status === "cancelled";
  const currentQueueItem = data.current_queue_item;
  const personLabel = formatPersonLabel(data.subscriber_context?.display_name, data.subscriber_context?.username);
  const nextMove = deriveNextMove(data);
  const primaryAction = derivePrimaryAction({
    loading,
    busy,
    canResume,
    canRetry,
    canRestart,
    onRefresh: () => void refreshWorkspace(),
    onResume: () => void runAction(() => resumeOperationsConversation(conversation.id)),
    onRetry: () => void runAction(() => retryOperationsConversation(conversation.id)),
    onRestart: () => void runAction(() => restartOperationsConversation(conversation.id))
  });
  const coreSummary = firstNonEmpty(
    stringValue(data.detail.relationship, "operator_briefing"),
    stringValue(data.detail.relationship, "recommended_next_action"),
    stringValue(data.detail.subscriber, "recommended_next_action"),
    currentQueueItem?.priority_reason,
    conversation.waiting_reason,
    conversation.last_error,
    "This person is ready for a quick review."
  );

  return (
    <main className="space-y-4 animate-in-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-[#0D1B2A]/72 px-3 py-2 text-sm font-semibold text-blue-50 hover:border-cyan-300/40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back to work list
          </button>
          <h2 className="text-2xl font-semibold text-white">What should I do next?</h2>
          <p className="mt-1 text-sm text-blue-100/58">
            One screen to understand the person, the current state, and the next move without thinking about the underlying system.
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

      <section className="premium-card rounded-[1.5rem] p-4">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Decision first
            </div>
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">{personLabel}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/68">
                The workspace starts with the answer, then shows just enough evidence to justify it.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill tone="cyan">{formatRuntimeStatus(conversation.status)}</Pill>
              <Pill tone="blue">{formatLifecycleState(conversation.lifecycle_state)}</Pill>
              <Pill tone="slate">{data.subscriber_context?.subscription_status ?? "Subscription unknown"}</Pill>
              <Pill tone="amber">{data.subscriber_context?.urgency_score != null ? `Urgency ${data.subscriber_context.urgency_score}` : "Urgency unknown"}</Pill>
              <Pill tone="emerald">
                {data.subscriber_context?.lifetime_spend != null ? `$${data.subscriber_context.lifetime_spend.toLocaleString()} lifetime spend` : "Spend unknown"}
              </Pill>
            </div>

            <div className="grid gap-2.5 md:grid-cols-3">
              <MiniCard label="Next move" value={nextMove.title} detail={nextMove.detail} />
              <MiniCard label="Current state" value={formatCurrentStep(conversation.current_step?.step_type, conversation.next_step?.step_type)} detail={formatDate(conversation.updated_at)} />
              <MiniCard label="Latest signal" value={formatLatestSignal(data.recent_events[0] ?? null)} detail={data.recent_events.length ? formatDate(data.recent_events[0].occurred_at) : "No recent signal"} />
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-cyan-300/15 bg-[#0D1B2A]/72 p-4 shadow-[0_24px_80px_rgba(0,0,0,.22)]">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Primary action</div>
            <div className="mt-2 text-xl font-semibold text-white">{primaryAction.label}</div>
            <p className="mt-2 text-sm leading-6 text-blue-100/68">{coreSummary}</p>

            <button
              type="button"
              disabled={busy || primaryAction.disabled}
              onClick={primaryAction.onClick}
              className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                primaryAction.variant === "danger"
                  ? "border border-rose-300/25 bg-rose-500/15 text-rose-100 hover:bg-rose-500/20"
                  : "border border-cyan-300/20 bg-cyan-400 px-4 py-3 text-slate-950 hover:bg-cyan-300"
              } disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              {primaryAction.buttonLabel}
            </button>

            <div className="mt-3 grid gap-1.5 text-sm text-blue-100/68">
              <div className="rounded-2xl border border-blue-500/12 bg-[#06111D]/70 px-3 py-1.5">
                {primaryAction.detail}
              </div>
              <div className="rounded-2xl border border-blue-500/12 bg-[#06111D]/70 px-3 py-1.5">
                {data.detail.relationship && stringValue(data.detail.relationship, "current_workflow") ? `Current workflow: ${stringValue(data.detail.relationship, "current_workflow")}` : "No workflow label is set."}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton label="Export" busy={busy} onClick={() => void handleExport()} />
              <ActionButton label="Duplicate as simulation" busy={busy} onClick={() => void runAction(() => duplicateConversationAsSimulation(conversation.id))} />
            </div>
          </div>
      </div>
    </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="State" value={formatLifecycleState(conversation.lifecycle_state)} icon={Sparkles} />
        <MetricCard label="Work item" value={currentQueueItem?.status_label ?? "none"} icon={ClipboardCheck} />
        <MetricCard label="Person state" value={data.subscriber_context?.relationship_state ?? "unknown"} icon={ShieldAlert} />
        <MetricCard label="Signals" value={String(data.recent_events.length)} icon={LoaderCircle} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <SummaryPanel title="Why this is the right move">
            <div className="space-y-2">
              <ContextField
                label="Recommended move"
                value={nextMove.title}
              />
              <ContextField
                label="Reason"
                value={nextMove.detail}
              />
              <ContextField
                label="Current step"
                value={conversation.current_step?.step_type ?? "none"}
              />
              <ContextField
                label="Up next"
                value={conversation.next_step?.step_type ?? "none"}
              />
              <ContextField
                label="Waiting on"
                value={formatWaitingReason(conversation.waiting_reason, conversation.waiting_until)}
              />
              <ContextField
                label="Last error"
                value={conversation.last_error ?? "none"}
              />
            </div>
          </SummaryPanel>

          <SummaryPanel title="Person summary">
            {data.subscriber_context ? (
              <div className="grid gap-1.5">
                <ContextField label="Person" value={personLabel} />
                <ContextField label="Relationship state" value={data.subscriber_context.relationship_state ?? "unknown"} />
                <ContextField label="Subscription status" value={data.subscriber_context.subscription_status ?? "unknown"} />
                <ContextField label="Urgency" value={data.subscriber_context.urgency_score != null ? String(data.subscriber_context.urgency_score) : "unknown"} />
                <ContextField
                  label="Lifetime spend"
                  value={data.subscriber_context.lifetime_spend != null ? `$${data.subscriber_context.lifetime_spend.toLocaleString()}` : "unknown"}
                />
                <ContextField
                  label="Briefing"
                  value={firstNonEmpty(
                    stringValue(data.detail.relationship, "operator_briefing"),
                    stringValue(data.detail.relationship, "recommended_next_action"),
                    stringValue(data.detail.subscriber, "recommended_next_action"),
                    "No briefing is available."
                  )}
                />
              </div>
            ) : (
              <div className="text-sm text-blue-100/58">No person summary is available for this work item.</div>
            )}
          </SummaryPanel>

          <details className="premium-card rounded-2xl p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.24em] text-blue-100/58">
              Technical detail
            </summary>
            <div className="mt-3 space-y-4">
              <SummaryPanel title="Work item">
                {currentQueueItem ? (
                  <div className="grid gap-1.5">
                    <ContextField label="Title" value={currentQueueItem.title} />
                    <ContextField label="Status" value={currentQueueItem.status_label} />
                    <ContextField label="Priority" value={`${currentQueueItem.priority.toUpperCase()} - ${currentQueueItem.priority_score}`} />
                    <ContextField label="Assignment" value={currentQueueItem.assignment_label ?? "Unassigned"} />
                    <ContextField label="Context label" value={currentQueueItem.queue_label} />
                    <ContextField label="Work item ID" value={currentQueueItem.id} />
                  </div>
                ) : (
                  <div className="text-sm text-blue-100/58">No linked work item is available yet.</div>
                )}
              </SummaryPanel>

              <SummaryPanel title="Routing context">
                {data.current_queue ? (
                  <div className="grid gap-2">
                    <ContextField label="Label" value={data.current_queue.label} />
                    <ContextField label="Name" value={data.current_queue.name} />
                    <ContextField label="Status" value={data.current_queue.operational_status} />
                    <ContextField label="Visibility" value={data.current_queue.visibility_state} />
                    <ContextField label="Priority" value={data.current_queue.priority} />
                    <ContextField label="Context ID" value={data.current_queue.id} />
                  </div>
                ) : (
                  <div className="text-sm text-blue-100/58">No routing context is linked to this item.</div>
                )}
              </SummaryPanel>
            </div>
          </details>
        </div>

        <div className="space-y-4">
          <SummaryPanel title="Recent signals">
            <div className="space-y-2.5">
              {data.recent_events.length ? (
                data.recent_events.slice(0, 3).map((event) => (
                  <div key={event.id} className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-2.5">
                    <div className="flex items-center justify-between gap-3 text-xs text-blue-100/58">
                      <span>{event.event_type}</span>
                      <span>{formatDate(event.occurred_at)}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">{event.title}</div>
                    {event.detail ? <div className="mt-1 text-sm text-blue-100/68">{event.detail}</div> : null}
                  </div>
                ))
              ) : (
                <div className="text-sm text-blue-100/58">No recent signals are linked yet.</div>
              )}
            </div>
          </SummaryPanel>

          <SummaryPanel title="Activity trail">
            <div className="space-y-2.5">
              {conversation.history.length ? (
                conversation.history.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-2.5">
                    <div className="flex items-center justify-between gap-3 text-xs text-blue-100/58">
                      <span>{item.event_type}</span>
                      <span>{formatDate(item.occurred_at)}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">{item.detail ?? "No detail recorded."}</div>
                    <div className="mt-1 text-xs text-blue-100/54">
                      {item.from_state ?? "start"} to {item.to_state ?? "current"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-blue-100/58">No activity trail has been recorded yet.</div>
              )}
            </div>
          </SummaryPanel>

          <SummaryPanel title="Operator history">
            <div className="space-y-2.5">
              {data.detail.auditTrail.length ? (
                data.detail.auditTrail.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-2.5">
                    <div className="flex items-center justify-between gap-3 text-xs text-blue-100/58">
                      <span>{item.action}</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                    <div className="mt-2 text-sm text-white">{item.detail ?? "Audit event recorded."}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-blue-100/58">No operator history has been recorded yet.</div>
              )}
            </div>
          </SummaryPanel>

          <SummaryPanel title="Recent outbound messages">
            <div className="space-y-2.5">
              {data.detail.outboundMessages.length ? (
                data.detail.outboundMessages.slice(0, 3).map((message) => (
                  <div key={message.id} className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-2.5">
                    <div className="flex items-center justify-between gap-3 text-xs text-blue-100/58">
                      <span>{message.status}</span>
                      <span>{formatDate(message.created_at)}</span>
                    </div>
                    <div className="mt-2 text-sm text-white">{message.final_text || message.draft_text || message.message_body}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-blue-100/58">No outbound messages have been recorded yet.</div>
              )}
            </div>
          </SummaryPanel>
        </div>
      </section>
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

function MiniCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-blue-500/12 bg-[#0D1B2A]/72 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/52">{label}</div>
      <div className="mt-2 text-base font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-blue-100/64">{detail}</div>
    </div>
  );
}

function Pill({ tone, children }: { tone: "cyan" | "blue" | "slate" | "amber" | "emerald"; children: ReactNode }) {
  const classes: Record<"cyan" | "blue" | "slate" | "amber" | "emerald", string> = {
    cyan: "bg-cyan-300/12 text-cyan-100 border-cyan-300/16",
    blue: "bg-blue-400/12 text-blue-100 border-blue-300/16",
    slate: "bg-slate-400/12 text-slate-100 border-slate-300/16",
    amber: "bg-amber-400/12 text-amber-100 border-amber-300/16",
    emerald: "bg-emerald-400/12 text-emerald-100 border-emerald-300/16"
  };

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${classes[tone]}`}>{children}</span>;
}

function ActionButton({
  label,
  busy,
  onClick
}: {
  label: string;
  busy?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function derivePrimaryAction(input: {
  loading: boolean;
  busy: boolean;
  canResume: boolean;
  canRetry: boolean;
  canRestart: boolean;
  onRefresh: () => void;
  onResume: () => void;
  onRetry: () => void;
  onRestart: () => void;
}) {
  if (input.canResume) {
    return {
      label: "Resume the thread",
      buttonLabel: "Resume",
      detail: "Continue from the current waiting state and let the existing flow move forward.",
      variant: "default" as const,
      disabled: input.busy || input.loading,
      onClick: input.onResume
    };
  }

  if (input.canRetry) {
    return {
      label: "Retry the failed step",
      buttonLabel: "Retry",
      detail: "Try the last step again after the failure has been cleared.",
      variant: "default" as const,
      disabled: input.busy || input.loading,
      onClick: input.onRetry
    };
  }

  if (input.canRestart) {
    return {
      label: "Restart from the source",
      buttonLabel: "Restart",
      detail: "Start a new pass using the same source context.",
      variant: "danger" as const,
      disabled: input.busy || input.loading,
      onClick: input.onRestart
    };
  }

  return {
      label: "Refresh the latest context",
      buttonLabel: input.loading ? "Refreshing..." : "Refresh",
      detail: "Nothing needs to be changed yet, so use the latest state before taking a further step.",
      variant: "default" as const,
      disabled: input.busy || input.loading,
      onClick: input.onRefresh
    };
  }

function deriveNextMove(data: ConversationWorkspaceData) {
  const relationshipBriefing = stringValue(data.detail.relationship, "operator_briefing");
  const relationshipAction = stringValue(data.detail.relationship, "recommended_next_action");
  const subscriberAction = stringValue(data.detail.subscriber, "recommended_next_action");
  const queueReason = data.current_queue_item?.priority_reason ?? null;
  const conversationReason = data.detail.conversation.waiting_reason ?? data.detail.conversation.last_error ?? null;

  const detail = firstNonEmpty(
    relationshipBriefing,
    relationshipAction,
    subscriberAction,
    queueReason,
    conversationReason,
    "Review the current state and keep the thread moving."
  );

  const title = firstNonEmpty(
    relationshipAction,
    subscriberAction,
    queueReason,
    conversationReason,
    "Review and decide"
  );

  return {
    title,
    detail
  };
}

function formatPersonLabel(displayName: string | null | undefined, username: string | null | undefined) {
  if (displayName && username) return `${displayName} (@${username})`;
  if (displayName) return displayName;
  if (username) return `@${username}`;
  return "Unknown person";
}

function formatCurrentStep(currentStep: string | null | undefined, nextStep: string | null | undefined) {
  const current = currentStep ? humanizeIdentifier(currentStep) : "No current step";
  const next = nextStep ? humanizeIdentifier(nextStep) : "No next step";
  return `${current} -> ${next}`;
}

function formatLatestSignal(event: ConversationWorkspaceData["recent_events"][number] | null) {
  return event ? humanizeIdentifier(event.event_type) : "No recent signal";
}

function formatRuntimeStatus(status: string) {
  return humanizeIdentifier(status).replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatLifecycleState(state: string) {
  return humanizeIdentifier(state).replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatWaitingReason(waitingReason: string | null, waitingUntil: string | null) {
  if (waitingReason && waitingUntil) return `${waitingReason} until ${formatDate(waitingUntil)}`;
  if (waitingReason) return waitingReason;
  if (waitingUntil) return `Waiting until ${formatDate(waitingUntil)}`;
  return "Not waiting";
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "unknown";
}

function stringValue(record: Record<string, unknown> | null | undefined, key: string) {
  if (!record) return null;
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function humanizeIdentifier(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
