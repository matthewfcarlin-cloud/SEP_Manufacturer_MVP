import { buildBusinessCase, MIN_HEALTHY_MARGIN, unitCostAt, type CostBasis } from "../businessCase";
import type { ManufacturingPath, Process, ProjectVersion } from "../types";

// Negotiation numbers for one manufacturing path, computed from the analysis
// (and the business case when there is one). Pure and client-safe. These are
// the user's private numbers: the AI uses them to pitch counter-offers but is
// told never to reveal the walk-away price.

/** Open this far under the estimate's low end, so there is room to concede. */
export const OPENING_DISCOUNT = 0.15;

export type NegotiationTargets = {
  process: Process;
  quantity: number;
  /** The AI analysis's per-part estimate at the target quantity, tooling excluded. */
  estimate: { low: number; high: number; basis: CostBasis };
  openingAsk: number;
  target: number;
  /** The most you should pay per part, or null when no price keeps a healthy margin. */
  walkAway: number | null;
  walkAwayReason: "estimate" | "margin" | "no-margin";
  /** Tooling from the analysis, for judging a supplier's mold quote. */
  tooling: { low: number; high: number };
};

const cents = (n: number) => Math.round(n * 100) / 100;

export function pathFor(version: ProjectVersion, process?: Process): ManufacturingPath | undefined {
  const paths = version.analysis?.paths ?? [];
  return (process && paths.find((p) => p.process === process)) || paths[0];
}

export function negotiationTargets(version: ProjectVersion, process?: Process): NegotiationTargets | null {
  const path = pathFor(version, process);
  if (!path) return null;
  const quantity = version.targetQuantity;
  const estimate = unitCostAt(path, quantity);
  const target = cents(estimate.low);
  let walkAway: number | null = cents(estimate.high);
  let walkAwayReason: NegotiationTargets["walkAwayReason"] = "estimate";

  if (version.businessCase) {
    // The highest per-part price that still leaves a healthy margin once
    // this path's tooling is spread over the run.
    const { revenuePerUnit } = buildBusinessCase([path], version.businessCase);
    const toolingMid = (path.toolingCostUsd.low + path.toolingCostUsd.high) / 2;
    const marginCap = cents(revenuePerUnit * (1 - MIN_HEALTHY_MARGIN) - toolingMid / quantity);
    if (marginCap <= 0) {
      walkAway = null;
      walkAwayReason = "no-margin";
    } else if (marginCap < walkAway) {
      walkAway = marginCap;
      walkAwayReason = "margin";
    }
  }

  return {
    process: path.process,
    quantity,
    estimate,
    openingAsk: cents(Math.min(target, walkAway ?? target) * (1 - OPENING_DISCOUNT)),
    target: walkAway === null ? target : Math.min(target, walkAway),
    walkAway,
    walkAwayReason,
    tooling: { ...path.toolingCostUsd },
  };
}

/** Alibaba's public search page for a phrase. Opening it is the user's own browsing; Idlefit never fetches it. */
export function alibabaSearchUrl(term: string): string {
  return `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(term.trim())}`;
}

export type QuoteStanding = "at-target" | "negotiable" | "over-walk-away";

/** Where a quoted per-part price sits against the user's numbers. */
export function quoteStanding(unitUsd: number, targets: NegotiationTargets): QuoteStanding {
  if (unitUsd <= targets.target) return "at-target";
  if (targets.walkAway !== null && unitUsd <= targets.walkAway) return "negotiable";
  return "over-walk-away";
}
