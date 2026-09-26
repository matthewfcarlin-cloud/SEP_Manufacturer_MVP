import { formatDimensions } from "../format";
import { priceSuggestionSchema } from "../schemas";
import type { PriceSuggestion, Project, ProjectVersion } from "../types";
import { runStructured, type CallTextModel } from "./structured";

export type CallPriceModel = CallTextModel;

export const PRICE_SYSTEM_PROMPT = `You are a retail pricing analyst for consumer and hobbyist hardware. An independent inventor wants a starting retail price for their product, to test whether it can make money.

Price it from the market, not from what it costs to make: what do similar products sell for today, and where would this one sit among them given who buys it and how it's positioned?

- Give one suggested launch price plus a plausible low-high retail range, in USD.
- List 2-5 comparables: similar products or product categories with their typical retail price. Prefer categories ("Boutique fuzz pedals: $150-250"). Name a specific brand or model only when you are confident it exists and sells at about that price. Never invent products or prices.
- Price what this part or product is sold as. If it's a component of a larger finished product (an enclosure for a pedal, a case for a device), price the component, because the rest of the product's costs aren't part of this estimate.
- If the inventor states a retail target, address it in the reasoning: say whether the market supports it, or that it applies to a larger finished product.
- If the description is too vague to price confidently, widen the range and say what would narrow it in the reasoning.
- Keep reasoning to one or two plain sentences.`;

/** The product description the pricing model sees. Manufacturing costs are left out on purpose. */
export function buildPriceBrief(project: Project, version: ProjectVersion): string {
  const lines = [`Product: ${project.name}`, "", "What the inventor says it is:", version.notes.trim() || "(no notes given)"];
  // Features only: the analysis summary is written to carry a manufacturing
  // takeaway (often a cost), which would anchor the price to cost-plus.
  if (version.analysis) lines.push("", `Features: ${version.analysis.detectedFeatures.join("; ")}`);
  if (version.geometry) lines.push(`Size: ${formatDimensions(version.geometry.boundingBoxMm)}`);
  if (version.materialHints?.length) lines.push(`Materials considered: ${version.materialHints.join(", ")}`);
  lines.push("", "Suggest a retail price.");
  return lines.join("\n");
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Asks for a retail price, with one retry that names what failed validation. */
export function runPriceSuggestion(callModel: CallPriceModel, brief: string): Promise<PriceSuggestion> {
  return runStructured(callModel, brief, {
    schema: priceSuggestionSchema,
    logTag: "price",
    refusalMessage: "The AI declined to price this product.",
    failMessage: "The AI's price suggestion didn't pass our checks. Please try again or enter a price yourself.",
    normalize: (p) => ({ ...p, low: round2(p.low), high: round2(p.high), suggested: round2(p.suggested) }),
  });
}
