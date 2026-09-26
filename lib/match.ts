import { getShops } from "@/lib/shops";
import { PROCESS_LABELS } from "@/lib/processes";
import type { Machine, ProjectVersion, ShopMatch } from "@/lib/types";

const SLIGHT_OVERAGE_RATIO = 0.15;
const MAX_MATCHES = 5;

type Dims = { x: number; y: number; z: number };

type Matchable = Pick<ProjectVersion, "geometry" | "analysis" | "targetQuantity">;

/** Deterministically rank shop machines against one version's analyzed processes. */
export function matchVersion(version: Matchable): ShopMatch[] {
  if (!version.geometry || !version.analysis) return [];

  const part = version.geometry.boundingBoxMm;
  const matches: ShopMatch[] = [];

  for (const shop of getShops()) {
    for (const machine of shop.machines) {
      for (const path of version.analysis.paths) {
        if (machine.type !== path.process) continue;

        const maxOverage = envelopeOverage(part, machine.envelopeMm);
        if (maxOverage > 1 + SLIGHT_OVERAGE_RATIO) continue;

        const splitRequired = maxOverage > 1;
        const overlap = path.materials.filter((material) =>
          machine.materials.some((available) => normalize(available).includes(normalize(material)) || normalize(material).includes(normalize(available))),
        );
        const quantityFits = version.targetQuantity >= shop.minOrderQty && version.targetQuantity <= shop.maxOrderQty;
        const quantityNear = version.targetQuantity < shop.minOrderQty
          ? shop.minOrderQty / Math.max(version.targetQuantity, 1) <= 2
          : version.targetQuantity / shop.maxOrderQty <= 2;

        let score = path.fitScore * 0.7 + (overlap.length ? 15 : 0);
        if (quantityFits) score += 10;
        else if (!quantityNear) score -= 12;
        if (machine.idleThisMonth) score += 20;
        if (splitRequired) score -= 18;
        score = Math.round(Math.max(0, Math.min(100, score)));

        const reasons = [`Process matches the ${path.fitScore}/100 ${PROCESS_LABELS[path.process]} path.`];
        if (splitRequired) reasons.push("Part exceeds the machine envelope slightly; it can fit after splitting and reassembly.");
        else reasons.push("Part fits within the machine's work envelope.");
        reasons.push(overlap.length
          ? `Material match: ${overlap.join(", ")}.`
          : "No direct material overlap was listed; confirm an alternative with the shop.");
        reasons.push(quantityFits
          ? `Target quantity (${version.targetQuantity}) is within this shop's ${shop.minOrderQty}–${shop.maxOrderQty} unit range.`
          : `Target quantity (${version.targetQuantity}) is outside this shop's ${shop.minOrderQty}–${shop.maxOrderQty} unit range.`);
        if (machine.idleThisMonth) reasons.push("This machine has idle capacity this month.");

        matches.push({
          shopId: shop.id,
          score,
          matchedMachine: machine as Machine,
          reasons,
          // The split is genuinely required to use this machine; the path's top
          // design tweak is the one change we'd quote against ("fits with tweak X").
          requiredTweaks: [
            ...(splitRequired ? ["Split the part into sections that fit the machine envelope, then add alignment features for assembly."] : []),
            ...path.designTweaks.slice(0, 1).map((tweak) => tweak.change),
          ],
          idleBoost: machine.idleThisMonth,
        });
      }
    }
  }

  const ranked = [...matches].sort(
    (a, b) => b.score - a.score || a.shopId.localeCompare(b.shopId) || a.matchedMachine.model.localeCompare(b.matchedMachine.model),
  );
  // One entry per shop (its best machine), so five matches means five shops.
  const seen = new Set<string>();
  return ranked.filter((m) => !seen.has(m.shopId) && seen.add(m.shopId)).slice(0, MAX_MATCHES);
}

/**
 * Largest ratio of part size to envelope size, allowing the part to be
 * rotated: both sets of dimensions are compared smallest-to-smallest.
 * <= 1 means it fits.
 */
function envelopeOverage(part: Dims, envelope: Dims): number {
  const p = [part.x, part.y, part.z].sort((a, b) => a - b);
  const e = [envelope.x, envelope.y, envelope.z].sort((a, b) => a - b);
  return Math.max(...p.map((dim, i) => dim / e[i]));
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}
