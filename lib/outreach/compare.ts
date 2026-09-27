import type { DemoQuote } from "../types";

/** Unit price plus tooling spread over the run (at least the shop's MOQ). */
export function allInPerUnit(q: DemoQuote): number {
  return q.unitPriceUsd + q.toolingUsd / Math.max(q.quantity, q.moq);
}

export type QuoteSort = "value" | "price" | "lead";

const BY: Record<QuoteSort, (a: DemoQuote, b: DemoQuote) => number> = {
  value: (a, b) => allInPerUnit(a) - allInPerUnit(b) || a.leadTimeDays - b.leadTimeDays,
  price: (a, b) => a.unitPriceUsd - b.unitPriceUsd || a.leadTimeDays - b.leadTimeDays,
  lead: (a, b) => a.leadTimeDays - b.leadTimeDays || allInPerUnit(a) - allInPerUnit(b),
};

export function sortQuotes(quotes: readonly DemoQuote[], by: QuoteSort): DemoQuote[] {
  return [...quotes].sort(BY[by]);
}

export const bestValueId = (quotes: readonly DemoQuote[]) => sortQuotes(quotes, "value")[0]?.id;
export const fastestId = (quotes: readonly DemoQuote[]) => sortQuotes(quotes, "lead")[0]?.id;
