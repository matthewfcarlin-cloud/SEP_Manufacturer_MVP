"use client";

import { Check, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DemoBadge } from "@/components/Badges";
import { Button } from "@/components/ui/Button";
import { cx, TONES } from "@/components/ui/classes";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { FormError } from "@/components/upload/UploadPickers";
import type { ApiResponse } from "@/lib/api";
import { bestValueId, sortQuotes } from "@/lib/outreach/compare";
import { initialsFor } from "@/lib/studio/home";
import { avatarTone } from "@/lib/studio/stageDisplay";
import type { DemoQuote, Outreach, QuoteStatus } from "@/lib/types";
import { QuotePipeline } from "./QuotePipeline";

type Props = {
  projectId: string;
  version: number;
  outreach: Outreach;
  shops: Record<string, { name: string; neighborhood: string }>;
};

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const NEXT_STEP: Partial<Record<QuoteStatus, { status: QuoteStatus; label: string; done: string }>> = {
  quoted: { status: "sample", label: "Request a sample", done: "Sample requested" },
  sample: { status: "ordered", label: "Mark as ordered", done: "Marked as ordered" },
};

/**
 * The quotes as cards in a row (design/DESIGN.md §4 Make): who, where, the
 * price each and how soon it's ready, "Best pick" on the best value, and
 * Choose. The chosen card gets a green ring and its pipeline. Every other
 * number is in the table under "See the details".
 */
export function QuoteCards({ projectId, version, outreach, shops }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const best = bestValueId(outreach.quotes);
  const base = `/api/projects/${projectId}/versions/${version}/quotes`;

  const act = async (quote: DemoQuote, request: () => Promise<Response>, done: string) => {
    setPendingId(quote.id);
    setError(null);
    try {
      const json = (await (await request()).json()) as ApiResponse<Outreach>;
      if (!json.success) throw new Error(json.error);
      toast({ message: done });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the quote.");
    } finally {
      setPendingId(null);
    }
  };
  const choose = (q: DemoQuote) => act(q, () => fetch(`${base}/${q.id}/choose`, { method: "POST" }), "Quote chosen");
  const advance = (q: DemoQuote, status: QuoteStatus, done: string) =>
    act(q, () => fetch(`${base}/${q.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }), done);

  return (
    <section aria-labelledby="quotes-heading" className="flex scroll-mt-20 flex-col gap-3">
      <div>
        <h2 id="quotes-heading" className="type-h2">
          Your quotes
        </h2>
        <p className="text-ink-2">
          {outreach.quotes.length} demo quotes for {outreach.quotes[0]?.quantity.toLocaleString("en-US")} made. Best pick is the lowest cost for each one once the
          one-time setup cost is spread over your run.
        </p>
      </div>
      <ul className="-mx-1 flex snap-x gap-5 overflow-x-auto px-1 pb-3 pt-1">
        {sortQuotes(outreach.quotes, "value").map((q) => {
          const shop = shops[q.shopId];
          const name = shop?.name ?? q.shopId;
          const tone = TONES[avatarTone(name)];
          const isChosen = q.id === outreach.chosenQuoteId;
          const isPending = pendingId === q.id;
          const nextStep = isChosen ? NEXT_STEP[q.status] : undefined;
          return (
            <li key={q.id} className={cx("card relative flex w-[264px] shrink-0 snap-start flex-col gap-3 p-5", isChosen && "ring-2 ring-green")}>
              <div className="absolute right-4 top-4 flex flex-col items-end gap-1">
                {isChosen && <StatusPill tone="green">Chosen</StatusPill>}
                {q.id === best && !isChosen && <StatusPill tone="accent">Best pick</StatusPill>}
              </div>
              <span aria-hidden className={cx("grid h-10 w-10 place-items-center rounded-pill text-[14px] font-semibold", tone.soft, tone.text)}>
                {initialsFor(name)}
              </span>
              <div className="min-w-0">
                <h3 className="type-h3 [overflow-wrap:anywhere]">{name}</h3>
                <p className="type-small text-muted">{shop?.neighborhood ?? "Local shop"}</p>
              </div>
              <p className="flex items-baseline gap-1.5">
                <span className="type-price-lg">{usd(q.unitPriceUsd)}</span>
                <span className="text-ink-2">each</span>
              </p>
              <p className="flex items-center gap-1.5 text-[14px] text-ink-2">
                <Clock aria-hidden size={16} strokeWidth={1.75} />
                Ready in {q.leadTimeDays} days
              </p>
              <div className="self-start">
                <DemoBadge label="Demo quote" title="Simulated by Moko from a fictional demo shop" />
              </div>
              <div className="mt-auto flex flex-col gap-3 pt-1">
                {isChosen ? (
                  <>
                    <QuotePipeline status={q.status} />
                    {nextStep && (
                      <Button variant="secondary" size="sm" disabled={isPending} onClick={() => advance(q, nextStep.status, nextStep.done)}>
                        {nextStep.label}
                      </Button>
                    )}
                  </>
                ) : (
                  // One primary per section: the best pick's Choose is the main action.
                  <Button variant={q.id === best ? "primary" : "secondary"} size="sm" icon={Check} disabled={isPending} onClick={() => choose(q)}>
                    Choose
                  </Button>
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
