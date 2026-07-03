import { RefreshCw, Route } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchJourneyWorkspace, type JourneyWorkspaceData } from "../lib/api";
import type { OfRevenueJourney } from "@funkmyfans/of-types";

export function Journeys() {
  const [workspace, setWorkspace] = useState<JourneyWorkspaceData | null>(null);
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadWorkspace();
  }, []);

  const journeys = useMemo(() => {
    const rows = workspace?.journeys ?? [];
    if (creatorFilter === "all") return rows;
    return rows.filter((journey) => journey.creator_id === creatorFilter);
  }, [creatorFilter, workspace?.journeys]);

  async function loadWorkspace() {
    setLoading(true);
    try {
      const result = await fetchJourneyWorkspace();
      setWorkspace(result);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load journeys");
    } finally {
      setLoading(false);
    }
  }

  if (!workspace) {
    return (
      <div className="glass-panel rounded-3xl p-6">
        <div className="mb-4 h-5 w-64 rounded-full shimmer" />
        <div className="text-sm text-blue-100/70">Loading journeys...</div>
      </div>
    );
  }

  return (
    <main className="space-y-4 animate-in-soft">
      <section className="glass-panel rounded-[28px] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-sm font-semibold text-cyan-200">
              <Route className="h-4 w-4" aria-hidden="true" />
              Journeys
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-white">Revenue journeys route source events into conversation flows.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100/68">
              A Journey connects a source channel, audience, trigger event, target channel, expected outcome, and linked flow.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadWorkspace()}
            className="inline-flex items-center gap-2 rounded-2xl border border-blue-400/20 bg-[#102338]/72 px-4 py-3 text-sm font-semibold text-blue-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <section className="premium-card rounded-2xl p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Journey registry</div>
            <div className="mt-1 text-sm text-blue-100/58">{journeys.length} configured</div>
          </div>
          <select value={creatorFilter} onChange={(event) => setCreatorFilter(event.target.value)} className="command-card rounded-2xl px-4 py-3 text-sm">
            <option value="all">All creators</option>
            {workspace.creators.map((creator) => (
              <option key={creator.id} value={creator.id}>
                {creator.display_name || creator.username}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[980px] divide-y divide-blue-500/12">
            <div className="grid grid-cols-[1.3fr_.8fr_.8fr_1fr_1fr_1fr_.7fr_1.1fr] gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100/52">
              <span>Journey</span>
              <span>Source</span>
              <span>Target</span>
              <span>Trigger</span>
              <span>Audience</span>
              <span>Outcome</span>
              <span>Status</span>
              <span>Linked Flow</span>
            </div>
            {journeys.map((journey) => (
              <JourneyRow key={journey.id} journey={journey} />
            ))}
          </div>
        </div>

        {!journeys.length ? <div className="mt-4 text-sm text-blue-100/58">No journeys match this creator filter.</div> : null}
      </section>
    </main>
  );
}

function JourneyRow({ journey }: { journey: OfRevenueJourney }) {
  return (
    <div className="grid grid-cols-[1.3fr_.8fr_.8fr_1fr_1fr_1fr_.7fr_1.1fr] gap-3 px-3 py-3 text-sm text-blue-100/72">
      <div>
        <div className="font-semibold text-white">{journey.name}</div>
        <div className="mt-1 text-xs text-blue-100/48">{journey.creator?.display_name || journey.creator?.username || "Creator"}</div>
      </div>
      <Token value={journey.source_channel} />
      <Token value={journey.target_channel} />
      <Token value={journey.trigger_event} />
      <Token value={journey.audience} />
      <Token value={journey.expected_outcome} />
      <Token value={journey.status} />
      <div className="font-medium text-blue-50">{journey.conversation_flow?.name ?? "Unlinked"}</div>
    </div>
  );
}

function Token({ value }: { value: string }) {
  return <div className="font-medium text-blue-50">{value.replace(/_/g, " ")}</div>;
}
