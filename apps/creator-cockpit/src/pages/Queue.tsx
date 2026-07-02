import { ClipboardList, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ConversationWorkspace } from "../components/ConversationWorkspace";
import { fetchQueueWorkspace, type QueueWorkspaceData } from "../lib/api";

type QueueWorkspaceItemSummary = QueueWorkspaceData["items"][number];
type QueueWorkspaceQueueSummary = QueueWorkspaceData["queues"][number];

export function Queue() {
  const [data, setData] = useState<QueueWorkspaceData | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void refreshWorkspace();
  }, []);

  const selectedItem = useMemo(() => {
    if (!data) return null;
    const selectedId = selectedItemId ?? data.selected_item_id;
    return data.items.find((item) => item.id === selectedId) ?? data.items[0] ?? null;
  }, [data, selectedItemId]);

  const summary = data?.summary;

  async function refreshWorkspace() {
    setLoading(true);
    try {
      const next = await fetchQueueWorkspace(selectedItemId ? { itemId: selectedItemId } : {});
      setData(next);
      setSelectedItemId((current) => current ?? next.selected_item_id ?? next.items[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-4 animate-in-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Queue</div>
          <h2 className="mt-1 text-2xl font-semibold text-white">Resolve human-required actions only.</h2>
          <p className="mt-1 text-sm text-blue-100/58">
            Every queue item represents exactly one decision. The conversation provides context; the task stays in focus.
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

      {summary ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Visible" value={summary.visible_items} icon={ClipboardList} />
          <MetricCard label="Claimed" value={summary.claimed_items} icon={Sparkles} />
          <MetricCard label="Assigned" value={summary.assigned_items} icon={ClipboardList} />
          <MetricCard label="Overdue" value={summary.overdue_items} icon={Sparkles} />
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <aside className="premium-card rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 border-b border-blue-500/20 pb-3">
            <div>
              <div className="text-sm font-semibold text-white">Queue items</div>
              <div className="mt-1 text-sm text-blue-100/58">Sorted by priority, then due time.</div>
            </div>
            <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-sm font-semibold text-cyan-200">{data?.items.length ?? 0}</span>
          </div>

          <div className="mt-3 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {data?.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItemId(item.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  item.id === selectedItem?.id
                    ? "selected-glow border-cyan-300/20"
                    : "border-blue-500/15 bg-[#0D1B2A]/65 hover:border-cyan-300/30 hover:bg-[#102338]"
                }`}
              >
                <QueueItemRow item={item} />
              </button>
            ))}
            {!data?.items.length ? <div className="p-6 text-sm text-blue-100/58">No queue items need attention right now.</div> : null}
          </div>
        </aside>

        <section className="space-y-4">
          <div className="premium-card rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-cyan-300">Selected item</div>
                <h3 className="mt-1 text-xl font-semibold text-white">{selectedItem?.title ?? "Choose a queue item"}</h3>
                <p className="mt-2 text-sm leading-6 text-blue-100/58">
                  {selectedItem
                    ? `${selectedItem.queue_label} · ${selectedItem.assignment_label ?? "Unassigned"} · ${selectedItem.status_label}`
                    : "Pick a queue item to open its dedicated workspace."}
                </p>
              </div>
              {selectedItem ? <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${priorityTone(selectedItem.priority)}`}>{selectedItem.priority}</span> : null}
            </div>
          </div>

          {selectedItem?.conversation?.id ? (
            <ConversationWorkspace conversationId={selectedItem.conversation.id} onBack={() => undefined} />
          ) : (
            <div className="premium-card rounded-2xl p-6 text-sm text-blue-100/64">
              This item does not have a linked conversation yet.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function QueueItemRow({ item }: { item: QueueWorkspaceItemSummary }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">{item.title}</div>
          <div className="mt-1 truncate text-xs text-blue-100/54">{compactPersonLabel(item.subscriber)}</div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${priorityTone(item.priority)}`}>{item.priority}</span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-blue-100/58">
        <span className="rounded-full border border-blue-500/15 px-2.5 py-1">{item.queue_label}</span>
        <span className="rounded-full border border-blue-500/15 px-2.5 py-1">{item.status_label}</span>
        <span className="rounded-full border border-blue-500/15 px-2.5 py-1">{item.assignment_label ?? "Unassigned"}</span>
      </div>

      <div className="text-sm text-blue-100/68">{item.priority_reason ?? "No reason recorded."}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className="premium-card rounded-2xl p-4">
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

function compactPersonLabel(subscriber: QueueWorkspaceItemSummary["subscriber"]) {
  if (!subscriber) return "No subscriber";
  if (subscriber.display_name && subscriber.username) return `${subscriber.display_name} (@${subscriber.username})`;
  return subscriber.display_name ?? subscriber.username ?? "Unknown subscriber";
}

function priorityTone(priority: string) {
  if (priority === "urgent") return "bg-rose-400/16 text-rose-200";
  if (priority === "high") return "bg-amber-400/16 text-amber-200";
  if (priority === "medium") return "bg-cyan-300/14 text-cyan-200";
  return "bg-blue-400/12 text-blue-100";
}
