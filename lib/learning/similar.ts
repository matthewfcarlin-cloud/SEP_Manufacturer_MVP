import { processInSentence } from "../processes";
import type { ProductFeatures, SizeBucket } from "../types";
import type { FeatureQuery } from "./features";
import { CATEGORY_LABELS, MATERIAL_LABELS, SIZE_BUCKETS } from "./vocabulary";

// Similar-product retrieval, v1: weighted nearest neighbors over the
// structured features (BACKEND.md 3.3). No embeddings.

const WEIGHTS = { category: 3, process: 3, material: 2, sizeBucket: 2, quantity: 2 } as const;
/** Quantities this many orders of magnitude apart score zero. */
const QUANTITY_DECADES = 2;
export const DEFAULT_K = 5;
/** A row must match at least this share of what the query knows. */
export const MIN_SCORE = 0.5;

function sizeCloseness(a: SizeBucket, b: SizeBucket): number {
  const gap = Math.abs(SIZE_BUCKETS.indexOf(a) - SIZE_BUCKETS.indexOf(b));
  return gap === 0 ? 1 : gap === 1 ? 0.5 : 0;
}

/** 0–1: the weighted share of the query's known features that the row matches. */
export function similarityScore(query: FeatureQuery, row: ProductFeatures): number {
  let total = 0;
  let matched = 0;
  const add = (weight: number, closeness: number) => {
    total += weight;
    matched += weight * closeness;
  };
  if (query.category) add(WEIGHTS.category, row.category === query.category ? 1 : 0);
  if (query.process) add(WEIGHTS.process, row.process === query.process ? 1 : 0);
  if (query.material) add(WEIGHTS.material, row.material === query.material ? 1 : 0);
  if (query.sizeBucket) add(WEIGHTS.sizeBucket, sizeCloseness(query.sizeBucket, row.sizeBucket));
  if (query.quantity) {
    const decades = Math.abs(Math.log10(query.quantity) - Math.log10(row.quantity));
    add(WEIGHTS.quantity, Math.max(0, 1 - decades / QUANTITY_DECADES));
  }
  return total === 0 ? 0 : matched / total;
}

/** The k most similar rows from other products, one (the best) per product. */
export function findSimilar(query: FeatureQuery, rows: ProductFeatures[], k = DEFAULT_K, minScore = MIN_SCORE): ProductFeatures[] {
  const bestPerProduct = new Map<string, { row: ProductFeatures; score: number }>();
  for (const row of rows) {
    if (row.projectId === query.projectId) continue;
    const score = similarityScore(query, row);
    if (score < minScore) continue;
    const current = bestPerProduct.get(row.projectId);
    if (!current || score > current.score) bestPerProduct.set(row.projectId, { row, score });
  }
  return [...bestPerProduct.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((m) => m.row);
}

const usd = (n: number) => `$${n.toFixed(2)}`;
const units = (n: number) => n.toLocaleString("en-US");

function describe(row: ProductFeatures): string {
  const kind = [
    row.category ? CATEGORY_LABELS[row.category] : "product (category not tagged)",
    processInSentence(row.process).replace(/^./, (c) => c.toUpperCase()),
    MATERIAL_LABELS[row.material],
    `size ${row.sizeBucket.toUpperCase()}`,
    `${units(row.quantity)} units`,
  ].join(" · ");
  const facts = [`AI estimate ${usd(row.unitCostEst.low)}–${usd(row.unitCostEst.high)}/unit`];
  facts.push(
    row.realQuotes
      ? `${row.realQuotes.count} real supplier quote${row.realQuotes.count === 1 ? "" : "s"}: median ${usd(row.realQuotes.medianUnitUsd)}/unit at ${units(row.realQuotes.medianQuantity)} units`
      : "no real quotes yet",
  );
  if (row.revision) {
    const pct = row.revision.unitCostChangePct;
    facts.push(`revised with a ${processInSentence(row.revision.tweakProcess)} tweak: unit cost ${pct < 0 ? "−" : "+"}${Math.abs(pct)}%`);
  }
  return `- ${kind}: ${facts.join("; ")}.`;
}

/** The prompt block for similar products, or null when there are none. */
export function similarProductsBlock(rows: ProductFeatures[]): string | null {
  if (rows.length === 0) return null;
  return [
    "SIMILAR PRODUCTS ON THIS PLATFORM (other creators' products, shared anonymously with their permission; structured data only, sizes by largest side: XS <50 mm, S <150, M <400, L <1000, XL beyond):",
    ...rows.map(describe),
    "Use these as reference points, not as this part's numbers. When one is clearly comparable, say so briefly and say where the number came from (e.g. \"a similar aluminum enclosure got 2 real quotes around $41.50/unit at 250 units\"). Real quotes outweigh AI estimates. This part's own geometry and quantity come first.",
  ].join("\n");
}
