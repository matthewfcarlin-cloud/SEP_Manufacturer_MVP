import type { SupplierRanking } from "@/lib/sourcing/compare";

const usd = (n: number) => `$${n.toFixed(2)}`;
const whole = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const dash = <span className="text-ink-2">—</span>;

/** Quoted suppliers side by side, cheapest all-in first, with the best pick called out. */
export function SupplierComparison({ ranking }: { ranking: SupplierRanking }) {
  const { rows, unquoted, best, quantity, verdict } = ranking;
  return (
    <div className="flex flex-col gap-3 card card-pad">
      <div>
        <h3 className="text-xl font-semibold">Compare suppliers</h3>
        <p className={`mt-1 text-sm ${best ? "font-medium" : "text-ink-2"}`} aria-live="polite">{verdict}</p>
      </div>
      {rows.length > 0 && (
        <div className="card relative overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Quoted suppliers compared, cheapest all-in first</caption>
            <thead>
              <tr className="border-b border-border text-[13px] text-ink-2">
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Quoted, each</th>
                <th className="px-4 py-3 font-medium">Smallest order</th>
                <th className="px-4 py-3 font-medium">One-time setup</th>
                <th className="px-4 py-3 font-medium">All-in each at {quantity.toLocaleString("en-US")} made, est.</th>
                <th className="px-4 py-3 font-medium">How long it takes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isBest = r.supplierId === best?.supplierId;
                return (
                  <tr key={r.supplierId} className={`border-b border-border align-top last:border-0 ${isBest ? "bg-accent-soft" : ""}`}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{r.name}</span>
                      {isBest && <span className="ml-2 rounded-pill bg-accent-soft px-2 py-0.5 text-[13px] text-accent-ink">Best pick</span>}
                      {r.flags.length > 0 && <p className="mt-1 text-[13px] text-ink-2">{r.flags.join(" · ")}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono">{usd(r.unitUsd)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono">{r.moq !== undefined ? r.moq.toLocaleString("en-US") : dash}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono">{r.toolingUsd !== undefined ? whole(r.toolingUsd) : dash}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono">
                      <span className={isBest ? "font-semibold" : ""}>{usd(r.allInPerPartUsd)}</span>
                      <span className="block text-[13px] text-ink-2">{whole(r.orderTotalUsd)} for {r.orderQuantity.toLocaleString("en-US")}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono">{r.leadDays !== undefined ? `${r.leadDays} days` : dash}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {unquoted.length > 0 && (
        <p className="text-[13px] text-ink-2">Waiting on a price from {unquoted.map((u) => u.name).join(", ")}. Add it with Edit when they reply.</p>
      )}
      <p className="text-[13px] text-ink-2">
        All-in counts the parts you&apos;d have to buy to meet each smallest order, plus the one-time setup cost, spread over the {quantity.toLocaleString("en-US")} you need. Quotes
        over your walk-away are never picked; at about the same price (within 5%), the faster one wins. Based only on the numbers you entered.
      </p>
    </div>
  );
}
