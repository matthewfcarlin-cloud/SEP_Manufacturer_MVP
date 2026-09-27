import type { SupplierRanking } from "@/lib/sourcing/compare";

const usd = (n: number) => `$${n.toFixed(2)}`;
const whole = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const dash = <span className="text-muted">—</span>;

/** Quoted suppliers side by side, cheapest all-in first, with the best pick called out. */
export function SupplierComparison({ ranking }: { ranking: SupplierRanking }) {
  const { rows, unquoted, best, quantity, verdict } = ranking;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
      <div>
        <h3 className="text-xl font-semibold">Compare suppliers</h3>
        <p className={`mt-1 text-sm ${best ? "font-medium" : "text-muted"}`} aria-live="polite">{verdict}</p>
      </div>
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Quoted suppliers compared, cheapest all-in first</caption>
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Quoted per part</th>
                <th className="px-4 py-3 font-medium">MOQ</th>
                <th className="px-4 py-3 font-medium">One-time setup</th>
                <th className="px-4 py-3 font-medium">All-in per part @ {quantity.toLocaleString("en-US")}, est.</th>
                <th className="px-4 py-3 font-medium">How long it takes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isBest = r.supplierId === best?.supplierId;
                return (
                  <tr key={r.supplierId} className={`border-b border-line align-top last:border-0 ${isBest ? "bg-accent/5" : ""}`}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{r.name}</span>
                      {isBest && <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">Best pick</span>}
                      {r.flags.length > 0 && <p className="mt-1 text-xs text-muted">{r.flags.join(" · ")}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono">{usd(r.unitUsd)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono">{r.moq !== undefined ? r.moq.toLocaleString("en-US") : dash}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono">{r.toolingUsd !== undefined ? whole(r.toolingUsd) : dash}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono">
                      <span className={isBest ? "font-semibold" : ""}>{usd(r.allInPerPartUsd)}</span>
                      <span className="block text-xs text-muted">{whole(r.orderTotalUsd)} for {r.orderQuantity.toLocaleString("en-US")}</span>
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
        <p className="text-xs text-muted">Waiting on a price from {unquoted.map((u) => u.name).join(", ")}. Add it with Edit when they reply.</p>
      )}
      <p className="text-xs text-muted">
        All-in counts the parts you&apos;d have to buy to meet each smallest order, plus the one-time setup cost, spread over the {quantity.toLocaleString("en-US")} you need. Quotes
        over your walk-away are never picked; at about the same price (within 5%), the faster one wins. Based only on the numbers you entered.
      </p>
    </div>
  );
}
