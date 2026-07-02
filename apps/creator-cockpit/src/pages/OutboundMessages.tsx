import { AlertCircle, CheckCircle2, Clock3, Send, ShieldAlert, UserRoundPen, XCircle } from "lucide-react";
import type { OfOutboundMessage } from "@funkmyfans/of-types";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { fetchOutboundMessages, updateOutboundMessage } from "../lib/api";
import { buildOutboundBuckets } from "../lib/outboundBuckets";

export function OutboundMessages() {
  const [messages, setMessages] = useState<OfOutboundMessage[]>([]);
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshMessages();
  }, []);

  const queues = useMemo(() => {
    const buckets = buildOutboundBuckets(messages);
    return {
      needsApproval: buckets.needsApproval,
      humanReview: buckets.humanReview,
      readyToSend: buckets.readyToSend,
      sending: buckets.sending,
      sent: buckets.sent,
      failed: buckets.failed
    };
  }, [messages]);

  async function refreshMessages() {
    try {
      const result = await fetchOutboundMessages();
      setMessages(result.messages);
      setError(null);
    } catch (loadError) {
      setError(errorMessage(loadError));
    }
  }

  async function saveEdit(message: OfOutboundMessage) {
    const nextText = currentDraft(message, draftEdits);
    await runMessageAction(message.id, () => updateOutboundMessage(message.id, { draft_text: nextText, edited_by: "operator" }));
  }

  async function approveDraft(message: OfOutboundMessage) {
    const finalText = currentDraft(message, draftEdits);
    await runMessageAction(message.id, () =>
      updateOutboundMessage(message.id, {
        draft_text: finalText,
        final_text: finalText,
        approval_status: "approved",
        approved_by: "operator",
      }),
    );
  }

  async function rejectDraft(message: OfOutboundMessage) {
    await runMessageAction(message.id, () =>
      updateOutboundMessage(message.id, {
        approval_status: "rejected",
        approved_by: "operator",
        reason: "Rejected by operator",
      }),
    );
  }

  async function markNeedsHumanFollowUp(message: OfOutboundMessage) {
    await runMessageAction(message.id, () =>
      updateOutboundMessage(message.id, {
        status: "failed",
        approved_by: "operator",
        reason: "Needs human follow-up",
        error_message: "Needs human follow-up",
      }),
    );
  }

  async function runMessageAction(messageId: string, task: () => Promise<{ message: OfOutboundMessage }>) {
    try {
      setBusyId(messageId);
      const result = await task();
      setMessages((current) => current.map((item) => (item.id === messageId ? result.message : item)));
      setError(null);
    } catch (actionError) {
      setError(errorMessage(actionError));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="space-y-5">
      <section className="glass-panel rounded-[28px] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300/80">Outbound Approval</div>
            <h1 className="mt-2 text-3xl font-semibold text-white">Safe outbound review queue for daily agency operations</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-blue-100/70">
              Review what needs approval, see what is actively sending, and keep anything uncertain inside a human-controlled loop.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshMessages()}
            className="rounded-2xl border border-blue-400/20 bg-[#102338]/72 px-4 py-3 text-sm font-semibold text-blue-50"
          >
            Refresh Queue
          </button>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <CountCard label="Needs Approval" value={queues.needsApproval.length} icon={Clock3} />
        <CountCard label="Human Review" value={queues.humanReview.length} icon={ShieldAlert} />
        <CountCard label="Ready to Send" value={queues.readyToSend.length} icon={Send} />
        <CountCard label="Sending" value={queues.sending.length} icon={Send} />
        <CountCard label="Sent" value={queues.sent.length} icon={CheckCircle2} />
        <CountCard label="Failed" value={queues.failed.length} icon={AlertCircle} />
      </section>

      <QueueSection
        title="Needs Approval"
        subtitle="Drafts that are blocked until an operator reviews, edits, rejects, or escalates them."
        icon={ShieldAlert}
        tone="approval"
      >
        {queues.needsApproval.length ? (
          <div className="grid gap-4">
            {queues.needsApproval.map((message) => {
              const draftText = currentDraft(message, draftEdits);
              const changed = draftText !== (message.draft_text ?? message.message_body);
              const busy = busyId === message.id;
              return (
                <article key={message.id} className="rounded-[24px] border border-amber-400/15 bg-[#091827]/55 p-4">
                  <MessageMetaRow message={message} />
                  <label className="mt-4 block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-100/58">Message Preview</div>
                    <textarea
                      value={draftText}
                      onChange={(event) => setDraftEdits((current) => ({ ...current, [message.id]: event.target.value }))}
                      className="command-card min-h-32 w-full rounded-2xl px-4 py-3 text-sm leading-6 text-blue-50"
                    />
                  </label>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!changed || busy}
                      onClick={() => void saveEdit(message)}
                      className="rounded-2xl border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50 disabled:opacity-40"
                    >
                      <span className="inline-flex items-center gap-2">
                        <UserRoundPen className="h-4 w-4" aria-hidden="true" />
                        Edit Before Approve
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void approveDraft(message)}
                      className="selected-glow rounded-2xl px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void rejectDraft(message)}
                      className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100 disabled:opacity-40"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void markNeedsHumanFollowUp(message)}
                      className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-100 disabled:opacity-40"
                    >
                      Mark as Needs Human Follow-up
                    </button>
                  </div>
                  {policySummary(message) ? <div className="mt-3 text-sm leading-6 text-amber-100/82">{policySummary(message)}</div> : null}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState copy="No drafts are waiting for approval right now." />
        )}
      </QueueSection>

      <MessageGroup
        title="Ready to Send"
        subtitle="Messages that have cleared review and are ready for dispatch."
        icon={Send}
        tone="ready"
        messages={queues.readyToSend}
      />
      <MessageGroup title="Sending" subtitle="Messages currently moving through delivery." icon={Send} tone="sending" messages={queues.sending} />
      <MessageGroup title="Sent" subtitle="Delivered outbound history for quick spot checks." icon={CheckCircle2} tone="sent" messages={queues.sent} />
      <MessageGroup
        title="Failed"
        subtitle="Messages that failed delivery or were rejected after review."
        icon={XCircle}
        tone="failed"
        messages={queues.failed}
      />
      <MessageGroup
        title="Human Review"
        subtitle="Messages that need operator judgment before any further action."
        icon={ShieldAlert}
        tone="review"
        messages={queues.humanReview}
      />
    </main>
  );
}

function MessageGroup({
  title,
  subtitle,
  icon,
  tone,
  messages,
}: {
  title: string;
  subtitle: string;
  icon: typeof Send;
  tone: "ready" | "sending" | "sent" | "failed" | "review";
  messages: OfOutboundMessage[];
}) {
  return (
    <QueueSection title={title} subtitle={subtitle} icon={icon} tone={tone}>
      {messages.length ? (
        <div className="grid gap-3">
          {messages.map((message) => (
            <article key={message.id} className="rounded-[24px] border border-blue-400/15 bg-[#091827]/55 p-4">
              <MessageMetaRow message={message} />
              <div className="mt-4 rounded-2xl bg-[#071423]/80 px-4 py-3 text-sm leading-6 text-blue-50">
                {message.final_text ?? message.draft_text ?? message.message_body}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-blue-100/62">
                <StatusPill label={message.status} tone={tone} />
                <StatusPill label={`approval: ${message.approval_status}`} tone={tone} />
                {message.approved_by ? <StatusPill label={`actor: ${message.approved_by}`} tone={tone} /> : null}
                {message.failure_reason ?? message.error_message ? <StatusPill label={message.failure_reason ?? message.error_message ?? ""} tone="failed" /> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState copy={`No messages in ${title.toLowerCase()} right now.`} />
      )}
    </QueueSection>
  );
}

function QueueSection({
  title,
  subtitle,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof Send;
  tone: "approval" | "ready" | "sending" | "sent" | "failed" | "review";
  children: ReactNode;
}) {
  const toneClass =
    tone === "approval"
      ? "text-amber-200"
      : tone === "ready"
        ? "text-cyan-200"
      : tone === "sending"
        ? "text-cyan-200"
        : tone === "sent"
          ? "text-emerald-200"
          : tone === "review"
            ? "text-violet-200"
            : "text-rose-200";
  return (
    <section className="glass-panel rounded-[28px] p-5">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ${toneClass}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <div className="text-lg font-semibold text-white">{title}</div>
          <div className="text-sm text-blue-100/64">{subtitle}</div>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MessageMetaRow({ message }: { message: OfOutboundMessage }) {
  const meta = messageMetadata(message);
  return (
    <div className="grid gap-3 xl:grid-cols-[1.1fr_1.1fr_1fr_1fr_0.9fr_1fr]">
      <MetaBlock label="Creator" value={creatorLabel(message)} />
      <MetaBlock label="Fan" value={message.fan_id} />
      <MetaBlock label="Source Rule" value={meta.sourceRuleName} />
      <MetaBlock label="Source Script" value={meta.sourceScriptName} />
      <MetaBlock label="Approval Mode" value={meta.approvalMode} />
      <MetaBlock label="Created" value={date(message.created_at)} />
    </div>
  );
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-blue-400/15 bg-[#071423]/72 px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100/56">{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function CountCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Clock3 }) {
  return (
    <div className="premium-card rounded-[24px] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">{label}</div>
          <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ copy }: { copy: string }) {
  return <div className="rounded-[24px] border border-blue-400/15 bg-[#091827]/55 px-4 py-6 text-sm text-blue-100/60">{copy}</div>;
}

function StatusPill({ label, tone }: { label: string; tone: "ready" | "sending" | "sent" | "failed" | "review" }) {
  const className =
    tone === "ready"
      ? "bg-cyan-400/12 text-cyan-200"
      : tone === "sending"
      ? "bg-cyan-400/12 text-cyan-200"
      : tone === "sent"
        ? "bg-emerald-500/12 text-emerald-200"
        : tone === "failed"
          ? "bg-rose-500/12 text-rose-200"
          : "bg-violet-500/12 text-violet-200";
  return <span className={`rounded-full px-2.5 py-1 font-semibold ${className}`}>{label}</span>;
}

function messageMetadata(message: OfOutboundMessage) {
  const metadata = message.metadata && typeof message.metadata === "object" ? message.metadata : {};
  return {
    sourceRuleName: stringFromMeta(metadata, "source_rule_name") ?? "Direct script",
    sourceScriptName: stringFromMeta(metadata, "source_script_name") ?? message.of_message_scripts?.name ?? message.script_id ?? "Unknown script",
    approvalMode: stringFromMeta(metadata, "approval_mode") ?? stringFromMeta(metadata, "resolved_action_mode") ?? message.approval_status,
  };
}

function policySummary(message: OfOutboundMessage) {
  const metadata = message.metadata && typeof message.metadata === "object" ? message.metadata : {};
  return stringFromMeta(metadata, "policy_summary");
}

function stringFromMeta(value: object, key: string) {
  const record = value as Record<string, unknown>;
  return typeof record[key] === "string" && record[key] ? String(record[key]) : null;
}

function currentDraft(message: OfOutboundMessage, draftEdits: Record<string, string>) {
  return draftEdits[message.id] ?? message.draft_text ?? message.message_body;
}

function creatorLabel(message: OfOutboundMessage) {
  return message.of_creators?.display_name ?? message.of_creators?.username ?? message.creator_id;
}

function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected outbound message error";
}
