import sampleProject from "@/demo/sample-project.json";
import { buildBusinessCase } from "@/lib/businessCase";
import { effectiveCostCurve } from "@/lib/costCurve";
import { formatDimensions, formatToolingRange, formatUnitCostRange, formatUsd } from "@/lib/format";
import { matchVersion } from "@/lib/match";
import { etsySale } from "@/lib/sell/fees";
import { PROCESS_LABELS } from "@/lib/processes";
import { projectSchema } from "@/lib/schemas";
import { getShopById, getShops, summarizeShops } from "@/lib/shops";
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
    /** Launch plan milestones as day offsets from the plan's start. */
    plan: { launchDate: string; totalDays: number; milestones: { title: string; from: number; days: number }[] } | null;
    listing: { title: string; tags: string[]; price: string; afterFees: string } | null;
  };
};

const DAY_MS = 86_400_000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);


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
          totalDays: daysBetween(v.plan.startDate, v.plan.launchDate) + 1,
          milestones: v.plan.milestones.map((m) => ({
            title: m.title,
            from: daysBetween(v.plan!.startDate, m.startDate),
            days: daysBetween(m.startDate, m.endDate) + 1,
          })),
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
  };
}

export function buildDeckFacts(): DeckFacts {
  const shops = getShops();
  const stats = summarizeShops(shops);
  return {
    shops: stats.shops,
    machines: stats.machines,
    idle: stats.idleMachines,
    pedal: pedalFacts(),
  };
}
