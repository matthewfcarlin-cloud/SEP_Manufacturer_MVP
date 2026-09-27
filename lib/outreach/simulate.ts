import { getShopById } from "../shops";
import type { DemoQuote, ProjectVersion, Shop, ShopMatch } from "../types";

// Simulated quotes from the fictional demo shops. Deterministic (seeded by
// project, version and shop), free and instant; no AI. Each price sits inside
// the analysis estimate for the shop's process, placed by how well the job
// suits the shop: a machine that can start now and an order in its sweet spot land lower.

const MAX_QUOTES = 5;
const IDLE_DISCOUNT = 0.25;
const SWEET_SPOT_DISCOUNT = 0.1;
const OFF_RANGE_PREMIUM = 0.15;
const JITTER = 0.15;

/** FNV-1a string hash → mulberry32: a small, stable pseudo-random stream. */
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const lerp = (lo: number, hi: number, t: number) => lo + (hi - lo) * t;

const pick = <T,>(items: readonly T[], random: () => number): T => items[Math.floor(random() * items.length)];

/** A short, varied note in the shop's voice, from what's true about the shop and the job. */
function shopNote(match: ShopMatch, quantity: number, shop: Shop, random: () => number): string {
  const machine = match.matchedMachine;
  const opener = match.idleBoost
    ? pick(
        [
          `We can start on our ${machine.model} this week, right after sample approval.`,
          `Good timing: we can put this on our ${machine.model} this week.`,
          `We can start this week on the ${machine.model}.`,
        ],
        random,
      )
    : pick([`We'd run this on our ${machine.model}.`, `This is a good fit for our ${machine.model}.`], random);

  // A fact about this job comes first; otherwise one service detail.
  if (match.requiredTweaks.some((t) => t.startsWith("Split the part"))) {
    return `${opener} The part needs splitting to fit our envelope; the price includes assembly.`;
  }
  if (quantity < shop.minOrderQty || quantity > shop.maxOrderQty) {
    return `${opener} Our sweet spot is ${shop.minOrderQty.toLocaleString("en-US")}–${shop.maxOrderQty.toLocaleString("en-US")} units, so this run is priced accordingly.`;
  }
  const detail = pick(
    [
      "Happy to send one first-article sample before the full run.",
      `Finishing can be quoted separately; we work with a coater in ${shop.neighborhood}.`,
      "Price holds for 30 days; 50% up front, 50% on delivery.",
      "We'll confirm tolerances on a quick call before cutting metal.",
    ],
    random,
  );
  return `${opener} ${detail}`;
}

export function simulateQuotes(projectId: string, version: ProjectVersion, matches: ShopMatch[], requestedAt: string): DemoQuote[] {
  const paths = version.analysis?.paths ?? [];
  return matches.slice(0, MAX_QUOTES).flatMap((match, i) => {
    const path = paths.find((p) => p.process === match.matchedMachine.type);
    const shop = getShopById(match.shopId);
    if (!path || !shop) return [];
    const random = seededRandom(`${projectId}:${version.number}:${match.shopId}:${requestedAt}`);
    const inSweetSpot = version.targetQuantity >= shop.minOrderQty && version.targetQuantity <= shop.maxOrderQty;
    const t = clamp(
      0.5 - (match.idleBoost ? IDLE_DISCOUNT : 0) - (inSweetSpot ? SWEET_SPOT_DISCOUNT : -OFF_RANGE_PREMIUM) + (random() * 2 - 1) * JITTER,
      0.02,
      0.98,
    );
    const leadT = clamp((match.idleBoost ? 0.2 : 0.6) + (random() * 2 - 1) * JITTER, 0, 1);
    return [
      {
        id: `q${i + 1}-${match.shopId}`,
        shopId: match.shopId,
        machineModel: match.matchedMachine.model,
        process: path.process,
        quantity: version.targetQuantity,
        unitPriceUsd: Math.round(lerp(path.unitCostUsd.low, path.unitCostUsd.high, t) * 100) / 100,
        toolingUsd: Math.round(lerp(path.toolingCostUsd.low, path.toolingCostUsd.high, t) / 10) * 10,
        leadTimeDays: Math.max(1, Math.round(lerp(path.leadTimeDays.low, path.leadTimeDays.high, leadT))),
        moq: shop.minOrderQty,
        note: shopNote(match, version.targetQuantity, shop, random),
        status: "quoted" as const,
        isDemo: true as const,
      },
    ];
  });
}
