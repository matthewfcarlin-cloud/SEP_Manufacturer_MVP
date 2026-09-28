import type { ReactNode } from "react";
import { cx, TONES, type Tone } from "./classes";

/** Status pill (§3): 26px, pill radius, soft bg + strong text of one color, a 6px dot first. */
export function StatusPill({ tone = "neutral", title, className, children }: { tone?: Tone; title?: string; className?: string; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <span title={title} className={cx("inline-flex h-[26px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 text-[13px] font-medium", t.soft, t.text, className)}>
      <span aria-hidden className={cx("h-1.5 w-1.5 rounded-pill", t.dot)} />
      {children}
    </span>
  );
}
