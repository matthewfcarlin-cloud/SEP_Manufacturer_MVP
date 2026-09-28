import { formatToolingRange } from "./format";
import { processInSentence } from "./processes";
import type { BusinessCaseInputs, ManufacturingPath, Process } from "./types";

// The business case is computed, never stored: only its inputs are saved, so
// it always reflects the current analysis. Pure and client-safe, so the page
// can recompute it on every keystroke.

export const DEFAULT_QUANTITY_TIERS = [100, 1000, 10000] as const;
export const DEFAULT_REVENUE_SHARE = 0.5;
export const MAX_QUANTITY_TIERS = 5;
/** Margin on the maker's revenue that counts as healthy, not just positive. */
export const MIN_HEALTHY_MARGIN = 0.3;
/** Above this share of all-in cost, tooling (not the part) is what sinks a run. */
const TOOLING_DOMINANT_SHARE = 0.25;
/** Quantity search: 1 to 1M units in 2% steps. */
const SEARCH_MAX_QUANTITY = 1_000_000;
const SEARCH_STEP = 1.02;

type Range = { low: number; high: number };

/** How a cost was derived: interpolated on the AI's volume curve, clamped past its ends, or flat (no curve). */
export type CostBasis = "curve" | "clamped" | "flat";

export type CostAt = Range & { basis: CostBasis };
export type AllInCost = CostAt & { mid: number };

export type TierResult = {
  quantity: number;
  process: Process;
  basis: CostBasis;
  unitCost: Range;
  allIn: Range & { mid: number };
  /** Share of the maker's revenue per unit kept after cost; low uses the high cost. */
  margin: Range & { mid: number };
  profit: Range;
};

export type Verdict = { tone: "good" | "mixed" | "bad"; headline: string; detail?: string };

export type BusinessCase = {
  revenuePerUnit: number;
  tiers: TierResult[];
  /** Smallest run with a healthy margin on the cheapest process, or null. */
  healthyFrom: number | null;
  verdict: Verdict;
};

const lerpLog = (q: number, q0: number, q1: number, v0: number, v1: number) =>
  Math.exp(Math.log(v0) + ((Math.log(q) - Math.log(q0)) / (Math.log(q1) - Math.log(q0))) * (Math.log(v1) - Math.log(v0)));

/** Per-part cost (tooling excluded) at any quantity, interpolated log-log between the AI's priced volumes. */
export function unitCostAt(path: ManufacturingPath, quantity: number): CostAt {
  const points = path.unitCostAtVolume;
  if (!points?.length) return { ...path.unitCostUsd, basis: "flat" };
  const first = points[0];
  const last = points[points.length - 1];
  if (quantity <= first.quantity) return { low: first.low, high: first.high, basis: quantity === first.quantity ? "curve" : "clamped" };
  if (quantity >= last.quantity) return { low: last.low, high: last.high, basis: quantity === last.quantity ? "curve" : "clamped" };
  const i = points.findIndex((p) => p.quantity >= quantity);
  const [a, b] = [points[i - 1], points[i]];
  if (b.quantity === quantity) return { low: b.low, high: b.high, basis: "curve" };
  return {
    low: lerpLog(quantity, a.quantity, b.quantity, a.low, b.low),
    high: lerpLog(quantity, a.quantity, b.quantity, a.high, b.high),
    basis: "curve",
  };
}

/** Unit cost plus tooling spread over the run. */
export function allInCostAt(path: ManufacturingPath, quantity: number): AllInCost {
  const unit = unitCostAt(path, quantity);
  const low = unit.low + path.toolingCostUsd.low / quantity;
  const high = unit.high + path.toolingCostUsd.high / quantity;
  return { low, high, mid: (low + high) / 2, basis: unit.basis };
}

/** The path with the lowest all-in midpoint at this quantity (the same rule as cheapestByVolume). */
export function cheapestPathAt(paths: readonly ManufacturingPath[], quantity: number): ManufacturingPath {
  return paths.reduce((best, p) => (allInCostAt(p, quantity).mid < allInCostAt(best, quantity).mid ? p : best));
}

function* searchQuantities(): Generator<number> {
  for (let q = 1; q <= SEARCH_MAX_QUANTITY; q = Math.max(q + 1, Math.round(q * SEARCH_STEP))) yield q;
}

/** Rounds up to two significant figures: 1,247 → 1,300. */
export function niceCeil(n: number): number {
  if (n < 100) return Math.ceil(n);
  const magnitude = 10 ** (Math.floor(Math.log10(n)) - 1);
  return Math.ceil(n / magnitude) * magnitude;
}

/**
 * Smallest run where each part's revenue covers its all-in cost, i.e. where
 * tooling has paid back. Optimistic uses the low costs, conservative the high.
 */
export function breakEvenQuantity(path: ManufacturingPath, revenuePerUnit: number): { optimistic: number | null; conservative: number | null } {
  const find = (pick: (c: AllInCost) => number) => {
    for (const q of searchQuantities()) if (pick(allInCostAt(path, q)) <= revenuePerUnit) return niceCeil(q);
    return null;
  };
  return { optimistic: find((c) => c.low), conservative: find((c) => c.high) };
}

function evaluateTier(paths: readonly ManufacturingPath[], quantity: number, revenue: number): TierResult {
  const path = cheapestPathAt(paths, quantity);
  const unit = unitCostAt(path, quantity);
  const allIn = allInCostAt(path, quantity);
  const marginOf = (cost: number) => (revenue - cost) / revenue;
  return {
    quantity,
    process: path.process,
    basis: allIn.basis,
    unitCost: { low: unit.low, high: unit.high },
    allIn: { low: allIn.low, high: allIn.high, mid: allIn.mid },
    margin: { low: marginOf(allIn.high), high: marginOf(allIn.low), mid: marginOf(allIn.mid) },
    profit: { low: quantity * (revenue - allIn.high), high: quantity * (revenue - allIn.low) },
  };
}

function findHealthyFrom(paths: readonly ManufacturingPath[], revenue: number): number | null {
  const maxCost = revenue * (1 - MIN_HEALTHY_MARGIN);
  for (const q of searchQuantities()) if (allInCostAt(cheapestPathAt(paths, q), q).mid <= maxCost) return niceCeil(q);
  return null;
}

// ---------------------------------------------------------------------------
// Verdict: plain-English templates over the computed numbers.
// ---------------------------------------------------------------------------

const count = (n: number) => n.toLocaleString("en-US");
const dollars = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n);
const cents = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const pct = (n: number) => `${Math.round(n * 100)}%`;
/** Cents under $10 ("$0.50"), whole dollars above ("$36"). */
const money = (n: number) => (Math.abs(n) < 10 ? cents(n) : dollars(n));
const MINUS = "−";
const signedPct = (n: number) => `${Math.round(n * 100) < 0 ? MINUS : ""}${Math.abs(Math.round(n * 100))}%`;

/** "31–44%", or "−56% to 28%" once a negative is involved (a dash between negatives misreads). */
export function formatMarginRange(m: Range): string {
  return m.low < 0 ? `${signedPct(m.low)} to ${signedPct(m.high)}` : `${Math.round(m.low * 100)}–${pct(m.high)}`;
}

const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: 1 });

/** "$135k", "−$4.1k". */
export function formatCompactUsd(n: number): string {
  const text = usdCompact.format(Math.abs(n)).replace("K", "k");
  return n < 0 ? `${MINUS}${text}` : text;
}

/** Retail needed for a healthy margin at this all-in cost, rounded up to a whole dollar. */
export const retailNeededFor = (cost: number, share: number) => Math.ceil(cost / share / (1 - MIN_HEALTHY_MARGIN));

/**
 * Why runs below `healthyFrom` don't work, diagnosed on the process that
 * becomes profitable there: if tooling is a big share of its cost at that
 * volume, it's the tooling; otherwise it's the per-part cost. An alternative
 * is only suggested if it actually covers its cost at the smallest run shown.
 */
function lowVolumeDetail(paths: readonly ManufacturingPath[], healthyFrom: number, smallestRun: number, revenue: number): string {
  const path = cheapestPathAt(paths, healthyFrom);
  const cost = allInCostAt(path, healthyFrom);
  const toolingPerPart = (path.toolingCostUsd.low + path.toolingCostUsd.high) / 2 / healthyFrom;
  if (toolingPerPart / cost.mid < TOOLING_DOMINANT_SHARE) {
    const tweak = path.designTweaks[0];
    const consider = tweak ? `this design tweak: ${tweak.change}` : "a higher retail price";
    return `Under about ${count(healthyFrom)} made, the cost of each one is too high for this price. Try ${consider}`.replace(/\.?$/, ".");
  }

  const tooling = `The one-time setup cost is too big to pay back under about ${count(healthyFrom)} made: ${processInSentence(path.process)} needs ${formatToolingRange(path.toolingCostUsd)} up front.`;
  const others = paths.filter((p) => p.process !== path.process);
  const alternative = others.length ? cheapestPathAt(others, smallestRun) : undefined;
  const altCost = alternative && allInCostAt(alternative, smallestRun);
  if (!alternative || !altCost || altCost.mid >= revenue) {
    return `${tooling} No other way shown covers its cost at ${count(smallestRun)} made at this price, so try a bigger first run or a higher price.`;
  }
  const altTooling = alternative.toolingCostUsd.high === 0 ? "no one-time setup cost" : `${formatToolingRange(alternative.toolingCostUsd)} one-time setup cost`;
  return `${tooling} Try ${processInSentence(alternative.process)} for smaller runs (about ${cents(altCost.mid)} each at ${count(smallestRun)} made, ${altTooling}).`;
}

function buildVerdict(paths: readonly ManufacturingPath[], tiers: TierResult[], inputs: BusinessCaseInputs, healthyFrom: number | null): Verdict {
  const price = dollars(inputs.retailPriceUsd);
  const revenue = inputs.retailPriceUsd * inputs.revenueShare;
  const perSale = (t: TierResult) => money(revenue - t.allIn.mid);
  const healthy = tiers.findIndex((t) => t.margin.mid >= MIN_HEALTHY_MARGIN);
  const first = tiers[0];
  const last = tiers[tiers.length - 1];

  if (healthy === 0) {
    return {
      tone: "good",
      headline: `Makes money at every run size shown at ${price}.`,
      detail:
        tiers.length > 1
          ? `About ${perSale(first)} per sale at ${count(first.quantity)} made, ${perSale(last)} at ${count(last.quantity)} (est.).`
          : `About ${perSale(first)} per sale at ${count(first.quantity)} made (est.).`,
    };
  }
  if (healthy > 0) {
    const tier = tiers[healthy];
    const from = healthyFrom ?? tier.quantity;
    return {
      tone: "mixed",
      headline: `Makes money from about ${count(from)} made at ${price} (about ${perSale(tier)} per sale at ${count(tier.quantity)}, est.).`,
      detail: lowVolumeDetail(paths, from, first.quantity, inputs.retailPriceUsd * inputs.revenueShare),
    };
  }
  const best = tiers.reduce((a, b) => (b.margin.mid > a.margin.mid ? b : a));
  const needed = dollars(retailNeededFor(best.allIn.mid, inputs.revenueShare));
  if (best.margin.mid >= 0) {
    return {
      tone: "mixed",
      headline: `At ${price} you'd only just make money: at best about ${perSale(best)} per sale at ${count(best.quantity)} made.`,
      detail: `A price around ${needed} leaves room to spare at ${count(best.quantity)} made.`,
    };
  }
  return {
    tone: "bad",
    headline: `Loses money at every run size shown at ${price}.`,
    detail: `Each one costs at least about ${cents(best.allIn.mid)} to make, so the price would need to be about ${needed}.`,
  };
}

/** Everything the business case shows, from the analysis's paths and the user's inputs. */
export function buildBusinessCase(paths: readonly ManufacturingPath[], inputs: BusinessCaseInputs): BusinessCase {
  const revenuePerUnit = inputs.retailPriceUsd * inputs.revenueShare;
  const tiers = inputs.quantityTiers.map((q) => evaluateTier(paths, q, revenuePerUnit));
  const healthyFrom = findHealthyFrom(paths, revenuePerUnit);
  return { revenuePerUnit, tiers, healthyFrom, verdict: buildVerdict(paths, tiers, inputs, healthyFrom) };
}
