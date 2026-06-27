import { ArrowDownAZ, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { DashboardData } from "../lib/api";

export function Creators({
  data,
  onOpenCreator,
  onConnectCreator
}: {
  data: DashboardData;
  onOpenCreator: (id: string) => void;
  onConnectCreator: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("last_sync_at");

  const creators = useMemo(() => {
    return [...data.creators]
      .filter((creator) => status === "all" || creator.status === status)
      .filter((creator) => {
        const searchText = `${creator.username} ${creator.display_name ?? ""}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      })
      .sort((a, b) => {
        if (sort === "username") return a.username.localeCompare(b.username);
        return String(b.last_sync_at ?? "").localeCompare(String(a.last_sync_at ?? ""));
      });
  }, [data.creators, query, sort, status]);

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-stone-950">Creators</h2>
          <p className="mt-1 text-sm text-stone-500">Manage connected creators, pending onboarding, and sync state.</p>
        </div>
        <button type="button" onClick={onConnectCreator} className="inline-flex items-center gap-2 rounded-md bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
          <Plus className="h-4 w-4" aria-hidden="true" />
          + Connect Creator
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-stone-200 bg-white p-3 md:flex-row md:items-center">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-stone-200 px-3 py-2">
          <Search className="h-4 w-4 text-stone-500" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search creators"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border border-stone-200 px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="connected">Connected</option>
          <option value="attention">Needs attention</option>
          <option value="paused">Paused</option>
          <option value="disconnected">Disconnected</option>
        </select>
        <label className="flex items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-sm">
          <ArrowDownAZ className="h-4 w-4 text-stone-500" aria-hidden="true" />
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="bg-transparent outline-none">
            <option value="last_sync_at">Last sync</option>
            <option value="username">Username</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {creators.map((creator) => (
          <button
            key={creator.id}
            type="button"
            onClick={() => onOpenCreator(creator.id)}
            className="rounded-md border border-stone-200 bg-white p-4 text-left shadow-sm hover:border-teal-500"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-stone-950">{creator.display_name || creator.username}</div>
                <div className="text-sm text-stone-500">@{creator.username}</div>
              </div>
              <span className={`rounded px-2 py-1 text-xs font-semibold ${creatorStatusTone(creator.status)}`}>{creator.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-stone-500">Platform</div>
                <div className="font-medium text-stone-900">{creator.platform_provider}</div>
              </div>
              <div>
                <div className="text-stone-500">Last sync</div>
                <div className="font-medium text-stone-900">{creator.last_sync_at ? new Date(creator.last_sync_at).toLocaleString() : "Pending"}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}

function creatorStatusTone(status: string) {
  if (status === "connected") return "bg-emerald-100 text-emerald-800";
  if (status === "pending") return "bg-amber-100 text-amber-900";
  if (status === "attention") return "bg-rose-100 text-rose-800";
  if (status === "paused") return "bg-slate-200 text-slate-700";
  return "bg-stone-100 text-stone-800";
}
