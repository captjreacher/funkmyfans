import { ArrowUpRight, ChevronRight, PanelRightClose, Wrench } from "lucide-react";
import type { JourneyNode } from "@funkmyfans/of-types";
import { CONVERSATION_SURFACE_STAGES, JOURNEY_CLASS_META, journeyNodePurpose } from "../../lib/journey";

const STAGE_LABEL: Record<string, string> = {
  source: "Source",
  opening: "Opening",
  reply: "Reply",
  decision: "Decision",
  response: "Response",
  exit: "Exit"
};

// Focused, read-only drill-down for a single journey node. For a Conversation
// node it shows the intended operator surface (Source -> Opening -> Reply ->
// Decision -> Response -> Exit). It never shows runtime machinery. Full node
// editing is NODE-1D; the existing builder remains reachable underneath.
export function JourneyNodeDrawer({
  node,
  onClose,
  onOpenAdvanced
}: {
  node: JourneyNode | null;
  onClose: () => void;
  onOpenAdvanced?: (node: JourneyNode) => void;
}) {
  if (!node) return null;
  const meta = JOURNEY_CLASS_META[node.class];
  const Icon = meta.icon;
  const isConversation = node.class === "conversation";
  const stages = isConversation && node.config.surface?.length ? node.config.surface : [...CONVERSATION_SURFACE_STAGES];

  return (
    <aside className="absolute right-0 top-0 z-20 flex h-full w-[360px] max-w-[92%] flex-col border-l border-white/12 bg-[#0a1524]/97 backdrop-blur-xl">
      <header className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${meta.accent}1f`, color: meta.accent }}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: meta.accent }}>
              {meta.label}
            </div>
            <div className="text-sm font-semibold text-white">{node.label}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/10 p-1.5 text-blue-100/60 hover:border-white/25 hover:text-white"
          aria-label="Close node detail"
        >
          <PanelRightClose className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <p className="text-xs text-blue-100/62">
          {meta.blurb}. {journeyNodePurpose(node)}.
        </p>

        {isConversation ? (
          <section>
            <SectionTitle>Operator surface</SectionTitle>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {stages.map((stage, index) => (
                <span key={stage} className="inline-flex items-center gap-1.5">
                  <span className="rounded-md border border-white/12 bg-white/5 px-2 py-1 text-[11px] font-semibold text-blue-50">
                    {STAGE_LABEL[stage] ?? stage}
                  </span>
                  {index < stages.length - 1 ? <ChevronRight className="h-3 w-3 text-blue-100/35" aria-hidden="true" /> : null}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-blue-100/45">
              Turn budget {node.config.minTurns ?? 3}–{node.config.maxTurns ?? 6}. Queue internals, classifiers, persistence and retries stay inside the node flow.
            </p>
          </section>
        ) : null}

        <ContractList title="Inputs" items={node.contract.inputs.map((input) => ({ key: input.key, label: input.label, hint: input.required ? "required" : undefined }))} accent={meta.accent} />
        <ContractList title="Outputs" items={node.contract.outputs.map((output) => ({ key: output.key, label: output.label }))} accent={meta.accent} />
        <ContractList title="Destinations" items={node.contract.destinations.map((destination) => ({ key: destination.key, label: destination.label }))} accent={meta.accent} />

        <section className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-3 py-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200/80">
            <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
            Node editor
          </div>
          <p className="mt-1.5 text-xs text-blue-100/62">
            The focused editor for this node arrives in NODE-1D.
            {isConversation ? " Until then, the existing conversation builder remains available and unchanged." : ""}
          </p>
          {isConversation && node.nodeFlowRef && onOpenAdvanced ? (
            <button
              type="button"
              onClick={() => onOpenAdvanced(node)}
              className="mt-2.5 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:border-white/30"
            >
              Open advanced builder
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </section>
      </div>
    </aside>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-100/45">{children}</div>;
}

function ContractList({
  title,
  items,
  accent
}: {
  title: string;
  items: Array<{ key: string; label: string; hint?: string }>;
  accent: string;
}) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      {items.length ? (
        <ul className="mt-2 space-y-1.5">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-2 text-xs text-blue-100/72">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} aria-hidden="true" />
              <span className="font-medium text-blue-50">{item.label}</span>
              {item.hint ? <span className="text-[10px] uppercase tracking-[0.1em] text-blue-100/40">{item.hint}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-xs text-blue-100/40">None</p>
      )}
    </section>
  );
}
