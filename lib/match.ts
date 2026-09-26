import { getShops } from "@/lib/shops";
import { PROCESS_LABELS } from "@/lib/processes";
import type { Machine, Project, ShopMatch } from "@/lib/types";

const SLIGHT_OVERAGE_RATIO = 0.15;

/** Deterministically rank shop machines against a project's analyzed processes. */
export function matchProject(project: Project): ShopMatch[] {
  if (!project.geometry || !project.analysis) return [];

  const part = project.geometry.boundingBoxMm;
  const matches: ShopMatch[] = [];

  for (const shop of getShops()) {
    for (const machine of shop.machines) {
      for (const path of project.analysis.paths) {
        if (machine.type !== path.process) continue;

        const dimensions = ["x", "y", "z"] as const;
        const overages = dimensions.map((axis) => part[axis] / machine.envelopeMm[axis]);
        const maxOverage = Math.max(...overages);
        if (maxOverage > 1 + SLIGHT_OVERAGE_RATIO) continue;

        const splitRequired = maxOverage > 1;
        const overlap = path.materials.filter((material) =>
          machine.materials.some((available) => normalize(available).includes(normalize(material)) || normalize(material).includes(normalize(available))),
        );
        const quantityFits = project.targetQuantity >= shop.minOrderQty && project.targetQuantity <= shop.maxOrderQty;
        const quantityNear = project.targetQuantity < shop.minOrderQty
          ? shop.minOrderQty / Math.max(project.targetQuantity, 1) <= 2
          : project.targetQuantity / shop.maxOrderQty <= 2;

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
          ? `Target quantity (${project.targetQuantity}) is within this shop's ${shop.minOrderQty}–${shop.maxOrderQty} unit range.`
          : `Target quantity (${project.targetQuantity}) is outside this shop's ${shop.minOrderQty}–${shop.maxOrderQty} unit range.`);
        if (machine.idleThisMonth) reasons.push("This machine has idle capacity this month.");

        matches.push({
          shopId: shop.id,
          score,
          matchedMachine: machine as Machine,
          reasons,
          requiredTweaks: [
            ...(splitRequired ? ["Split the part into sections that fit the machine envelope, then add alignment features for assembly."] : []),
            ...path.designTweaks.map((tweak) => tweak.change),
          ],
          idleBoost: machine.idleThisMonth,
        });
      }
    }
  }

  return matches.sort((a, b) => b.score - a.score || a.shopId.localeCompare(b.shopId) || a.matchedMachine.model.localeCompare(b.matchedMachine.model)).slice(0, 5);
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}
