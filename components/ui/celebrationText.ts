import { STAGES, type StageStatus } from "@/lib/studio/stage";
import type { Stage } from "@/lib/types";

// What the next stage asks of the creator, in their words.
const NEXT_ACTION: Record<Stage, string> = {
  idea: "describe your idea",
  design: "see how to make it",
  make: "find who can make it",
  money: "set a price that makes money",
  launch: "plan your launch",
  sell: "get ready to sell",
};

/**
 * The toast after a stage completes: "Nice, Make is done. Next: …", naming the
 * next stage that isn't done yet (stages can be finished out of order).
 */
export function celebrationMessage(stage: Stage, statuses?: Readonly<Record<Stage, StageStatus>>): string {
  const index = STAGES.findIndex((s) => s.key === stage);
  const done = `Nice, ${STAGES[index].label} is done.`;
  const next = STAGES.slice(index + 1).find((s) => statuses?.[s.key] !== "done");
  return next ? `${done} Next: ${NEXT_ACTION[next.key]}.` : `${done} Your product is ready to sell.`;
}

/** Stages that just became done, comparing the last statuses seen with the current ones. */
export function newlyDone(before: Readonly<Record<Stage, StageStatus>> | undefined, after: Readonly<Record<Stage, StageStatus>>): Stage[] {
  if (!before) return [];
  return STAGES.map((s) => s.key).filter((key) => before[key] !== "done" && after[key] === "done");
}
