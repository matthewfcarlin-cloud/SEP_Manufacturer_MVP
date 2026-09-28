import { cx } from "./classes";
import { progressPercent, stepLabel } from "./progress";

/** Progress bar (§3): 6px pill, accent fill, "Step 3 of 6" beside it. */
export function ProgressBar({ step, total, label, className }: { step: number; total: number; label?: string; className?: string }) {
  const text = label ?? stepLabel(step, total);
  return (
    <div className={cx("flex items-center gap-3", className)}>
      <div role="progressbar" aria-label={text} aria-valuemin={0} aria-valuemax={total} aria-valuenow={step} className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-pill bg-border">
        <div className="h-full rounded-pill bg-accent transition-[width]" style={{ width: `${progressPercent(step, total)}%` }} />
      </div>
      <span className="type-small shrink-0 text-muted">{text}</span>
    </div>
  );
}
