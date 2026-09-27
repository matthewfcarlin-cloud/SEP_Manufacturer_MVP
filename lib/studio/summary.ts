import { buildBusinessCase } from "../businessCase";
import type { Project, ProjectVersion } from "../types";

type Range = { low: number; high: number };

export type KeyNumbers = {
  /** Best path's unit cost at the target quantity (est.). */
  unitCost?: Range;
  retailUsd?: number;
  /** Margin on what the maker receives, at the target quantity (est.). */
  margin?: Range & { mid: number };
};

export function keyNumbers(version: ProjectVersion): KeyNumbers {
  const best = version.analysis?.paths[0];
  const bc = version.businessCase;
  const margin =
    version.analysis && bc
      ? buildBusinessCase(version.analysis.paths, { ...bc, quantityTiers: [version.targetQuantity] }).tiers[0].margin
      : undefined;
  return { unitCost: best?.unitCostUsd, retailUsd: bc?.retailPriceUsd, margin };
}

export type TrendPoint = { version: number; low: number; high: number; mid: number };

/** Best-path unit cost for each analyzed version, oldest first: the line that should fall as the design improves. */
export function unitCostTrend(project: Project): TrendPoint[] {
  return project.versions.flatMap((v) => {
    const best = v.analysis?.paths[0];
    if (!best) return [];
    const { low, high } = best.unitCostUsd;
    return [{ version: v.number, low, high, mid: (low + high) / 2 }];
  });
}
