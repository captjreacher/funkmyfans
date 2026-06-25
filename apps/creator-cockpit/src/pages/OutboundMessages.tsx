import { AlertCircle, CheckCircle2, Clock3, Send } from "lucide-react";
import type { OfOutboundMessage } from "@funkmyfans/of-types";
import { useEffect, useMemo, useState } from "react";
import { fetchOutboundMessages, updateOutboundMessage } from "../lib/api";

export function OutboundMessages() {
  const [messages, setMessages] = useState<OfOutboundMessage[]>([]);
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshMessages();
  }, []);

  const queues = useMemo(() => {
    const drafts = messages.filter((message) => message.status === "pending_approval" || (message.approval_status === "pending" && message.status !== "failed"));
    const sent = messages.filter((message) => message.status === "sent");
    const queued = messages.filter((message) => message.status === "queued" || message.status === "sending");
    const failed = messages.filter((message) => message.status === "failed");
    const rejected = messages.filter((message) => message.approval_status === "rejected" || message.status === "rejected");
    return { drafts, sent, queued, failed, rejected };
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

  async function approveDraft(message: OfOutboundMessage) {
    const finalText = draftEdits[message.id] ?? message.draft_text ?? message.message_body;
    try {
      const result = await updateOutboundMessage(message.id, {
        draft_text: finalText,
        final_text: finalText,
        approval_status: "approved",
        approved_by: "operator"
      });
      setMessages((current) => current.map((item) => (item.id === message.id ? result.message : item)));
      setError(null);
    } catch (approveError) {
      setError(errorMessage(approveError));
    }
  }

  async function rejectDraft(message: OfOutboundMessage) {
    try {
      const result = await updateOutboundMessage(message.id, {
        approval_status: "rejected",
        approved_by: "operator"
      });
      setMessages((current) => current.map((item) => (item.id === message.id ? result.message : item)));
      setError(null);
    } catch (rejectError) {
      setError(errorMessage(rejectError));
    }
  }

  return (
    <main className="space-y-4">
      <section>
        <h1 className="text-2xl font-semibold text-stone-950">Outbound Operations</h1>
        <div className="mt-1 text-sm text-stone-500">Review generated drafts, monitor queued approvals, and audit sent automation messages.</div>
      </section>

      {error ? <div className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">{error}</div> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CountCard label="Drafts Awaiting Approval" value={queues.drafts.length} icon={Clock3} />
        <CountCard label="Sending" value={queues.queued.length} icon={Send} />
        <CountCard label="Sent Messages" value={queues.sent.length} icon={CheckCircle2} />
        <CountCard label="Failed" value={queues.failed.length} icon={AlertCircle} />
      </section>

      <DraftQueue
        messages={queues.drafts}
        draftEdits={draftEdits}
        onDraftEdit={(messageId, text) => setDraftEdits((current) => ({ ...current, [messageId]: text }))}
        onApprove={(message) => void approveDraft(message)}
        onReject={(message) => void rejectDraft(message)}
      />

      <MessageTable title="Sent Messages" messages={queues.sent} empty="No sent messages yet." />
      <MessageTable title="Sending" messages={queues.queued} empty="No approved messages are sending." />
      <MessageTable title="Failed Messages" messages={queues.failed} empty="No failed messages." />
      <MessageTable title="Rejected Messages" messages={queues.rejected} empty="No rejected messages." />
    </main>
  );
}

function DraftQueue({
  messages,
  draftEdits,
  onDraftEdit,
  onApprove,
  onReject
}: {
  messages: OfOutboundMessage[];
  draftEdits: Record<string, string>;
  onDraftEdit: (messageId: string, text: string) => void;
  onApprove: (message: OfOutboundMessage) => void;
  onReject: (message: OfOutboundMessage) => void;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-4 py-3">
        <h2 className="text-base font-semibold text-stone-950">Drafts Awaiting Approval</h2>
      </div>
      <table className="w-full min-w-[1080px] text-left text-sm">
        <thead className="bg-stone-100 text-stone-600">
          <tr>
            {["Creator", "Fan", "Script", "Draft", "Source Event", "Created", "Actions"].map((header) => (
              <th key={header} className="px-4 py-3 font-semibold">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {messages.map((message) => (
            <tr key={message.id} className="align-top">
              <td className="px-4 py-3 text-stone-700">{creatorLabel(message)}</td>
              <td className="px-4 py-3 text-stone-700">{message.fan_id}</td>
              <td className="px-4 py-3 text-stone-700">{message.of_message_scripts?.name ?? message.script_id ?? "manual"}</td>
              <td className="px-4 py-3">
                <textarea
                  value={draftEdits[message.id] ?? message.draft_text ?? message.message_body}
                  onChange={(event) => onDraftEdit(message.id, event.target.value)}
                  className="min-h-24 w-full rounded-md border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-teal-700"
                />
              </td>
              <td className="px-4 py-3 text-stone-700">{shortId(message.source_event_id)}</td>
              <td className="px-4 py-3 text-stone-700">{date(message.created_at)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => onApprove(message)} className="rounded-md bg-teal-700 px-2 py-1 text-xs font-semibold text-white">Approve</button>
                  <button type="button" onClick={() => onReject(message)} className="rounded-md border border-stone-200 px-2 py-1 text-xs font-semibold text-stone-700">Reject</button>
                </div>
              </td>
            </tr>
          ))}
          {!messages.length ? (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-stone-500">No drafts awaiting approval.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}

function MessageTable({ title, messages, empty }: { title: string; messages: OfOutboundMessage[]; empty: string }) {
  return (
    <section className="overflow-hidden rounded-md border border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-4 py-3">
        <h2 className="text-base font-semibold text-stone-950">{title}</h2>
      </div>
      <table className="w-full min-w-[1080px] text-left text-sm">
        <thead className="bg-stone-100 text-stone-600">
          <tr>
            {["Creator", "Fan", "Script", "Message", "Status", "Approval", "Event", "Created", "Sent", "Error"].map((header) => (
              <th key={header} className="px-4 py-3 font-semibold">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {messages.map((message) => (
            <tr key={message.id} className="align-top">
              <td className="px-4 py-3 text-stone-700">{creatorLabel(message)}</td>
              <td className="px-4 py-3 text-stone-700">{message.fan_id}</td>
              <td className="px-4 py-3 text-stone-700">{message.of_message_scripts?.name ?? message.script_id ?? "manual"}</td>
              <td className="max-w-md px-4 py-3 text-stone-700">{message.final_text ?? message.draft_text ?? message.message_body}</td>
              <td className="px-4 py-3 font-semibold text-stone-800">{message.status}</td>
              <td className="px-4 py-3 text-stone-700">{message.approval_status}</td>
              <td className="px-4 py-3 text-stone-700">{shortId(message.source_event_id)}</td>
              <td className="px-4 py-3 text-stone-700">{date(message.created_at)}</td>
              <td className="px-4 py-3 text-stone-700">{date(message.sent_at)}</td>
              <td className="px-4 py-3 text-stone-700">{message.failure_reason ?? message.error_message ?? "none"}</td>
            </tr>
          ))}
          {!messages.length ? (
            <tr>
              <td colSpan={10} className="px-4 py-6 text-stone-500">{empty}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
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

function creatorLabel(message: OfOutboundMessage) {
  return message.of_creators?.display_name ?? message.of_creators?.username ?? message.creator_id;
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "none";
}

function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected outbound message error";
}
