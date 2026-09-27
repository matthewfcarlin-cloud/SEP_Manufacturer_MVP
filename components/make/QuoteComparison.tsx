"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DemoBadge } from "@/components/Badges";
import { FormError } from "@/components/upload/UploadPickers";
import type { ApiResponse } from "@/lib/api";
import { allInPerUnit, bestValueId, fastestId, sortQuotes, type QuoteSort } from "@/lib/outreach/compare";
import { formatUnitCostRange } from "@/lib/format";
import { PROCESS_LABELS, processInSentence } from "@/lib/processes";
import type { DemoQuote, Outreach, Process, QuoteStatus } from "@/lib/types";
import { QuotePipeline } from "./QuotePipeline";

type Props = {
  projectId: string;
  version: number;
  outreach: Outreach;
  shops: Record<string, { name: string; neighborhood: string }>;
  estimates: Partial<Record<Process, { low: number; high: number }>>;
};

const SORTS: { value: QuoteSort; label: string }[] = [
  { value: "value", label: "Best value" },
  { value: "price", label: "Unit price" },
  { value: "lead", label: "How long it takes" },
];
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const usdWhole = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-1.5 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  );
}

/** Demo quotes side by side: best value highlighted, pipeline per quote, and "Choose this quote". */
export function QuoteComparison({ projectId, version, outreach, shops, estimates }: Props) {
  const router = useRouter();
  const [sort, setSort] = useState<QuoteSort>("value");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const best = bestValueId(outreach.quotes);
  const fastest = fastestId(outreach.quotes);
  const base = `/api/projects/${projectId}/versions/${version}/quotes`;

  const act = async (quote: DemoQuote, request: () => Promise<Response>) => {
    setPendingId(quote.id);
    setError(null);
    try {
      const json = (await (await request()).json()) as ApiResponse<Outreach>;
      if (!json.success) throw new Error(json.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the quote.");
    } finally {
      setPendingId(null);
    }
  };
  const choose = (q: DemoQuote) => act(q, () => fetch(`${base}/${q.id}/choose`, { method: "POST" }));
  const advance = (q: DemoQuote, status: QuoteStatus) =>
    act(q, () => fetch(`${base}/${q.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }));

  return (
    <section aria-labelledby="quotes-heading" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="quotes-heading" className="display-type text-[clamp(1.8rem,3.5vw,2.6rem)]">
            Compare quotes
          </h2>
          <p className="mt-1 text-sm text-muted">
            {outreach.quotes.length} demo quotes for {outreach.quotes[0]?.quantity.toLocaleString("en-US")} units. Best value = lowest all-in cost per unit, with
            the one-time setup cost spread over your run.
          </p>
        </div>
        <div role="group" aria-label="Sort quotes" className="flex border border-line">
          {SORTS.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={sort === s.value}
              onClick={() => setSort(s.value)}
              className={`eyebrow px-3 py-2 text-[11px] ${sort === s.value ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
        {sortQuotes(outreach.quotes, sort).map((q) => {
          const shop = shops[q.shopId];
          const isBest = q.id === best;
          const isChosen = q.id === outreach.chosenQuoteId;
          const estimate = estimates[q.process];
          const isPending = pendingId === q.id;
          return (
            <li
              key={q.id}
              className={`flex flex-col gap-4 border bg-surface p-5 ${isChosen ? "border-ink ring-1 ring-ink" : isBest ? "border-accent ring-1 ring-accent" : "border-line"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex min-h-5 flex-wrap gap-1.5">
                    {isChosen && <span className="eyebrow bg-ink px-1.5 py-0.5 text-[10px] text-bg">Chosen</span>}
                    {isBest && <span className="eyebrow bg-accent px-1.5 py-0.5 text-[10px] text-accent-ink">Best value</span>}
                    {q.id === fastest && <span className="eyebrow border border-line px-1.5 py-0.5 text-[10px] text-muted">Fastest</span>}
                  </p>
                  <h3 className="mt-2 font-semibold [overflow-wrap:anywhere]">{shop?.name ?? q.shopId}</h3>
                  <p className="text-xs text-muted">
                    {PROCESS_LABELS[q.process]} · {q.machineModel}
                  </p>
                </div>
                <DemoBadge label="Demo quote" title="Simulated by Moko from a fictional demo shop" />
              </div>

              <p className="flex items-baseline gap-1.5">
                <span className="display-type text-4xl tabular-nums">{usd(q.unitPriceUsd)}</span>
                <span className="text-sm text-muted">/ unit</span>
              </p>

              <dl>
                <Row label="One-time setup cost" value={q.toolingUsd ? usdWhole(q.toolingUsd) : "None"} />
                <Row label="All-in per unit" value={usd(allInPerUnit(q))} />
                <Row label="How long it takes" value={`${q.leadTimeDays} days`} />
                <Row label="Minimum order" value={`${q.moq.toLocaleString("en-US")} units`} />
              </dl>
              {estimate && <p className="text-xs text-muted">Analysis estimate for {processInSentence(q.process)}: {formatUnitCostRange(estimate)} per unit (est.)</p>}
              <p className="border-l-2 border-line pl-3 text-sm italic text-muted">&ldquo;{q.note}&rdquo;</p>

              <QuotePipeline status={q.status} />

              <div className="mt-auto flex flex-wrap gap-2">
                {!isChosen ? (
                  <button type="button" disabled={isPending} onClick={() => choose(q)} className="bg-ink px-3 py-2 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-50">
                    Choose this quote
                  </button>
                ) : (
                  q.status !== "ordered" && (
                    <button type="button" disabled={isPending} onClick={() => advance(q, "ordered")} className="bg-ink px-3 py-2 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-50">
                      Mark as ordered
                    </button>
                  )
                )}
                {q.status === "quoted" && (
                  <button type="button" disabled={isPending} onClick={() => advance(q, "sample")} className="border border-line px-3 py-2 text-sm font-medium hover:border-ink disabled:opacity-50">
                    Request a sample
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <FormError message={error} />
    </section>
  );
}
