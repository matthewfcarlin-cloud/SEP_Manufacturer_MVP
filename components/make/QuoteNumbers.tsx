import { allInPerUnit, sortQuotes } from "@/lib/outreach/compare";
import { formatUnitCostRange } from "@/lib/format";
import { PROCESS_LABELS } from "@/lib/processes";
import type { Outreach, Process } from "@/lib/types";

type Props = {
  outreach: Outreach;
  shops: Record<string, { name: string; neighborhood: string }>;
  estimates: Partial<Record<Process, { low: number; high: number }>>;
};

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const whole = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Every quote's numbers side by side, for the details: what the cards leave out. */
export function QuoteNumbers({ outreach, shops, estimates }: Props) {
  const quotes = sortQuotes(outreach.quotes, "value");
  return (
    <section aria-labelledby="quote-numbers-heading" className="flex flex-col gap-3">
      <h2 id="quote-numbers-heading" className="type-h2">
        Every quote&apos;s numbers
      </h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-border text-ink-2">
              {["Shop", "How it's made", "Each", "One-time setup cost", "Each, with setup spread over the run", "Ready in", "Smallest order"].map((h) => (
                <th key={h} scope="col" className="p-3 text-[13px] font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="border-b border-border align-top last:border-0">
                <th scope="row" className="p-3 font-medium">
                  {shops[q.shopId]?.name ?? q.shopId}
                  <span className="block text-[13px] font-normal text-muted">{q.machineModel}</span>
                </th>
                <td className="p-3">{PROCESS_LABELS[q.process]}</td>
                <td className="p-3 font-mono">{usd(q.unitPriceUsd)}</td>
                <td className="p-3 font-mono">{q.toolingUsd ? whole(q.toolingUsd) : "None"}</td>
                <td className="p-3 font-mono">{usd(allInPerUnit(q))}</td>
                <td className="p-3 font-mono">{q.leadTimeDays} days</td>
                <td className="p-3 font-mono">{q.moq.toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-2">
        {quotes.map((q) => (
          <li key={q.id} className="rounded-control bg-bg px-3 py-2 text-[14px] text-ink-2">
            <span className="font-medium text-ink">{shops[q.shopId]?.name ?? q.shopId}:</span> &ldquo;{q.note}&rdquo;
            {estimates[q.process] && <> The analysis estimated {formatUnitCostRange(estimates[q.process]!)} each for {PROCESS_LABELS[q.process].toLowerCase()}.</>}
          </li>
        ))}
      </ul>
      <p className="type-small text-muted">All quotes are simulated demo quotes from fictional shops.</p>
    </section>
  );
}
