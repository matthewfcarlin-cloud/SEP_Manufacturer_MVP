import { formatCompactUsd, formatMarginRange, type TierResult } from "@/lib/businessCase";
import { formatUnitCostRange } from "@/lib/format";
import { PROCESS_LABELS } from "@/lib/processes";

export function TierTable({ tiers }: { tiers: TierResult[] }) {
  const hasClamped = tiers.some((t) => t.basis === "clamped");
  const hasFlat = tiers.some((t) => t.basis === "flat");
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              {["Run size", "Cheapest process", "Cost per part, all-in", "Your margin", "Profit on the run"].map((h) => (
                <th key={h} scope="col" className="eyebrow p-4 font-normal text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.quantity} className="border-b border-line last:border-0">
                <th scope="row" className="p-4 text-left font-mono font-medium">
                  {t.quantity.toLocaleString("en-US")}
                  {t.basis !== "curve" && <span className="text-muted">*</span>}
                </th>
                <td className="p-4">{PROCESS_LABELS[t.process]}</td>
                <td className="p-4 font-mono">{formatUnitCostRange(t.allIn)}</td>
                <td className={`p-4 font-mono font-semibold ${t.margin.mid < 0 ? "text-accent" : ""}`}>{formatMarginRange(t.margin)}</td>
                <td className="p-4 font-mono">
                  {formatCompactUsd(t.profit.low)} to {formatCompactUsd(t.profit.high)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasClamped && <p className="text-xs text-muted">* Outside the 10–10,000 units the AI priced, so cost is held at the nearest priced volume.</p>}
      {hasFlat && <p className="text-xs text-muted">* This analysis has no cost-by-volume curve, so every run uses the cost at the target quantity. Re-run the analysis for volume pricing.</p>}
    </div>
  );
}
