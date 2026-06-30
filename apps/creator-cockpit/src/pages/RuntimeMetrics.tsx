import { BarChart3, Clock3, RefreshCw, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { ConversationOperationsMetrics } from "@funkmyfans/of-types";
import { fetchOperationsMetrics } from "../lib/api";

export function RuntimeMetrics() {
  const [data, setData] = useState<ConversationOperationsMetrics | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const next = await fetchOperationsMetrics();
    setData(next);
  }

  return (
    <main className="space-y-6 animate-in-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white">Runtime Metrics</h2>
          <p className="mt-1 text-sm text-blue-100/58">Aggregated operational telemetry for throughput, bottlenecks, and health.</p>
        </div>
        <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total" value={String(data?.summary.total ?? 0)} icon={BarChart3} />
        <MetricCard label="Overdue" value={String(data?.summary.overdue ?? 0)} icon={ShieldAlert} />
        <MetricCard label="Awaiting Approval" value={String(data?.summary.awaitingApproval ?? 0)} icon={Clock3} />
        <MetricCard label="Awaiting Reply" value={String(data?.summary.awaitingReply ?? 0)} icon={Clock3} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card title="Status Mix">
          <div className="space-y-3">
            {Object.entries(data?.statusCounts ?? {}).map(([status, count]: [string, number]) => (
              <div key={status} className="flex items-center justify-between rounded-2xl bg-[#0D1B2A]/70 px-4 py-3 text-sm">
                <span className="text-blue-100/60">{status}</span>
                <span className="font-semibold text-white">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Waiting Buckets">
          <div className="space-y-3">
            {(data?.waitingBuckets ?? []).map((bucket: ConversationOperationsMetrics["waitingBuckets"][number]) => (
              <div key={bucket.label} className="flex items-center justify-between rounded-2xl bg-[#0D1B2A]/70 px-4 py-3 text-sm">
                <span className="text-blue-100/60">{bucket.label}</span>
                <span className="font-semibold text-white">{bucket.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Top Scripts">
          <div className="space-y-3">
            {(data?.scriptCounts ?? []).map((item: ConversationOperationsMetrics["scriptCounts"][number]) => (
              <div key={item.script_id} className="flex items-center justify-between rounded-2xl bg-[#0D1B2A]/70 px-4 py-3 text-sm">
                <span className="truncate text-blue-100/60">{item.script_name}</span>
                <span className="font-semibold text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Top Creators">
          <div className="space-y-3">
            {(data?.creatorCounts ?? []).map((item: ConversationOperationsMetrics["creatorCounts"][number]) => (
              <div key={item.creator_id} className="flex items-center justify-between rounded-2xl bg-[#0D1B2A]/70 px-4 py-3 text-sm">
                <span className="truncate text-blue-100/60">{item.creator_name}</span>
                <span className="font-semibold text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card title="Daily Volume">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          {(data?.dailyVolume ?? []).map((item: ConversationOperationsMetrics["dailyVolume"][number]) => (
            <div key={item.date} className="rounded-2xl bg-[#0D1B2A]/70 p-4 text-sm">
              <div className="text-blue-100/54">{item.date}</div>
              <div className="mt-3 text-white">Started: {item.started}</div>
              <div className="mt-1 text-white">Completed: {item.completed}</div>
              <div className="mt-1 text-white">Failed: {item.failed}</div>
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="premium-card rounded-2xl p-5">
      <div className="mb-4 text-base font-semibold text-white">{title}</div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof BarChart3 }) {
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
