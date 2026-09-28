import { buildBusinessCase, MIN_HEALTHY_MARGIN, niceCeil, retailNeededFor } from "../businessCase";
import type { BusinessCaseInputs, ManufacturingPath } from "../types";

// The Money stage in plain words (design/DESIGN.md §4–5): money per sale,
// never a margin percentage. Pure and client-safe, so the price slider can
// recompute it on every move.

export type MoneyTone = "good" | "warn" | "bad" | "neutral";
export type MoneyReadout = { tone: MoneyTone; title: string; explanation: string };

/** The run sizes the profit bars always show. */
export const PROFIT_BAR_QUANTITIES = [100, 1000, 10000] as const;

const dollars = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const price = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

/** Whether this price makes money at the target quantity, as a verdict sentence and one line of what to do. */
export function moneyReadout(paths: readonly ManufacturingPath[], inputs: BusinessCaseInputs | undefined, targetQuantity: number): MoneyReadout {
  if (!inputs) return { tone: "neutral", title: "Does it make money?", explanation: "Pick a price for one, and Moko shows what you'd make on each sale." };
  const [tier] = buildBusinessCase(paths, { ...inputs, quantityTiers: [targetQuantity] }).tiers;
  const at = `At ${price(inputs.retailPriceUsd)}`;
  const fairPrice = dollars(retailNeededFor(tier.allIn.mid, inputs.revenueShare));
  const perSale = inputs.retailPriceUsd * inputs.revenueShare - tier.allIn.mid;
  const made = `Estimated for ${targetQuantity.toLocaleString("en-US")} made, after the cost of making each one.`;
  if (tier.margin.mid < 0) return { tone: "bad", title: `${at} you'd lose money on each sale.`, explanation: `Try a design tweak, or raise the price to about ${fairPrice}.` };
  if (tier.margin.mid < MIN_HEALTHY_MARGIN) return { tone: "warn", title: `${at} you'd make only about ${dollars(perSale)} per sale.`, explanation: `A price near ${fairPrice} leaves room to spare.` };
  return { tone: "good", title: `${at} you'd make about ${dollars(perSale)} per sale.`, explanation: made };
}

export type ProfitBar = { quantity: number; profit: number };

/** Total profit (negative for a loss) if you made 100, 1,000 or 10,000 at this price. */
export function profitBars(paths: readonly ManufacturingPath[], inputs: BusinessCaseInputs): ProfitBar[] {
  const { revenuePerUnit, tiers } = buildBusinessCase(paths, { ...inputs, quantityTiers: [...PROFIT_BAR_QUANTITIES] });
  return tiers.map((t) => ({ quantity: t.quantity, profit: t.quantity * (revenuePerUnit - t.allIn.mid) }));
}

/** The price slider's range: from $1 to past the current price, the AI's suggestion and a healthy price. */
export function priceRange(paths: readonly ManufacturingPath[], inputs: BusinessCaseInputs | undefined, targetQuantity: number): { min: number; max: number; step: number } {
  const share = inputs?.revenueShare ?? 0.5;
  const [tier] = buildBusinessCase(paths, { retailPriceUsd: 1, priceSource: "user", revenueShare: share, quantityTiers: [targetQuantity] }).tiers;
  const top = Math.max((inputs?.retailPriceUsd ?? 0) * 2, inputs?.priceSuggestion?.high ?? 0, retailNeededFor(tier.allIn.mid, share) * 1.5);
  return { min: 1, max: niceCeil(top), step: 1 };
}
