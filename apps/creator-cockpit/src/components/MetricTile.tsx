import type { LucideIcon } from "lucide-react";

interface MetricTileProps {
  label: string;
  value: string;
  trend?: string;
  icon: LucideIcon;
}

export function MetricTile({ label, value, trend, icon: Icon }: MetricTileProps) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-stone-500">{label}</span>
        <Icon className="h-5 w-5 text-teal-700" aria-hidden="true" />
      </div>
      <div className="mt-3 text-2xl font-semibold text-stone-950">{value}</div>
      {trend ? <div className="mt-1 text-sm text-emerald-700">{trend}</div> : null}
    </div>
  );
}
