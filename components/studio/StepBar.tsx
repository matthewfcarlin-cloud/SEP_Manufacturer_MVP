import { ProgressBar } from "@/components/ui/ProgressBar";
import { STAGES, type StageStatus } from "@/lib/studio/stage";
import type { Stage } from "@/lib/types";

/** The product's progress: the shared bar with "Step N of 6", plus the stage name unless `showStage` is false. */
export function StepBar({ statuses, stageIndex, showStage = true, className = "max-w-sm" }: { statuses: Record<Stage, StageStatus>; stageIndex: number; showStage?: boolean; className?: string }) {
  const done = STAGES.filter((s) => statuses[s.key] === "done").length;
  const allDone = done === STAGES.length;
  const step = `Step ${stageIndex + 1} of 6`;
  const label = allDone ? "All 6 steps done" : showStage ? `${step} · ${STAGES[stageIndex].label}` : step;
  return <ProgressBar step={done} total={STAGES.length} label={label} className={className} />;
}
