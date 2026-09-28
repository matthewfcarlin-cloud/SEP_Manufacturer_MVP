import type { ReactNode } from "react";
import { cx } from "./classes";

export type Illustration = "box" | "tool" | "spark";

// Friendly 120px line drawings: simple strokes in the accent color.
const DRAWINGS: Record<Illustration, ReactNode> = {
  box: (
    <>
      <path d="M20 44 60 26l40 18v40L60 102 20 84Z" />
      <path d="M20 44 60 62l40-18M60 62v40" />
      <path d="m40 35 40 18" strokeDasharray="4 5" />
    </>
  ),
  tool: (
    <>
      <path d="M78 22a18 18 0 0 0-17 24L26 81a8 8 0 0 0 12 12l35-35a18 18 0 0 0 24-17l-11 5-9-9Z" />
      <circle cx="32" cy="87" r="2" />
    </>
  ),
  spark: (
    <>
      <path d="M60 18c3 20 10 32 30 42-20 10-27 22-30 42-3-20-10-32-30-42 20-10 27-22 30-42Z" />
      <path d="M94 20v12M88 26h12M28 86v10M23 91h10" />
    </>
  ),
};

/** Empty state (§3): centered drawing, h2, one sentence, one primary button. */
export function EmptyState({ illustration = "box", title, sentence, action, className }: { illustration?: Illustration; title: ReactNode; sentence: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center", className)}>
      <svg aria-hidden viewBox="0 0 120 120" width={120} height={120} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="60" cy="60" r="56" fill="var(--accent-soft)" stroke="none" />
        {DRAWINGS[illustration]}
      </svg>
      <h2 className="type-h2 mt-2">{title}</h2>
      <p className="text-ink-2">{sentence}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
