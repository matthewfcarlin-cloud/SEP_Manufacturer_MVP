import type { Project, ProjectVersion, Stage } from "../types";
import { latestVersion } from "../versions";

// A product's journey stage, derived from what already exists on its latest
// version. Pure and instant: the dashboard never asks an AI where you are.

export const STAGES: readonly { key: Stage; label: string }[] = [
  { key: "idea", label: "Idea" },
  { key: "design", label: "Design" },
  { key: "make", label: "Make" },
  { key: "money", label: "Money" },
  { key: "launch", label: "Launch" },
  { key: "sell", label: "Sell" },
];

export type StageStatus = "done" | "current" | "todo";

/** Whether each stage's work exists. Make, Launch and Sell grow as outreach, plan and listing land. */
const IS_DONE: Record<Stage, (v: ProjectVersion) => boolean> = {
  idea: () => true,
  design: (v) => Boolean(v.analysis),
  // A chosen local demo quote, or an Alibaba supplier the creator agreed terms with.
  make: (v) => Boolean(v.outreach?.chosenQuoteId) || Boolean(v.sourcing?.suppliers.some((s) => s.status === "agreed")),
  money: (v) => Boolean(v.businessCase),
  launch: (v) => Boolean(v.plan),
  sell: () => false, // done once a listing exists (build 5)
};

export function stageProgress(project: Project): { current: Stage; statuses: Record<Stage, StageStatus> } {
  const version = latestVersion(project);
  const done = STAGES.map((s) => IS_DONE[s.key](version));
  const firstGap = done.indexOf(false);
  const current = STAGES[firstGap === -1 ? STAGES.length - 1 : firstGap].key;
  const statuses = Object.fromEntries(
    STAGES.map((s, i) => [s.key, done[i] ? "done" : i === firstGap ? "current" : "todo"]),
  ) as Record<Stage, StageStatus>;
  return { current, statuses };
}
