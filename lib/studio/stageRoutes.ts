import type { Stage } from "../types";

// The product studio shows one stage at a time; each stage has its own URL.
// Pure, so the stepper, the summaries and the links agree.

const PATHS: Record<Stage, string> = { idea: "/idea", design: "", make: "/make", money: "/money", launch: "/plan", sell: "/sell" };

/** Screens that can show an older version (?v=N). */
const VERSIONED: ReadonlySet<Stage> = new Set(["idea", "design", "money"]);

export function stageHref(projectId: string, stage: Stage, version?: number): string {
  const path = `/project/${projectId}${PATHS[stage]}`;
  return version !== undefined && VERSIONED.has(stage) ? `${path}?v=${version}` : path;
}

const SEGMENT_STAGE: Record<string, Stage> = { idea: "idea", versions: "idea", compare: "idea", money: "money", make: "make", plan: "launch", pitch: "launch", sell: "sell" };

/** Which stage a product screen belongs to; the product's root is Design. */
export function stageForPath(pathname: string): Stage {
  const segment = pathname.match(/^\/project\/[^/]+\/([^/?#]+)/)?.[1];
  return (segment && SEGMENT_STAGE[segment]) || "design";
}
