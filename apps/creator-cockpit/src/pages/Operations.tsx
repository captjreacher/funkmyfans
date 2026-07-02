import { AlertTriangle, ChevronRight, ClipboardCheck, LoaderCircle, RefreshCw, Search, ShieldAlert, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchQueueWorkspace, type QueueWorkspaceData } from "../lib/api";

type QueueWorkspaceItemSummary = QueueWorkspaceData["items"][number];
type QueueWorkspaceQueueSummary = QueueWorkspaceData["queues"][number];

const defaultFilters = {
  creatorId: "all",
  status: "all",
  priority: "all",
  queueId: "all",
  itemId: "",
  search: ""
};

export function Operations({
  onOpenConversationWorkspace
}: {
  onOpenConversationWorkspace: (conversationId: string) => void;
}) {
  const [filters, setFilters] = useState(defaultFilters);
  const [data, setData] = useState<QueueWorkspaceData | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);

  useEffect(() => {
    void refreshWorkspace();
  }, [filters.creatorId, filters.status, filters.priority, filters.queueId, filters.itemId, filters.search]);

  const selectedQueue = useMemo(() => {
    if (!data) return null;
    return data.queues.find((queue) => queue.id === data.selected_queue_id) ?? data.queues[0] ?? null;
  }, [data]);

  const selectedItem = useMemo(() => {
    if (!data) return null;
    return data.items.find((item) => item.id === data.selected_item_id) ?? data.items[0] ?? null;
  }, [data]);

  async function refreshWorkspace() {
    setLoadingWorkspace(true);
    try {
      const next = await fetchQueueWorkspace(filters);
      setData(next);
    } finally {
      setLoadingWorkspace(false);
    }
  }

  function selectQueue(queueId: string) {
    setFilters((current) => ({ ...current, queueId, itemId: "" }));
  }

  function selectItem(item: QueueWorkspaceItemSummary) {
    setFilters((current) => ({ ...current, itemId: item.id }));
  }

  const summary = data?.summary;

  return (
    <main className="space-y-6 animate-in-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white">Queue Workspace</h2>
          <p className="mt-1 text-sm text-blue-100/58">
            Work from queue counts first, keep the conversation workspace separate, and only open it when the item deserves a deeper look.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshWorkspace()}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
        >
          <RefreshCw className={`h-4 w-4 ${loadingWorkspace ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Queues" value={String(summary?.total_queues ?? 0)} icon={ClipboardCheck} />
        <MetricCard label="Items" value={String(summary?.total_items ?? 0)} icon={Sparkles} />
        <MetricCard label="Visible" value={String(summary?.visible_items ?? 0)} icon={ChevronRight} />
        <MetricCard label="Claimed" value={String(summary?.claimed_items ?? 0)} icon={LoaderCircle} />
        <MetricCard label="Assigned" value={String(summary?.assigned_items ?? 0)} icon={ShieldAlert} />
        <MetricCard label="Overdue" value={String(summary?.overdue_items ?? 0)} icon={AlertTriangle} />
      </section>

      <section className="premium-card rounded-2xl p-4">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_180px_180px_180px]">
          <label className="flex min-h-12 items-center gap-2 rounded-xl border border-blue-500/20 bg-[#0D1B2A]/72 px-3">
            <Search className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              className="w-full bg-transparent text-sm outline-none placeholder:text-blue-100/38 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B2A]"
              placeholder="Search queue items, conversations, subscribers, or assignments"
            />
          </label>
          <select
            value={filters.creatorId}
            onChange={(event) => setFilters((current) => ({ ...current, creatorId: event.target.value }))}
            className="rounded-xl border border-blue-500/20 bg-[#0D1B2A] px-4 py-3 text-sm text-white outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B2A]"
          >
            <option value="all">All creators</option>
          </select>
          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            className="rounded-xl border border-blue-500/20 bg-[#0D1B2A] px-4 py-3 text-sm text-white outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B2A]"
          >
            <option value="all">All queue statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting">Waiting</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="ignored">Ignored</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={filters.priority}
            onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
            className="rounded-xl border border-blue-500/20 bg-[#0D1B2A] px-4 py-3 text-sm text-white outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B2A]"
          >
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[320px_1fr_380px]">
        <div className="premium-card overflow-hidden rounded-2xl">
          <div className="border-b border-blue-500/20 px-5 py-4">
            <div className="text-base font-semibold text-white">Queues and Counts</div>
            <div className="mt-1 text-sm text-blue-100/58">Queue ownership, priority, and visible work.</div>
          </div>
          <div className="max-h-[720px] divide-y divide-blue-500/10 overflow-y-auto">
            {(data?.queues ?? []).map((queue) => (
              <QueueRow key={queue.id} queue={queue} selected={queue.id === data?.selected_queue_id} onSelect={() => selectQueue(queue.id)} />
            ))}
            {!data?.queues.length ? <div className="px-5 py-6 text-sm text-blue-100/58">No queues matched the current filters.</div> : null}
          </div>
        </div>

        <div className="premium-card overflow-hidden rounded-2xl">
          <div className="border-b border-blue-500/20 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-white">Queue Items</div>
                <div className="mt-1 text-sm text-blue-100/58">
                  {selectedQueue ? `${selectedQueue.label} - ${selectedQueue.item_count} items` : "Select a queue to review its items."}
                </div>
              </div>
              <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-sm font-semibold text-cyan-200">{data?.items.length ?? 0}</span>
            </div>
          </div>
          <div className="max-h-[720px] divide-y divide-blue-500/10 overflow-y-auto">
            {(data?.items ?? []).map((item) => (
              <QueueItemRow key={item.id} item={item} selected={item.id === data?.selected_item_id} onSelect={() => selectItem(item)} />
            ))}
            {!data?.items.length ? <div className="px-5 py-6 text-sm text-blue-100/58">No queue items matched the current filters.</div> : null}
          </div>
        </div>

        <div className="space-y-4">
          <section className="premium-card rounded-2xl p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Selected Item</div>
            <div className="mt-2 text-lg font-semibold text-white">{selectedItem?.title ?? "Select a queue item"}</div>
            <div className="mt-1 text-sm text-blue-100/58">{selectedItem?.queue_label ?? "Queue context will appear here."}</div>

            {selectedItem ? (
              <div className="mt-4 grid gap-3">
                <ContextField label="Queue Item Status" value={selectedItem.status_label} />
                <ContextField label="Priority" value={`${selectedItem.priority.toUpperCase()} - ${selectedItem.priority_score}`} />
                <ContextField label="Assignment" value={selectedItem.assignment_label ?? "Unassigned"} />
                <ContextField label="Conversation" value={selectedItem.conversation?.id ?? "No linked conversation"} />
                <ContextField label="Conversation Lifecycle" value={selectedItem.conversation?.lifecycle_state ?? "unknown"} />
                <ContextField label="Conversation Status" value={selectedItem.conversation?.status ?? "unknown"} />
              </div>
            ) : null}
          </section>

          <SummaryPanel title="Conversation Lifecycle">
            {data?.selected_item_context?.conversation ? (
              <div className="space-y-2">
                <ContextField label="Lifecycle" value={data.selected_item_context.conversation.lifecycle_state ?? "unknown"} />
                <ContextField label="Runtime Status" value={data.selected_item_context.conversation.status ?? "unknown"} />
                <ContextField label="Execution Mode" value={data.selected_item_context.conversation.execution_mode ?? "unknown"} />
                <ContextField label="Script" value={data.selected_item_context.conversation.script_name ?? "Untitled script"} />
                <ContextField
                  label="Creator"
                  value={
                    data.selected_item_context.conversation.creator
                      ? data.selected_item_context.conversation.creator.display_name ?? data.selected_item_context.conversation.creator.username
                      : "Unknown creator"
                  }
                />
                <ContextField label="Updated" value={formatDate(data.selected_item_context.conversation.updated_at)} />
              </div>
            ) : (
              <div className="text-sm text-blue-100/58">Select a queue item with a linked conversation to see lifecycle context.</div>
            )}
          </SummaryPanel>

          <SummaryPanel title="Subscriber Context">
            {data?.selected_item_context?.subscriber ? (
              <div className="space-y-2">
                <ContextField
                  label="Subscriber"
                  value={
                    data.selected_item_context.subscriber.display_name
                      ? `${data.selected_item_context.subscriber.display_name}${data.selected_item_context.subscriber.username ? ` (@${data.selected_item_context.subscriber.username})` : ""}`
                      : data.selected_item_context.subscriber.username ?? "Unknown subscriber"
                  }
                />
                <ContextField label="Relationship State" value={data.selected_item_context.subscriber.relationship_state ?? "unknown"} />
                <ContextField label="Subscription Status" value={data.selected_item_context.subscriber.subscription_status ?? "unknown"} />
                <ContextField label="Urgency" value={data.selected_item_context.subscriber.urgency_score != null ? String(data.selected_item_context.subscriber.urgency_score) : "unknown"} />
                <ContextField label="Lifetime Spend" value={data.selected_item_context.subscriber.lifetime_spend != null ? `$${data.selected_item_context.subscriber.lifetime_spend.toLocaleString()}` : "unknown"} />
              </div>
            ) : (
              <div className="text-sm text-blue-100/58">No subscriber summary is linked to the selected queue item.</div>
            )}
          </SummaryPanel>

          <SummaryPanel title="Recent Events">
            <div className="space-y-3">
              {data?.selected_item_context?.recent_events.length ? (
                data.selected_item_context.recent_events.map((event) => (
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
                <div className="text-sm text-blue-100/58">Recent conversation events will appear here once a queue item is selected.</div>
              )}
            </div>
          </SummaryPanel>

          <button
            type="button"
            disabled={!selectedItem?.conversation?.id}
            onClick={() => (selectedItem?.conversation?.id ? onOpenConversationWorkspace(selectedItem.conversation.id) : undefined)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/24 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-300/48 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Open Conversation Workspace
          </button>
        </div>
      </section>
    </main>
  );
}

function QueueRow({
  queue,
  selected,
  onSelect
}: {
  queue: QueueWorkspaceQueueSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition hover:bg-[#102338] ${selected ? "bg-[#102338]" : ""}`}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">{queue.label}</div>
        <div className="mt-1 truncate text-xs text-blue-100/54">{queue.description ?? queue.name}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${queueTone(queue.operational_status)}`}>{queue.operational_status}</span>
          <span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
            {queue.active_item_count} active
          </span>
        </div>
      </div>
      <div className="text-right text-xs">
        <div className="font-semibold text-white">{queue.item_count}</div>
        <div className="mt-1 text-blue-100/54">{queue.resolved_item_count} resolved</div>
      </div>
    </button>
  );
}

function QueueItemRow({
  item,
  selected,
  onSelect
}: {
  item: QueueWorkspaceItemSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-[#102338] ${selected ? "bg-[#102338]" : ""}`}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">{item.title}</div>
        <div className="mt-1 truncate text-xs text-blue-100/54">
          {item.queue_label} - {item.id}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
          <span className={`rounded-full px-2.5 py-1 ${itemTone(item.status)}`}>{item.status_label}</span>
          <span className={`rounded-full px-2.5 py-1 ${lifecycleTone(item.conversation?.lifecycle_state ?? null)}`}>
            {item.conversation?.lifecycle_state ?? "unknown"}
          </span>
        </div>
        <div className="mt-3 text-sm text-blue-100/68">{item.assignment_label ? `Assigned to ${item.assignment_label}` : "Unassigned"}</div>
      </div>
      <div className="text-right text-xs">
        <div className={`font-semibold ${priorityTone(item.priority)}`}>{item.priority.toUpperCase()}</div>
        <div className="mt-1 text-blue-100/54">{item.conversation?.status ?? "No conversation"}</div>
      </div>
    </button>
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

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}

function priorityTone(priority: string) {
  if (priority === "urgent") return "text-rose-200";
  if (priority === "high") return "text-amber-200";
  if (priority === "medium") return "text-cyan-200";
  return "text-blue-100";
}

function itemTone(status: string) {
  if (status === "resolved") return "bg-emerald-400/16 text-emerald-200";
  if (status === "claimed") return "bg-cyan-300/14 text-cyan-200";
  if (status === "assigned") return "bg-amber-400/16 text-amber-200";
  if (status === "moved") return "bg-violet-400/14 text-violet-200";
  return "bg-blue-400/12 text-blue-100";
}

function queueTone(status: string) {
  if (status === "archived") return "bg-slate-400/14 text-slate-200";
  if (status === "paused") return "bg-amber-400/16 text-amber-200";
  return "bg-cyan-300/10 text-cyan-200";
}

function lifecycleTone(state: string | null) {
  if (state === "completed") return "bg-emerald-400/16 text-emerald-200";
  if (state === "waiting") return "bg-amber-400/16 text-amber-200";
  if (state === "escalated") return "bg-rose-400/16 text-rose-200";
  if (state === "archived") return "bg-slate-400/14 text-slate-200";
  return "bg-blue-400/12 text-blue-100";
}
