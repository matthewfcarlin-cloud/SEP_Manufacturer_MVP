import { STAGES, type StageStatus } from "@/lib/studio/stage";
import type { Stage } from "@/lib/types";

const BAR: Record<StageStatus, string> = { done: "bg-ink", current: "bg-accent", todo: "bg-line" };
const LABEL: Record<StageStatus, string> = { done: "text-ink", current: "text-accent", todo: "text-muted" };
const SPOKEN: Record<StageStatus, string> = { done: "done", current: "current stage", todo: "not started" };

/** The six-stage journey as a segmented rail; the current stage is the first one not done. */
export function StageRail({ statuses }: { statuses: Record<Stage, StageStatus> }) {
  return (
    <ol aria-label="Journey stages" className="grid grid-cols-6 gap-1">
      {STAGES.map((s) => (
        <li key={s.key} className="flex min-w-0 flex-col gap-1.5">
          <span aria-hidden className={`h-1 ${BAR[statuses[s.key]]}`} />
          <span className={`eyebrow truncate text-[10px] ${LABEL[statuses[s.key]]}`}>
            {s.label}
            <span className="sr-only"> ({SPOKEN[statuses[s.key]]})</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
