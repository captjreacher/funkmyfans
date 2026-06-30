import type { ReactNode } from "react";
import type { ConversationOperationsDetail, OfAutomationAuditTrailEntry, OfConversationHistoryItem, OfOutboundMessage } from "@funkmyfans/of-types";

function formatDate(value: string | null | undefined) {
  if (!value) return "n/a";
  return new Date(value).toLocaleString();
}

export function ConversationInspector({
  detail,
  busy,
  onRetry,
  onResume,
  onCancel,
  onRestart,
  onDuplicateAsSimulation,
  onExport
}: {
  detail: ConversationOperationsDetail | null;
  busy: boolean;
  onRetry: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRestart: () => void;
  onDuplicateAsSimulation: () => void;
  onExport: () => void;
}) {
  if (!detail) {
    return (
      <aside className="premium-card rounded-2xl p-5 text-sm text-blue-100/62">
        Select a conversation to inspect runtime state, history, outbound messages, and audit events.
      </aside>
    );
  }

  const conversation = detail.conversation;
  const canResume = conversation.status === "waiting_delay" || conversation.status === "waiting_reply" || conversation.status === "waiting_approval";
  const canRetry = conversation.status === "failed";

  return (
    <aside className="premium-card rounded-2xl">
      <div className="border-b border-blue-500/20 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Conversation Inspector</div>
            <div className="mt-2 text-lg font-semibold text-white">{conversation.of_message_scripts?.name ?? "Untitled script"}</div>
            <div className="mt-1 text-xs text-blue-100/54">{conversation.id}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton label="Retry" disabled={busy || !canRetry} onClick={onRetry} />
            <ActionButton label="Resume" disabled={busy || !canResume} onClick={onResume} />
            <ActionButton label="Cancel" disabled={busy} onClick={onCancel} />
            <ActionButton label="Restart" disabled={busy} onClick={onRestart} />
            <ActionButton label="Sim Copy" disabled={busy} onClick={onDuplicateAsSimulation} />
            <ActionButton label="Export" disabled={busy} onClick={onExport} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-5">
          <Panel title="Metadata">
            <InfoRow label="Status" value={conversation.status} />
            <InfoRow label="Mode" value={conversation.execution_mode} />
            <InfoRow label="Current step" value={conversation.current_step?.step_type ?? "n/a"} />
            <InfoRow label="Next step" value={conversation.next_step?.step_type ?? "n/a"} />
            <InfoRow label="Waiting until" value={formatDate(conversation.waiting_until)} />
            <InfoRow label="Last error" value={conversation.last_error ?? "n/a"} />
            <InfoRow label="Retries" value={String(conversation.retry_count ?? 0)} />
          </Panel>

          <Panel title="Variables">
            <pre className="overflow-x-auto rounded-2xl bg-[#091827] p-3 text-xs text-cyan-100">{JSON.stringify(conversation.variables, null, 2)}</pre>
          </Panel>

          <Panel title="Outbound Messages">
            <div className="space-y-3">
              {detail.outboundMessages.length ? (
                detail.outboundMessages.map((message: OfOutboundMessage) => (
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
          </Panel>
        </section>

        <section className="space-y-5">
          <Panel title="Timeline">
            <div className="space-y-3">
              {detail.history.map((item: OfConversationHistoryItem) => (
                <div key={item.id} className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-3">
                  <div className="flex items-center justify-between gap-3 text-xs text-blue-100/58">
                    <span>{item.event_type}</span>
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                  <div className="mt-2 text-sm font-medium text-white">{item.detail ?? "No detail recorded."}</div>
                  <div className="mt-1 text-xs text-blue-100/54">
                    {item.from_status ?? "start"} to {item.to_status ?? "current"}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Audit Trail">
            <div className="space-y-3">
              {detail.auditTrail.length ? (
                detail.auditTrail.map((item: OfAutomationAuditTrailEntry) => (
                  <div key={item.id} className="rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/65 p-3">
                    <div className="flex items-center justify-between gap-3 text-xs text-blue-100/58">
                      <span>{item.action}</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                    <div className="mt-2 text-sm text-white">{item.detail ?? "Audit event recorded."}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-blue-100/58">No audit entries for this conversation yet.</div>
              )}
            </div>
          </Panel>
        </section>
      </div>
    </aside>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-3 text-sm font-semibold text-white">{title}</div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-blue-500/10 py-2 text-sm last:border-b-0">
      <span className="text-blue-100/54">{label}</span>
      <span className="max-w-[60%] text-right text-white">{value}</span>
    </div>
  );
}

function ActionButton({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
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
