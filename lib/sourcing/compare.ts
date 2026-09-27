import type { Supplier } from "../types";
import { quoteStanding, type NegotiationTargets, type QuoteStanding } from "./targets";

// Side-by-side supplier comparison and the "best pick". Pure, client-safe and
// deterministic: the pick comes from the quoted numbers the user entered,
// never from an AI call. Suppliers are compared on what the order actually
// costs per part the user needs: buying up to a supplier's MOQ and paying its
// tooling both count.

/** Quotes within this share of the cheapest all-in cost count as "about the same price", so lead time decides. */
export const PRICE_TIE_SHARE = 0.05;

export type SupplierComparison = {
  supplierId: string;
  name: string;
  unitUsd: number;
  moq?: number;
  toolingUsd?: number;
  leadDays?: number;
  /** Parts you'd have to buy: the target quantity, or the MOQ if that is higher. */
  orderQuantity: number;
  /** Everything you pay up front: parts at the order quantity plus tooling. */
  orderTotalUsd: number;
  /** orderTotalUsd spread over the parts you actually need. */
  allInPerPartUsd: number;
  standing: QuoteStanding | null;
  /** Things that make the comparison less certain or the deal worse, in plain words. */
  flags: string[];
};

export type SupplierRanking = {
  quantity: number;
  /** Quoted, not dropped, cheapest all-in first. */
  rows: SupplierComparison[];
  /** Suppliers still in play without a per-part price. */
  unquoted: { supplierId: string; name: string }[];
  best: SupplierComparison | null;
  /** One sentence for the user explaining the pick (or why there isn't one). */
  verdict: string;
};

const money = (n: number) => `$${n.toFixed(2)}`;
const whole = (n: number) => n.toLocaleString("en-US");

function compareOne(s: Supplier & { quote: { unitUsd: number } }, quantity: number, targets: NegotiationTargets | null): SupplierComparison {
  const { unitUsd, moq, toolingUsd, leadDays } = s.quote;
  const orderQuantity = Math.max(quantity, moq ?? 0);
  const orderTotalUsd = unitUsd * orderQuantity + (toolingUsd ?? 0);
  const standing = targets ? quoteStanding(unitUsd, targets) : null;
  const flags: string[] = [];
  if (moq !== undefined && moq > quantity) flags.push(`MOQ ${whole(moq)} means buying ${whole(moq - quantity)} extra parts`);
  if (toolingUsd === undefined) flags.push("Tooling not quoted yet");
  if (leadDays === undefined) flags.push("Lead time not quoted yet");
  if (standing === "over-walk-away") flags.push("Over your walk-away price");
  return {
    supplierId: s.id, name: s.name, unitUsd, moq, toolingUsd, leadDays,
    orderQuantity, orderTotalUsd, allInPerPartUsd: orderTotalUsd / quantity, standing, flags,
  };
}

function pickBest(candidates: SupplierComparison[]): SupplierComparison | null {
  if (candidates.length === 0) return null;
  const cheapest = candidates[0].allInPerPartUsd;
  const nearCheapest = candidates.filter((c) => c.allInPerPartUsd <= cheapest * (1 + PRICE_TIE_SHARE));
  // Among quotes at about the same price, the fastest known lead time wins; unknown lead times go last.
  return [...nearCheapest].sort((a, b) => (a.leadDays ?? Infinity) - (b.leadDays ?? Infinity) || a.allInPerPartUsd - b.allInPerPartUsd)[0];
}

function explain(best: SupplierComparison | null, rows: SupplierComparison[], quantity: number, targets: NegotiationTargets | null): string {
  if (rows.length === 0) return "Add quoted prices to your suppliers to compare them.";
  if (!best) {
    return targets?.walkAway === null
      ? "No quote leaves a healthy margin at your retail price, so there's no best pick yet. Push on price or revisit the retail price."
      : "Every quote is over your walk-away price, so there's no best pick yet. Counter-offer or find more suppliers.";
  }
  const lead = best.leadDays !== undefined ? `, ${best.leadDays} days lead time` : "";
  const head = `${best.name} is the best pick: ${money(best.allInPerPartUsd)} per part all-in for ${whole(quantity)} units (est.)${lead}.`;
  const runnerUp = rows.find((r) => r !== best && r.standing !== "over-walk-away") ?? rows.find((r) => r !== best);
  if (!runnerUp) return head;
  const saving = runnerUp.allInPerPartUsd - best.allInPerPartUsd;
  if (saving > best.allInPerPartUsd * PRICE_TIE_SHARE) return `${head} That's ${money(saving)} per part less than ${runnerUp.name}.`;
  if (best.leadDays !== undefined && (runnerUp.leadDays === undefined || runnerUp.leadDays > best.leadDays)) {
    const faster = runnerUp.leadDays === undefined ? "a quoted lead time" : `${runnerUp.leadDays - best.leadDays} days faster`;
    return `${head} About the same price as ${runnerUp.name}, with ${faster}.`;
  }
  return `${head} ${runnerUp.name} is close behind.`;
}

export function rankSuppliers(suppliers: Supplier[], quantity: number, targets: NegotiationTargets | null): SupplierRanking {
  const active = suppliers.filter((s) => s.status !== "dropped");
  const rows = active
    .filter((s): s is Supplier & { quote: { unitUsd: number } } => s.quote?.unitUsd !== undefined)
    .map((s) => compareOne(s, quantity, targets))
    .sort((a, b) => a.allInPerPartUsd - b.allInPerPartUsd);
  const unquoted = active.filter((s) => s.quote?.unitUsd === undefined).map((s) => ({ supplierId: s.id, name: s.name }));
  const best = pickBest(rows.filter((r) => r.standing !== "over-walk-away"));
  return { quantity, rows, unquoted, best, verdict: explain(best, rows, quantity, targets) };
}
