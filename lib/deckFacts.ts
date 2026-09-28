import sampleProject from "@/demo/sample-project.json";
import { buildBusinessCase } from "@/lib/businessCase";
import { effectiveCostCurve } from "@/lib/costCurve";
import { formatDimensions, formatToolingRange, formatUnitCostRange, formatUsd } from "@/lib/format";
import { matchVersion } from "@/lib/match";
import { allInPerUnit, bestValueId, fastestId, sortQuotes } from "@/lib/outreach/compare";
import { ACTION_ESTIMATE_USD, type AiAction } from "@/lib/usage/budget";
import { etsySale } from "@/lib/sell/fees";
import { PROCESS_LABELS } from "@/lib/processes";
import { projectSchema } from "@/lib/schemas";
import { getShopById, getShops, summarizeShops } from "@/lib/shops";
import type { Outreach } from "@/lib/types";
import { latestVersion } from "@/lib/versions";

/**
 * Every number the pitch deck shows, computed from the saved demo projects and
 * the seeded shops with the app's own functions. Nothing on a slide is typed
 * in by hand, so the deck can't drift from what the product actually says.
 */
export type DeckFacts = {
  shops: number;
  machines: number;
  idle: number;
  /** Conservative AI cost (the budget gate's per-action estimates) to take one product from idea to a first supplier email. */
  aiCostToOutreach: number;
  pedal: {
    name: string;
    quantity: number;
    dims: string;
    oneLiner: string;
    retail: string;
    revenuePerUnit: number;
    paths: { label: string; fit: number; unit: string; tooling: string }[];
    curves: { label: string; points: { quantity: number; mid: number }[] }[];
    verdict: string;
    match: { shop: string; neighborhood: string; machine: string; idle: boolean; reasons: string[] } | null;
    plan: { launchDate: string; milestones: number } | null;
    listing: { title: string; tags: string[]; price: string; afterFees: string } | null;
    /** The spec sheet the demo shops were sent, and their simulated quotes, best value first. */
    outreach: {
      spec: { process: string; dims: string; material: string; tiers: string; target: string | null; quoteBy: string };
      quotes: { shop: string; process: string; tooling: string; allIn: string; lead: number; moq: number; best: boolean; fastest: boolean }[];
    } | null;
  };
};

/** The AI actions between an idea and a first supplier email: analysis, BOM, price, sourcing plan, one supplier draft. */
const TO_OUTREACH: AiAction[] = ["analysis", "bom", "price", "sourcing", "negotiation"];

function pedalFacts() {
  const project = projectSchema.parse(sampleProject);
  const v = latestVersion(project);
  const paths = v.analysis?.paths ?? [];
  const inputs = v.businessCase;
  const bc = inputs ? buildBusinessCase(paths, { ...inputs, quantityTiers: [v.targetQuantity] }) : null;
  const top = matchVersion(v)[0];
  const shop = top ? getShopById(top.shopId) : undefined;
  return {
    name: project.name,
    quantity: v.targetQuantity,
    dims: v.geometry ? formatDimensions(v.geometry.boundingBoxMm) : "",
    oneLiner: v.pitch?.oneLiner ?? project.name,
    retail: inputs ? formatUsd(inputs.retailPriceUsd) : "",
    revenuePerUnit: bc?.revenuePerUnit ?? 0,
    paths: paths.map((p) => ({
      label: PROCESS_LABELS[p.process],
      fit: p.fitScore,
      unit: formatUnitCostRange(p.unitCostUsd),
      tooling: formatToolingRange(p.toolingCostUsd),
    })),
    curves: paths.flatMap((p) => {
      const curve = effectiveCostCurve(p);
      return curve
        ? [{ label: PROCESS_LABELS[p.process], points: curve.points.map(({ quantity, mid }) => ({ quantity, mid })) }]
        : [];
    }),
    verdict: bc?.verdict.headline ?? "",
    match:
      top && shop
        ? {
            shop: shop.name,
            neighborhood: shop.neighborhood,
            machine: top.matchedMachine.model,
            idle: top.matchedMachine.idleThisMonth,
            reasons: top.reasons.slice(0, 3),
          }
        : null,
    plan: v.plan
      ? {
          launchDate: new Date(`${v.plan.launchDate}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
          milestones: v.plan.milestones.length,
        }
      : null,
    listing: v.listing
      ? {
          title: v.listing.title,
          tags: v.listing.tags,
          price: formatUsd(v.listing.priceUsd),
          afterFees: formatUsd(etsySale(v.listing.priceUsd).afterFeesUsd),
        }
      : null,
    outreach: outreachFacts(v.outreach),
  };
}

function outreachFacts(outreach: Outreach | undefined): DeckFacts["pedal"]["outreach"] {
  if (!outreach) return null;
  const { specSheet: spec, quotes } = outreach;
  const best = bestValueId(quotes);
  const fastest = fastestId(quotes);
  const cents = (n: number) => formatUnitCostRange({ low: n, high: n });
  return {
    spec: {
      process: PROCESS_LABELS[spec.process],
      dims: formatDimensions(spec.dimensionsMm),
      material: spec.material,
      tiers: spec.quantityTiers.map((q) => q.toLocaleString("en-US")).join(" / "),
      target: spec.targetUnitPriceUsd === undefined ? null : cents(spec.targetUnitPriceUsd),
      quoteBy: spec.quoteBy,
    },
    quotes: sortQuotes(quotes, "value").map((q) => ({
      shop: getShopById(q.shopId)?.name ?? q.shopId,
      process: PROCESS_LABELS[q.process],
      tooling: formatToolingRange({ low: q.toolingUsd, high: q.toolingUsd }),
      allIn: cents(allInPerUnit(q)),
      lead: q.leadTimeDays,
      moq: q.moq,
      best: q.id === best,
      fastest: q.id === fastest,
    })),
  };
}

export function buildDeckFacts(): DeckFacts {
  const shops = getShops();
  const stats = summarizeShops(shops);
  return {
    shops: stats.shops,
    machines: stats.machines,
    idle: stats.idleMachines,
    aiCostToOutreach: TO_OUTREACH.reduce((sum, action) => sum + ACTION_ESTIMATE_USD[action], 0),
    pedal: pedalFacts(),
  };
}
