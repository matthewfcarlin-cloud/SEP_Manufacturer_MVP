import { compareVersions, summarizeVersion } from "./compare";
import type { Project, ProjectVersion } from "./types";

export type IterationStep = {
  from: number;
  to: number;
  /** Why it changed: the applied AI tweak, else the user's note. */
  change: string | null;
  /** The measured result, e.g. "Unit cost −14%, fit score +5." */
  summary: string;
};

/**
 * How the design improved, version by version. Only analyzed versions take
 * part, so every step's result is measured rather than guessed.
 */
export function buildIterationStory(project: Project, topShopName?: (version: ProjectVersion) => string | undefined): IterationStep[] {
  const analyzed = project.versions.filter((v) => v.analysis);
  return analyzed.slice(1).map((to, i) => {
    const from = analyzed[i];
    const comparison = compareVersions(summarizeVersion(from, topShopName?.(from)), summarizeVersion(to, topShopName?.(to)));
    return {
      from: from.number,
      to: to.number,
      change: to.appliedTweak?.change ?? to.changeNote ?? null,
      summary: comparison.summary,
    };
  });
}
