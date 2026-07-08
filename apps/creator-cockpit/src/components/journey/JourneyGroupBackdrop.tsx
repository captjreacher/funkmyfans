import type { NodeProps } from "@xyflow/react";
import type { JourneyGroupRFNode } from "../../lib/journey";

// A passive, non-interactive group container drawn behind clustered nodes.
// It moves and zooms with the canvas because it is itself a React Flow node,
// but it is not draggable or selectable and does not capture pointer events.
export function JourneyGroupBackdrop({ data }: NodeProps<JourneyGroupRFNode>) {
  return (
    <div
      className="pointer-events-none relative h-full w-full rounded-2xl border border-dashed"
      style={{ borderColor: `${data.accent}55`, background: `${data.accent}0d` }}
    >
      <span
        className="absolute left-3 top-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: data.accent }}
      >
        {data.label}
      </span>
    </div>
  );
}
