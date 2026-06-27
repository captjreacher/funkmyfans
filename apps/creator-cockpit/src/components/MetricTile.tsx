import type { LucideIcon } from "lucide-react";

interface MetricTileProps {
  label: string;
  value: string;
  trend?: string;
  icon: LucideIcon;
}

export function MetricTile({ label, value, trend, icon: Icon }: MetricTileProps) {
  return (
    <div className="premium-card-hover rounded-2xl border border-blue-500/15 bg-[#0D1B2A]/62 p-4 shadow-[0_18px_42px_rgba(0,0,0,.18)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-blue-100/62">{label}</span>
        <Icon className="h-5 w-5 text-cyan-300" aria-hidden="true" />
      </div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
      {trend ? <div className="mt-1 text-sm text-emerald-300">{trend}</div> : null}
    </div>
  );
}
