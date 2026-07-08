// Standalone preview harness for the NODE-1B journey workspace components.
//
// The full cockpit needs the Cloudflare Worker API + Supabase, which are not
// runnable in every environment. This entry mounts the REAL journey components
// (JourneyCanvas, JourneyNodeCard, JourneyGroupBackdrop, JourneyNodeDrawer)
// with fixture journeys so the spatial canvas and drill-down can be validated
// in a browser. It is a validation/design harness, not a product surface.

import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { EMMA_NEW_SUBSCRIBER_JOURNEY_EXAMPLE, type PlaybookJourney } from "@funkmyfans/of-types";
import { JourneyCanvas } from "../components/journey/JourneyCanvas";
import { JourneyNodeDrawer } from "../components/journey/JourneyNodeDrawer";
import { INSTAGRAM_QUALIFICATION_JOURNEY_EXAMPLE } from "../lib/journeyExamples";
import "../styles.css";

const JOURNEYS: Array<{ key: string; label: string; journey: PlaybookJourney }> = [
  { key: "emma", label: "Emma · New Subscriber (3 nodes)", journey: EMMA_NEW_SUBSCRIBER_JOURNEY_EXAMPLE },
  { key: "instagram", label: "Instagram Qualification (6 nodes, branching + groups)", journey: INSTAGRAM_QUALIFICATION_JOURNEY_EXAMPLE }
];

function JourneyPreview() {
  const [activeKey, setActiveKey] = useState(JOURNEYS[0]!.key);
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);
  const active = JOURNEYS.find((item) => item.key === activeKey) ?? JOURNEYS[0]!;
  const openNode = useMemo(
    () => active.journey.graph.nodes.find((node) => node.id === openNodeId) ?? null,
    [active, openNodeId]
  );

  return (
    <div className="flex h-screen flex-col bg-[#0A0A0A] text-[#F3EEE8]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a1a26] px-5 py-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">NODE-1B preview</div>
          <h1 className="text-lg font-semibold text-white">Playbook journey canvas</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {JOURNEYS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setActiveKey(item.key);
                setOpenNodeId(null);
              }}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                item.key === activeKey ? "bg-cyan-400 text-slate-950" : "border border-white/15 bg-white/5 text-blue-50 hover:border-white/30"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <JourneyCanvas key={active.key} journey={active.journey} onOpenNode={setOpenNodeId} />
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
