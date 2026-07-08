// Standalone preview harness for the journey workspace components.
//
// The full cockpit needs the Cloudflare Worker API + Supabase, which are not
// runnable in every environment. This entry mounts the REAL journey components
// with fixture journeys so the spatial canvas, drill-down and (NODE-1C)
// persistence round-trip can be validated in a browser.
//
// NODE-1C note: the real app persists via PUT /scripts/:id/journey (Worker +
// Supabase). Here the transport is stubbed with localStorage so the SAME
// JourneyCanvas serialize path can be exercised end to end: move a node, Save,
// reload, and the position is restored.

import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { EMMA_NEW_SUBSCRIBER_JOURNEY_EXAMPLE, type JourneyGraph, type PlaybookJourney } from "@funkmyfans/of-types";
import { JourneyCanvas } from "../components/journey/JourneyCanvas";
import { JourneyNodeDrawer } from "../components/journey/JourneyNodeDrawer";
import { INSTAGRAM_QUALIFICATION_JOURNEY_EXAMPLE } from "../lib/journeyExamples";
import "../styles.css";

const STORAGE_PREFIX = "fmf.journeyPreview.v1.";

const JOURNEYS: Array<{ key: string; label: string; journey: PlaybookJourney }> = [
  { key: "emma", label: "Emma · New Subscriber (3 nodes)", journey: EMMA_NEW_SUBSCRIBER_JOURNEY_EXAMPLE },
  { key: "instagram", label: "Instagram Qualification (6 nodes, branching + groups)", journey: INSTAGRAM_QUALIFICATION_JOURNEY_EXAMPLE }
];

function loadStored(key: string): JourneyGraph | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? (JSON.parse(raw) as JourneyGraph) : null;
  } catch {
    return null;
  }
}

function JourneyPreview() {
  const [activeKey, setActiveKey] = useState(JOURNEYS[0]!.key);
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [draftGraph, setDraftGraph] = useState<JourneyGraph | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const base = JOURNEYS.find((item) => item.key === activeKey) ?? JOURNEYS[0]!;

  // Load the stored graph (persistence stub) and fall back to the fixture.
  const journey = useMemo<PlaybookJourney>(() => {
    const stored = loadStored(activeKey);
    return stored ? { ...base.journey, graph: stored } : base.journey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, reloadTick]);

  const baselineJson = useMemo(() => JSON.stringify(journey.graph), [journey]);
  const dirty = Boolean(draftGraph) && JSON.stringify(draftGraph) !== baselineJson;
  const persistedExists = loadStored(activeKey) !== null;
  const openNode = useMemo(() => journey.graph.nodes.find((node) => node.id === openNodeId) ?? null, [journey, openNodeId]);

  useEffect(() => {
    setDraftGraph(null);
    setSavedNote(null);
    setOpenNodeId(null);
  }, [activeKey, reloadTick]);

  function save() {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + activeKey, JSON.stringify(draftGraph ?? journey.graph));
      setSavedNote("Saved to localStorage");
      setReloadTick((tick) => tick + 1);
    } catch {
      setSavedNote("Save failed");
    }
  }

  function reloadFromStore() {
    setReloadTick((tick) => tick + 1);
  }

  function clearStore() {
    try {
      window.localStorage.removeItem(STORAGE_PREFIX + activeKey);
    } catch {
      /* ignore */
    }
    setReloadTick((tick) => tick + 1);
  }

  const saveStateLabel = dirty ? "Unsaved changes" : persistedExists ? "Saved" : "Not saved yet";

  return (
    <div className="flex h-screen flex-col bg-[#0A0A0A] text-[#F3EEE8]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a1a26] px-5 py-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">NODE-1B / 1C preview</div>
          <h1 className="text-lg font-semibold text-white">Playbook journey canvas + persistence</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {JOURNEYS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveKey(item.key)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                item.key === activeKey ? "bg-cyan-400 text-slate-950" : "border border-white/15 bg-white/5 text-blue-50 hover:border-white/30"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-[#2a1a26] px-5 py-2 text-sm">
        <span data-testid="save-state" className="mr-1 font-medium text-blue-100/60">{saveStateLabel}</span>
        <button type="button" onClick={save} disabled={!dirty} className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950 disabled:opacity-45">
          Save journey
        </button>
        <button type="button" onClick={reloadFromStore} className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-blue-50 hover:border-white/30">
          Reload from saved
        </button>
        <button type="button" onClick={clearStore} className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-blue-50 hover:border-white/30">
          Clear saved
        </button>
        {savedNote ? <span className="text-xs text-emerald-300/80">{savedNote}</span> : null}
      </div>

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <JourneyCanvas key={`${activeKey}:${reloadTick}`} journey={journey} onOpenNode={setOpenNodeId} onGraphChange={setDraftGraph} />
        <JourneyNodeDrawer node={openNode} onClose={() => setOpenNodeId(null)} />
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <JourneyPreview />
  </StrictMode>
);
