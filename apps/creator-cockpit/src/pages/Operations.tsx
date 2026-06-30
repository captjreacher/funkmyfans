import { AlertTriangle, ClipboardCheck, LoaderCircle, Play, RefreshCw, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import type { ConversationOperationsDetail } from "@funkmyfans/of-types";
import { ConversationInspector } from "../components/ConversationInspector";
import {
  cancelOperationsConversation,
  duplicateConversationAsSimulation,
  exportOperationsConversation,
  fetchOperationsConversationDetail,
  fetchOperationsDashboard,
  restartOperationsConversation,
  resumeOperationsConversation,
  retryOperationsConversation,
  type OperationsDashboardData
} from "../lib/api";

const defaultFilters = {
  statusGroup: "all",
  executionMode: "all",
  search: ""
};

export function Operations() {
  const [filters, setFilters] = useState(defaultFilters);
  const [data, setData] = useState<OperationsDashboardData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationOperationsDetail | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void refresh();
  }, [filters.statusGroup, filters.executionMode, filters.search]);

  useEffect(() => {
    if (!selectedId) return;
    void loadDetail(selectedId);
  }, [selectedId]);

  async function refresh() {
    const next = await fetchOperationsDashboard(filters);
    setData(next);
    if (!selectedId && next.conversations[0]) {
      setSelectedId(next.conversations[0].id);
    }
  }

  async function loadDetail(conversationId: string) {
    const next = await fetchOperationsConversationDetail(conversationId);
    setDetail(next);
  }

  async function runAction(action: () => Promise<ConversationOperationsDetail>) {
    if (!selectedId) return;
    setBusy(true);
    try {
      const next = await action();
      setDetail(next);
      setSelectedId(next.conversation.id);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    if (!selectedId) return;
    setBusy(true);
    try {
      const exported = await exportOperationsConversation(selectedId);
      await navigator.clipboard.writeText(JSON.stringify(exported, null, 2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="space-y-6 animate-in-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white">Automation Operations</h2>
          <p className="mt-1 text-sm text-blue-100/58">Monitor live runtime state, intervene safely, and inspect full conversation lifecycles.</p>
        </div>
        <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total" value={String(data?.summary.total ?? 0)} icon={ClipboardCheck} />
        <MetricCard label="Active" value={String(data?.summary.active ?? 0)} icon={Play} />
        <MetricCard label="Waiting" value={String(data?.summary.waiting ?? 0)} icon={LoaderCircle} />
        <MetricCard label="Failed" value={String(data?.summary.failed ?? 0)} icon={AlertTriangle} />
        <MetricCard label="Alerts" value={String(data?.summary.healthAlerts.length ?? 0)} icon={ShieldAlert} />
      </section>

      <section className="premium-card rounded-2xl p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={filters.statusGroup}
            onChange={(event) => setFilters((current) => ({ ...current, statusGroup: event.target.value }))}
            className="rounded-2xl border border-blue-500/20 bg-[#0D1B2A] px-4 py-3 text-sm text-white outline-none"
          >
            <option value="all">All status groups</option>
            <option value="active">Active</option>
            <option value="waiting">Waiting</option>
            <option value="terminal">Terminal</option>
          </select>
          <select
            value={filters.executionMode}
            onChange={(event) => setFilters((current) => ({ ...current, executionMode: event.target.value }))}
            className="rounded-2xl border border-blue-500/20 bg-[#0D1B2A] px-4 py-3 text-sm text-white outline-none"
          >
            <option value="all">All execution modes</option>
            <option value="production">Production</option>
            <option value="simulation">Simulation</option>
          </select>
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search conversation, creator, or script"
            className="rounded-2xl border border-blue-500/20 bg-[#0D1B2A] px-4 py-3 text-sm text-white outline-none placeholder:text-blue-100/35"
          />
        </div>
      </section>

      {data?.summary.healthAlerts.length ? (
        <section className="grid gap-3 xl:grid-cols-3">
          {data.summary.healthAlerts.slice(0, 6).map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => setSelectedId(alert.conversation_id)}
              className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-left"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">{alert.severity}</div>
              <div className="mt-2 text-sm font-semibold text-white">{alert.title}</div>
              <div className="mt-1 text-sm text-amber-100/80">{alert.detail}</div>
            </button>
          ))}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="premium-card overflow-hidden rounded-2xl">
          <div className="border-b border-blue-500/20 px-5 py-4">
            <div className="text-base font-semibold text-white">Conversation Queue</div>
            <div className="mt-1 text-sm text-blue-100/58">Latest runtime items across production and simulation flows.</div>
          </div>
          <div className="divide-y divide-blue-500/10">
            {data?.conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setSelectedId(conversation.id)}
                className={`flex w-full items-start justify-between gap-4 px-5 py-4 text-left hover:bg-[#102338] ${selectedId === conversation.id ? "bg-[#102338]" : ""}`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{conversation.of_message_scripts?.name ?? "Untitled script"}</div>
                  <div className="mt-1 truncate text-xs text-blue-100/54">{conversation.id}</div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-semibold text-cyan-200">{conversation.status}</div>
                  <div className="mt-1 text-blue-100/54">{conversation.execution_mode}</div>
                </div>
              </button>
            ))}
            {!data?.conversations.length ? <div className="px-5 py-6 text-sm text-blue-100/58">No conversations matched the current filters.</div> : null}
          </div>
        </div>

        <ConversationInspector
          detail={detail}
          busy={busy}
          onRetry={() => void runAction(() => retryOperationsConversation(selectedId!))}
          onResume={() => void runAction(() => resumeOperationsConversation(selectedId!))}
          onCancel={() => {
            const reason = window.prompt("Cancellation reason", "Cancelled by operator");
            if (!reason) return;
            void runAction(() => cancelOperationsConversation(selectedId!, reason));
          }}
          onRestart={() => void runAction(() => restartOperationsConversation(selectedId!))}
          onDuplicateAsSimulation={() => void runAction(() => duplicateConversationAsSimulation(selectedId!))}
          onExport={() => void handleExport()}
        />
      </section>
    </main>
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
