import { RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchOperationsAuditTrail } from "../lib/api";
import type { OfAutomationAuditTrailEntry } from "@funkmyfans/of-types";

export function AuditTrail() {
  const [entries, setEntries] = useState<OfAutomationAuditTrailEntry[]>([]);
  const [action, setAction] = useState("all");

  useEffect(() => {
    void refresh(action);
  }, [action]);

  async function refresh(nextAction: string) {
    const result = await fetchOperationsAuditTrail({ action: nextAction });
    setEntries(result.entries);
  }

  return (
    <main className="space-y-6 animate-in-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white">Audit</h2>
          <p className="mt-1 text-sm text-blue-100/58">Operator interventions and auditability for governed product actions.</p>
        </div>
        <div className="flex gap-3">
          <select
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="rounded-2xl border border-blue-500/20 bg-[#0D1B2A] px-4 py-3 text-sm text-white outline-none"
          >
            <option value="all">All actions</option>
            <option value="retry">Retry</option>
            <option value="resume">Resume</option>
            <option value="cancel">Cancel</option>
            <option value="restart">Restart</option>
            <option value="duplicate_as_simulation">Duplicate as simulation</option>
          </select>
          <button type="button" onClick={() => void refresh(action)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      <section className="premium-card rounded-2xl">
        <div className="border-b border-blue-500/20 px-5 py-4">
          <div className="flex items-center gap-2 text-base font-semibold text-white">
            <ShieldCheck className="h-5 w-5 text-cyan-300" aria-hidden="true" />
            Audit Entries
          </div>
        </div>
        <div className="divide-y divide-blue-500/10">
          {entries.map((entry) => (
            <div key={entry.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">{entry.action}</div>
                  <div className="mt-1 text-xs text-blue-100/54">{entry.conversation_instance_id ?? entry.id}</div>
                </div>
                <div className="text-right text-xs text-blue-100/58">
                  <div>{entry.actor_label ?? entry.actor_type}</div>
                  <div className="mt-1">{new Date(entry.created_at).toLocaleString()}</div>
                </div>
              </div>
              <div className="mt-2 text-sm text-blue-100/74">{entry.detail ?? "No detail recorded."}</div>
            </div>
          ))}
          {!entries.length ? <div className="px-5 py-6 text-sm text-blue-100/58">No audit entries matched the current filters.</div> : null}
        </div>
      </section>
    </main>
  );
}
