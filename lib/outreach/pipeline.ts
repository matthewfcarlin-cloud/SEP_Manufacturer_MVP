import type { Outreach, QuoteStatus } from "../types";

export const QUOTE_STAGES: readonly { key: QuoteStatus; label: string }[] = [
  { key: "sent", label: "Sent" },
  { key: "quoted", label: "Quoted" },
  { key: "sample", label: "Sample" },
  { key: "ordered", label: "Ordered" },
];
const ORDER = QUOTE_STAGES.map((s) => s.key);

export class PipelineError extends Error {}

function requireQuote(outreach: Outreach, quoteId: string) {
  const quote = outreach.quotes.find((q) => q.id === quoteId);
  if (!quote) throw new PipelineError("No such quote.");
  return quote;
}

/** Saves the chosen quote on the version. Choosing another switches. */
export function chooseQuote(outreach: Outreach, quoteId: string): Outreach {
  requireQuote(outreach, quoteId);
  return { ...outreach, chosenQuoteId: quoteId };
}

/** Moves a quote forward (Sent → Quoted → Sample → Ordered). Only the chosen quote can be ordered. */
export function advanceQuote(outreach: Outreach, quoteId: string, status: QuoteStatus): Outreach {
  const quote = requireQuote(outreach, quoteId);
  if (ORDER.indexOf(status) <= ORDER.indexOf(quote.status)) throw new PipelineError("A quote's status only moves forward.");
  if (status === "ordered" && outreach.chosenQuoteId !== quoteId) throw new PipelineError("Choose this quote before marking it ordered.");
  return { ...outreach, quotes: outreach.quotes.map((q) => (q.id === quoteId ? { ...q, status } : q)) };
}
