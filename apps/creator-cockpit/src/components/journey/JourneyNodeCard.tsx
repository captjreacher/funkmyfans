import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ArrowDownLeft, ArrowUpRight, LogIn } from "lucide-react";
import { journeyClassMeta, journeyNodePurpose, type JourneyRFNode } from "../../lib/journey";
import { READINESS_META } from "../../lib/journeyContracts";

// Journey-level node card for the six canonical ADR-0002 classes. Shows only
// journey-level information (name, class, purpose, connectivity). It never
// renders internal runtime steps — those live inside the node flow.
export function JourneyNodeCard({ data, selected }: NodeProps<JourneyRFNode>) {
  const { journeyNode, inbound, outbound, isEntry, capability } = data;
  const meta = journeyClassMeta(journeyNode.class);
  const Icon = meta.icon;
  const readiness = capability ? READINESS_META[capability.readiness] : null;

  return (
    <div
      className={`relative w-[248px] cursor-pointer overflow-hidden rounded-xl border bg-[#0b1727]/95 pl-1 text-left shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)] backdrop-blur transition ${
        selected ? "ring-2" : "hover:border-white/25"
      }`}
      style={{
        borderColor: selected ? meta.accent : "rgba(148,163,184,0.22)",
        boxShadow: selected ? `0 0 0 1px ${meta.accent}55` : undefined
      }}
      role="button"
      aria-label={`${meta.label} node: ${journeyNode.label}`}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: meta.accent }} aria-hidden="true" />
      <Handle type="target" position={Position.Left} style={{ width: 8, height: 8, background: meta.accent, border: "none" }} />

      <div className="flex items-start gap-3 px-3 pt-3">
        <span
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${meta.accent}1f`, color: meta.accent }}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: meta.accent }}>
              {meta.label}
            </span>
            {isEntry ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/70">
                <LogIn className="h-2.5 w-2.5" aria-hidden="true" />
                Entry
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold text-white">{journeyNode.label}</div>
        </div>
      </div>

      <div className="px-3 pb-2 pt-1.5 text-xs text-blue-100/62">{journeyNodePurpose(journeyNode)}</div>

      <div className="flex items-center justify-between gap-2 border-t border-white/8 px-3 py-2 text-[11px] text-blue-100/48">
        <span className="inline-flex items-center gap-1">
          <ArrowDownLeft className="h-3 w-3" aria-hidden="true" />
          {inbound} in
        </span>
        {readiness ? (
          <span
            className="inline-flex items-center gap-1 truncate rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: readiness.tone }}
            title={capability?.readinessDetail}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: readiness.tone }} aria-hidden="true" />
            {readiness.label}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          {outbound} out
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </span>
      </div>

      <Handle type="source" position={Position.Right} style={{ width: 8, height: 8, background: meta.accent, border: "none" }} />
    </div>
  );
}
