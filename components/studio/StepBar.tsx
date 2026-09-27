import { STAGES, type StageStatus } from "@/lib/studio/stage";
import type { Stage } from "@/lib/types";

/** A thin progress bar with "Step N of 6 · Stage", for everyday readers. */
export function StepBar({ statuses, stageIndex }: { statuses: Record<Stage, StageStatus>; stageIndex: number }) {
  const done = STAGES.filter((s) => statuses[s.key] === "done").length;
  const allDone = done === STAGES.length;
  const label = allDone ? "All 6 steps done" : `Step ${stageIndex + 1} of 6 · ${STAGES[stageIndex].label}`;
  return (
    <div className="flex flex-col gap-1.5">
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={6} aria-valuenow={done} className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent" style={{ width: `${(done / STAGES.length) * 100}%` }} />
      </div>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
