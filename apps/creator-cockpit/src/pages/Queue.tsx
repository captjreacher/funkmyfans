import { ClipboardList, RefreshCw, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ConversationWorkspace } from "../components/ConversationWorkspace";
import { applyQueueItemAction, fetchQueueWorkspace, type QueueItemAction, type QueueWorkspaceData } from "../lib/api";

type QueueWorkspaceItemSummary = QueueWorkspaceData["items"][number];

export function Queue() {
  const [data, setData] = useState<QueueWorkspaceData | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void refreshWorkspace();
  }, []);

  const selectedItem = useMemo(() => {
    if (!data) return null;
    const selectedId = selectedItemId ?? data.selected_item_id;
    return data.items.find((item) => item.id === selectedId) ?? data.items[0] ?? null;
  }, [data, selectedItemId]);

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

  if (detailOpen && selectedItem) {
    return (
      <main className="animate-in-soft">
        {selectedItem.conversation?.id ? (
          <ConversationWorkspace
            conversationId={selectedItem.conversation.id}
            queueItemId={selectedItem.id}
            onBack={() => setDetailOpen(false)}
            onResolved={() => {
              setDetailOpen(false);
              void refreshWorkspace();
            }}
          />
        ) : (
          <QueueItemActionWorkspace
            item={selectedItem}
            onBack={() => setDetailOpen(false)}
            onResolved={() => {
              setDetailOpen(false);
              void refreshWorkspace();
            }}
          />
        )}
      </main>
    );
  }

  const summary = data?.summary;
  const activeItems = (data?.items ?? []).filter((item) => item.status !== "resolved");

  return (
    <main className="animate-in-soft space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Queue</div>
          <h2 className="mt-1 text-2xl font-semibold text-white">Resolve human-required actions only</h2>
          <p className="mt-1 text-sm text-blue-100/58">Each row is one pending decision. Open it, decide, move on.</p>
        </div>
        <button type="button" onClick={() => void refreshWorkspace()} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
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

      <section className="premium-card overflow-hidden rounded-lg">
        <div className="flex items-center justify-between gap-3 border-b border-blue-500/18 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-white">Pending decisions</div>
            <div className="mt-1 text-sm text-blue-100/58">One row per human intervention.</div>
          </div>
          <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-sm font-semibold text-cyan-200">{activeItems.length}</span>
        </div>
        <div className="grid grid-cols-[1.3fr_0.75fr_0.7fr_0.8fr_0.65fr] gap-3 border-b border-blue-500/18 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100/52">
          <div>Action</div>
          <div>Subscriber</div>
          <div>Queue</div>
          <div>Reason</div>
          <div className="text-right">Priority</div>
        </div>
        <div className="divide-y divide-blue-500/12">
          {activeItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedItemId(item.id);
                setDetailOpen(true);
              }}
              className="grid w-full grid-cols-[1.3fr_0.75fr_0.7fr_0.8fr_0.65fr] items-center gap-3 px-4 py-3 text-left text-sm hover:bg-[#102338]/72"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-white">{item.title}</div>
                <div className="mt-0.5 truncate text-xs text-blue-100/52">{item.status_label} / {item.assignment_label ?? "Unassigned"}</div>
              </div>
              <div className="truncate text-blue-100/68">{compactPersonLabel(item.subscriber)}</div>
              <div className="truncate text-blue-100/68">{item.queue_label}</div>
              <div className="truncate text-blue-100/58">{item.priority_reason ?? "Review required"}</div>
              <div className="text-right">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${priorityTone(item.priority)}`}>{item.priority}</span>
              </div>
            </button>
          ))}
          {!activeItems.length ? <div className="px-4 py-8 text-sm text-blue-100/58">No queue items need attention right now.</div> : null}
        </div>
      </section>
    </main>
  );
}

function QueueItemActionWorkspace({
  item,
  onBack,
  onResolved
}: {
  item: QueueWorkspaceItemSummary;
  onBack: () => void;
  onResolved: () => void;
}) {
  const [busyAction, setBusyAction] = useState<QueueItemAction | null>(null);

  async function runAction(action: QueueItemAction) {
    setBusyAction(action);
    try {
      await applyQueueItemAction(item.id, action, { actor: "operator" });
      if (action !== "assign") onResolved();
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-lg border border-blue-500/20 bg-[#0D1B2A]/72 px-3 py-2 text-sm font-semibold text-blue-50 hover:border-cyan-300/40">
        Back
      </button>
      <div className="premium-card rounded-lg p-4">
        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Queue item</div>
        <h2 className="mt-2 text-2xl font-semibold text-white">{item.title}</h2>
        <p className="mt-2 text-sm leading-6 text-blue-100/64">{item.priority_reason ?? "Review this pending decision and choose one operator action."}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {([
            ["approve_ai", "Approve AI"],
            ["respond", "Respond"],
            ["assign", "Assign"],
            ["ignore", "Ignore"],
            ["pause", "Pause"]
          ] as Array<[QueueItemAction, string]>).map(([action, label]) => (
            <button key={action} type="button" onClick={() => void runAction(action)} disabled={busyAction !== null} className="rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-sm font-semibold text-blue-50 disabled:opacity-45">
              {busyAction === action ? "Working..." : label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="premium-card rounded-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-cyan-300" aria-hidden="true" />
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
