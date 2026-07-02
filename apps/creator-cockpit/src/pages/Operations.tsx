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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [data, setData] = useState<QueueWorkspaceData | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);

  useEffect(() => {
    void refreshWorkspace();
  }, [selectedItemId]);

  const selectedItem = useMemo(() => {
    if (!data) return null;
    const selectedId = selectedItemId ?? data.selected_item_id;
    return data.items.find((item) => item.id === selectedId) ?? data.items[0] ?? null;
  }, [data, selectedItemId]);

  const priorityItems = useMemo(() => {
    return [...(data?.items ?? [])].sort((left, right) => {
      const scoreDelta = right.priority_score - left.priority_score;
      if (scoreDelta !== 0) return scoreDelta;
      return priorityRank(left.priority) - priorityRank(right.priority);
    });
  }, [data]);

  async function refreshWorkspace() {
    setLoadingWorkspace(true);
    try {
      const next = await fetchQueueWorkspace(selectedItemId ? { itemId: selectedItemId } : {});
      setData(next);
    } finally {
      setLoadingWorkspace(false);
    }
  }

  function selectItem(item: QueueWorkspaceItemSummary) {
    setSelectedItemId(item.id);
  }

  return (
    <main className="space-y-4 animate-in-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white">What needs my attention first?</h2>
          <p className="mt-1 text-sm text-blue-100/58">
            Compact priority list on the left. Selected item summary on the right. One handoff button when it is ready.
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

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <aside className="premium-card rounded-2xl p-3.5">
          <div className="mb-2.5 flex items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">Priority list</div>
              <div className="mt-1 text-xs text-blue-100/58">Sorted by priority score.</div>
            </div>
            <span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">{priorityItems.length}</span>
          </div>
          <div className="max-h-[68vh] overflow-y-auto rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/58">
            {priorityItems.map((item) => (
              <PriorityItemRow key={item.id} item={item} selected={item.id === selectedItem?.id} onSelect={() => selectItem(item)} />
            ))}
            {!priorityItems.length ? <div className="px-4 py-5 text-sm text-blue-100/58">No queue items need attention right now.</div> : null}
          </div>
        </aside>

        <section className="premium-card rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">Selected item</div>
              <h3 className="mt-1.5 text-xl font-semibold text-white">{selectedItem?.title ?? "Select an item"}</h3>
              <div className="mt-1.5 text-sm leading-6 text-blue-100/58">
                {selectedItem
                  ? selectedItem.subscriber?.display_name || selectedItem.subscriber?.username
                    ? `${selectedItem.subscriber?.display_name ?? selectedItem.subscriber?.username}${selectedItem.subscriber?.username && selectedItem.subscriber?.display_name ? ` (@${selectedItem.subscriber.username})` : ""}`
                    : "No subscriber summary is linked"
                  : "A selected item summary will appear here."}
              </div>
            </div>
            {selectedItem ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${priorityTone(selectedItem.priority)}`}>{selectedItem.priority}</span> : null}
          </div>

          {selectedItem ? (
            <div className="mt-3 grid gap-1.5">
              <ContextField label="Queue" value={selectedItem.queue_label} />
              <ContextField label="Status" value={selectedItem.status_label} />
              <ContextField label="Assignment" value={selectedItem.assignment_label ?? "Unassigned"} />
              <ContextField label="Conversation" value={selectedItem.conversation?.status ?? "No linked conversation"} />
              <ContextField label="Updated" value={formatDate(selectedItem.updated_at)} />
              <ContextField label="Reason" value={selectedItem.priority_reason ?? "No reason recorded"} />
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-blue-500/12 bg-[#0D1B2A]/58 p-3.5 text-sm text-blue-100/58">
              Choose a queue item from the priority list to see its summary and hand it off.
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!selectedItem?.conversation?.id}
              onClick={() => (selectedItem?.conversation?.id ? onOpenConversationWorkspace(selectedItem.conversation.id) : undefined)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/24 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Open Conversation Workspace
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

function PriorityItemRow({
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
      className={`flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left transition ${
        selected ? "bg-[#102338]" : "hover:bg-[#102338]/72"
      }`}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">{item.title}</div>
        <div className="mt-1 truncate text-xs text-blue-100/54">{compactPersonLabel(item.subscriber)} - {item.queue_label}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${priorityTone(item.priority)}`}>{item.priority}</div>
        <div className="mt-1.5 text-xs text-blue-100/54">{item.status_label}</div>
      </div>
    </button>
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
      className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#102338] ${selected ? "bg-[#102338]" : ""}`}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">{queue.label}</div>
        <div className="mt-1 truncate text-xs text-blue-100/54">{queue.description ?? queue.name}</div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${queueTone(queue.operational_status)}`}>{queue.operational_status}</span>
          <span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
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
      className={`flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition hover:bg-[#102338] ${selected ? "bg-[#102338]" : ""}`}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">{item.title}</div>
        <div className="mt-1 truncate text-xs text-blue-100/54">
          {item.queue_label} - {item.id}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
          <span className={`rounded-full px-2.5 py-1 ${itemTone(item.status)}`}>{item.status_label}</span>
          <span className={`rounded-full px-2.5 py-1 ${lifecycleTone(item.conversation?.lifecycle_state ?? null)}`}>
            {item.conversation?.lifecycle_state ?? "unknown"}
          </span>
        </div>
        <div className="mt-2 text-sm text-blue-100/68">{item.assignment_label ? `Assigned to ${item.assignment_label}` : "Unassigned"}</div>
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
    <section className="premium-card rounded-2xl p-4">
      <div className="mb-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/58">{title}</div>
      {children}
    </section>
  );
}

function ContextField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-blue-500/10 py-1.5 text-sm last:border-b-0">
      <span className="text-blue-100/54">{label}</span>
      <span className="max-w-[60%] text-right text-white">{value}</span>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof ClipboardCheck }) {
  return (
    <div className="glass-panel rounded-2xl p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-blue-100/58">{label}</div>
          <div className="mt-1 text-xl font-semibold text-white">{value}</div>
        </div>
        <Icon className="h-4 w-4 text-cyan-300" aria-hidden="true" />
      </div>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}

function compactPersonLabel(subscriber: QueueWorkspaceItemSummary["subscriber"]) {
  if (!subscriber) return "No subscriber";
  if (subscriber.display_name && subscriber.username) return `${subscriber.display_name} (@${subscriber.username})`;
  return subscriber.display_name ?? subscriber.username ?? "Unknown subscriber";
}

function priorityRank(priority: string) {
  if (priority === "urgent") return 0;
  if (priority === "high") return 1;
  if (priority === "medium") return 2;
  return 3;
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
