import { allInPerUnit } from "../outreach/compare";
import type { DemoQuote, OrderLine, OrderSource, ProjectVersion, Supplier } from "../types";
import { getShopById } from "../shops";

// Turns a line's source into comparable terms, and suggests a source for
// lines the user hasn't assigned. Pure and client-safe apart from the shop
// name lookup (seed data, bundled).

export type SourceTerms = {
  source: OrderSource;
  /** Who the order goes to, for display and for message drafts. */
  vendor: string;
  unitUsd: number | null;
  toolingUsd: number;
  moq: number;
  leadDays: number | null;
  overseas: boolean;
  /** A simulated quote from a fictional demo shop. */
  isDemo: boolean;
  /** Why this source can't be ordered from yet, if it can't. */
  problem?: string;
};

export function quoteFor(version: ProjectVersion, quoteId: string): DemoQuote | undefined {
  return version.outreach?.quotes.find((q) => q.id === quoteId);
}

export function supplierFor(version: ProjectVersion, supplierId: string): Supplier | undefined {
  return version.sourcing?.suppliers.find((s) => s.id === supplierId);
}

export function termsFor(version: ProjectVersion, source: OrderSource): SourceTerms {
  switch (source.kind) {
    case "local_quote": {
      const q = quoteFor(version, source.quoteId);
      if (!q) return missing(source, "Demo quote", "That quote is no longer on this version. Request quotes again or pick another source.");
      return {
        source,
        vendor: getShopById(q.shopId)?.name ?? q.shopId,
        unitUsd: q.unitPriceUsd,
        toolingUsd: q.toolingUsd,
        moq: q.moq,
        leadDays: q.leadTimeDays,
        overseas: false,
        isDemo: true,
      };
    }
    case "alibaba": {
      const s = supplierFor(version, source.supplierId);
      if (!s) return missing(source, "Alibaba supplier", "That supplier was removed from the shortlist.");
      const q = s.quote ?? {};
      const problem =
        s.status === "dropped"
          ? `${s.name} is marked dropped.`
          : q.unitUsd === undefined
            ? `No unit price recorded for ${s.name} yet. Add their quote on the Make screen.`
            : q.leadDays === undefined
              ? `No lead time recorded for ${s.name} yet.`
              : undefined;
      return {
        source,
        vendor: s.name,
        unitUsd: q.unitUsd ?? null,
        toolingUsd: q.toolingUsd ?? 0,
        moq: q.moq ?? 1,
        leadDays: q.leadDays ?? null,
        overseas: true,
        isDemo: false,
        problem,
      };
    }
    case "catalog":
      return {
        source,
        vendor: source.vendor,
        unitUsd: source.unitUsd,
        toolingUsd: 0,
        moq: source.moq ?? 1,
        leadDays: source.leadDays,
        overseas: source.overseas,
        isDemo: false,
      };
  }
}

function missing(source: OrderSource, vendor: string, problem: string): SourceTerms {
  return { source, vendor, unitUsd: null, toolingUsd: 0, moq: 1, leadDays: null, overseas: false, isDemo: false, problem };
}

/** Every quote or supplier that could make this line, best first. Only custom lines can be made to order. */
export function candidateSources(version: ProjectVersion, line: OrderLine): OrderSource[] {
  if (line.kind !== "custom_part") return [];
  const out: OrderSource[] = [];
  const agreed = (version.sourcing?.suppliers ?? []).filter(
    (s) => s.status === "agreed" && s.quote?.unitUsd !== undefined && (!line.process || version.sourcing?.plan?.process === line.process),
  );
  const chosenId = version.outreach?.chosenQuoteId;
  const quotes = (version.outreach?.quotes ?? []).filter((q) => !line.process || q.process === line.process);
  const chosen = quotes.find((q) => q.id === chosenId);
  if (chosen) out.push({ kind: "local_quote", quoteId: chosen.id });
  for (const s of agreed) out.push({ kind: "alibaba", supplierId: s.id });
  for (const q of [...quotes].sort((a, b) => allInPerUnit(a) - allInPerUnit(b))) {
    if (q.id !== chosenId) out.push({ kind: "local_quote", quoteId: q.id });
  }
  return out;
}

/**
 * The source a line uses in the plan: the user's assignment, else the
 * suggestion (the chosen local quote, then an agreed Alibaba supplier, then
 * the best-value local quote). Suggestions are shown as suggestions and are
 * never signed off until the user confirms the plan.
 */
export function effectiveSource(version: ProjectVersion, line: OrderLine): { source: OrderSource; suggested: boolean } | null {
  const assigned = version.order?.assignments.find((a) => a.lineId === line.id);
  if (assigned) return { source: assigned.source, suggested: false };
  const first = candidateSources(version, line)[0];
  return first ? { source: first, suggested: true } : null;
}

export const sameSource = (a: OrderSource, b: OrderSource) => JSON.stringify(a) === JSON.stringify(b);
