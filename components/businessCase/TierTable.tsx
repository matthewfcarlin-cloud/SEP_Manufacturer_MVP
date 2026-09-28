import { formatCompactUsd, type TierResult } from "@/lib/businessCase";
import { formatUnitCostRange } from "@/lib/format";
import { PROCESS_LABELS } from "@/lib/processes";

const MINUS = "−";
const signedCents = (n: number) => `${n < 0 ? MINUS : ""}$${Math.abs(n).toFixed(2)}`;

/** What you keep on each sale at this run size: the run's profit range spread over the parts. */
const perSaleRange = (t: TierResult) => {
  const low = t.profit.low / t.quantity;
  const high = t.profit.high / t.quantity;
  return Math.abs(high - low) < 0.005 ? signedCents(low) : `${signedCents(low)} to ${signedCents(high)}`;
};

export function TierTable({ tiers }: { tiers: TierResult[] }) {
  const hasClamped = tiers.some((t) => t.basis === "clamped");
  const hasFlat = tiers.some((t) => t.basis === "flat");
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto card">
        <table className="w-full min-w-[640px] text-sm print:min-w-0 print:text-[13px]">
          <thead>
            <tr className="border-b border-border text-left">
              {["How many you make", "Cheapest way to make it", "Cost of each, all in", "You keep per sale", "Profit on the whole run"].map((h) => (
                <th key={h} scope="col" className="text-[13px] font-medium p-4 text-ink-2 print:p-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.quantity} className="border-b border-border last:border-0">
                <th scope="row" className="p-4 text-left font-mono font-medium print:p-2">
                  {t.quantity.toLocaleString("en-US")}
                  {t.basis !== "curve" && <span className="text-ink-2">*</span>}
                </th>
                <td className="p-4 print:p-2">{PROCESS_LABELS[t.process]}</td>
                <td className="p-4 font-mono print:p-2">{formatUnitCostRange(t.allIn)}</td>
                <td className={`p-4 font-mono font-semibold print:p-2 ${t.margin.mid < 0 ? "text-red-ink" : ""}`}>{perSaleRange(t)}</td>
                <td className="p-4 font-mono print:p-2">
                  {formatCompactUsd(t.profit.low)} to {formatCompactUsd(t.profit.high)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasClamped && <p className="text-[13px] text-ink-2">* Outside the 10–10,000 made that the AI priced, so the cost stays at the nearest one it priced.</p>}
      {hasFlat && <p className="text-[13px] text-ink-2">* This analysis didn&apos;t price different quantities, so every run uses the cost at your target. Run the analysis again to see how cost changes with quantity.</p>}
    </div>
  );
}
