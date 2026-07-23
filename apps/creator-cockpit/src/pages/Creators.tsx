import { ArrowDownAZ, Plus, RefreshCw, Search, UserRoundCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { continueCreatorSyncAll, startCreatorSyncAll, type DashboardData, type SyncAllResponse } from "../lib/api";

export function Creators({
  data,
  onOpenCreator,
  onConnectCreator,
  onRefresh
}: {
  data: DashboardData;
  onOpenCreator: (id: string) => void;
  onConnectCreator: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("last_sync_at");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncAllResponse | null>(null);

  const latestSyncRuns = useMemo(() => {
    const runsByCreator = new Map<string, DashboardData["syncRuns"][number]>();
    const allRuns = [...data.syncRuns].filter((syncRun) => syncRun.sync_type === "all").sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)));
    for (const run of allRuns) {
      if (!runsByCreator.has(run.creator_id)) {
        runsByCreator.set(run.creator_id, run);
      }
    }
    return runsByCreator;
  }, [data.syncRuns]);

  const creators = useMemo(() => {
    return [...data.creators]
      .filter((creator) => status === "all" || creator.status === status)
      .filter((creator) => `${creator.username} ${creator.display_name ?? ""}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => {
        if (sort === "username") return a.username.localeCompare(b.username);
        return String(b.last_sync_at ?? "").localeCompare(String(a.last_sync_at ?? ""));
      });
  }, [data.creators, query, sort, status]);

  async function handleSync(creatorId: string) {
    setSyncingId(creatorId);
    setSyncError(null);
    try {
      let result = normalizeSyncAllResponse(await startCreatorSyncAll(creatorId));
      console.log(result.syncRunId, result.status, result.current_stage ?? result.stage, result.has_more ?? result.hasMore, "calling continue...");
      setSyncProgress(result);
      await onRefresh();

      while (result.status === "running" && (result.has_more ?? result.hasMore)) {
        result = normalizeSyncAllResponse(await continueCreatorSyncAll(creatorId));
        console.log(result.syncRunId, result.status, result.current_stage ?? result.stage, result.has_more ?? result.hasMore, "calling continue...");
        setSyncProgress(result);
        await onRefresh();
      }

      await onRefresh();
      if (result.status === "failed") {
        setSyncError(result.error?.message ?? "Sync failed");
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncingId(null);
      setSyncProgress(null);
    }
  }

  return (
    <main className="animate-in-soft space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Creators</div>
          <h2 className="mt-1 text-2xl font-semibold text-white">Manage creators</h2>
        </div>
        <button type="button" onClick={onConnectCreator} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Connect Creator
        </button>
      </div>

      <div className="premium-card rounded-lg p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <label className="command-card flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2">
            <Search className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search creators" className="w-full bg-transparent text-sm outline-none" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="command-card rounded-lg px-3 py-2 text-sm">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="connected">Connected</option>
            <option value="attention">Needs attention</option>
            <option value="paused">Paused</option>
            <option value="disconnected">Disconnected</option>
          </select>
          <label className="command-card flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
            <ArrowDownAZ className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="bg-transparent outline-none">
              <option value="last_sync_at">Last sync</option>
              <option value="username">Username</option>
            </select>
          </label>
        </div>
      </div>

      {syncError ? <div className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{syncError}</div> : null}
      {syncProgress ? (
        <div className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-50">
          Sync {syncProgress.syncRunId.slice(0, 8)} {syncProgress.current_stage ?? syncProgress.stage ?? "working"} {syncProgress.status} {(syncProgress.processed_count ?? syncProgress.processed) ?? 0} records
        </div>
      ) : null}

      <div className="premium-card overflow-hidden rounded-lg">
        <div className="grid grid-cols-[1.4fr_0.8fr_1fr_0.8fr_0.9fr] gap-3 border-b border-blue-500/18 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100/52">
          <div>Creator</div>
          <div>Status</div>
          <div>Sync state</div>
          <div>Last sync</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y divide-blue-500/12">
          {creators.map((creator) => {
            const latestRun = latestSyncRuns.get(creator.id);
            return (
              <div key={creator.id} className="grid grid-cols-[1.4fr_0.8fr_1fr_0.8fr_0.9fr] items-center gap-3 px-4 py-3">
                <button type="button" onClick={() => onOpenCreator(creator.id)} className="min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <UserRoundCheck className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
                    <div className="truncate font-semibold text-white">{creator.display_name || creator.username}</div>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-blue-100/54">@{creator.username} / {creator.platform_provider}</div>
                </button>
                <div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${creatorStatusTone(creator.status)}`}>{creator.status}</span></div>
                <div>{renderSyncState(latestRun)}</div>
                <div className="text-sm text-blue-100/66">{formatLastSync(creator.last_sync_at, latestRun)}</div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSync(creator.id)}
                    disabled={syncingId !== null}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400/20 bg-[#102338]/72 px-3 py-2 text-xs font-semibold text-blue-50 disabled:opacity-45"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncingId === creator.id ? "animate-spin" : ""}`} aria-hidden="true" />
                    {syncingId === creator.id ? "Syncing…" : latestRun?.status === "failed" ? "Retry" : "Sync All"}
                  </button>
                </div>
              </div>
            );
          })}
          {!creators.length ? <div className="px-4 py-6 text-sm text-blue-100/58">No creators match this filter.</div> : null}
        </div>
      </div>
    </main>
  );
}

function renderSyncState(run?: DashboardData["syncRuns"][number]) {
  if (!run) {
    return <span className="text-sm text-blue-100/54">Never synced</span>;
  }

  const processed = run.processed_count ?? run.records_processed ?? 0;
  const stage = run.current_stage ?? "working";

  if (run.status === "running") {
    return (
      <div className="space-y-1 text-sm text-cyan-50">
        <div className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">Syncing</div>
        <div className="text-xs text-blue-100/62">
          Syncing · {stage}
          {processed ? ` · ${processed} processed` : ""}
          {run.has_more === true ? " · more remaining" : ""}
        </div>
      </div>
    );
  }

  if (run.status === "success") {
    return (
      <div className="space-y-1 text-sm text-emerald-50">
        <div className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-100">Completed</div>
        <div className="text-xs text-blue-100/62">{processed ? `${processed} processed` : "Completed"}</div>
      </div>
    );
  }

  return (
    <div className="space-y-1 text-sm text-rose-50">
      <div className="inline-flex rounded-full border border-rose-400/25 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-100">Failed</div>
      <div className="truncate text-xs text-blue-100/62">{run.last_error ?? run.error_message ?? "Sync failed"}</div>
    </div>
  );
}

function formatLastSync(lastSyncAt: string | null | undefined, run?: DashboardData["syncRuns"][number]) {
  return formatDate(run?.status === "success" ? run.completed_at ?? lastSyncAt : lastSyncAt);
}

function normalizeSyncAllResponse(response: SyncAllResponse): SyncAllResponse {
  return {
    ...response,
    hasMore: response.hasMore ?? response.has_more ?? false,
    has_more: response.has_more ?? response.hasMore
  };
}

function creatorStatusTone(status: string) {
  if (status === "connected") return "bg-emerald-500/14 text-emerald-200";
  if (status === "pending") return "bg-amber-500/14 text-amber-200";
  if (status === "attention") return "bg-rose-500/14 text-rose-200";
  if (status === "paused") return "bg-slate-400/14 text-slate-200";
  return "bg-blue-400/12 text-blue-100";
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "Pending";
}
