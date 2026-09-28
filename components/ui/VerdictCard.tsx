import { AlertTriangle, CircleCheck, CircleX, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx, TONES } from "./classes";

export type VerdictTone = "good" | "check" | "bad";

// Color follows the verdict, never alone: each tone has its own icon too.
const VERDICT: Record<VerdictTone, { tone: keyof typeof TONES; icon: LucideIcon }> = {
  good: { tone: "green", icon: CircleCheck },
  check: { tone: "amber", icon: AlertTriangle },
  bad: { tone: "red", icon: CircleX },
};

type Props = { tone: VerdictTone; title: ReactNode; explanation?: ReactNode; action?: ReactNode; className?: string; "aria-label"?: string };

/** Summary card (§3): a soft icon circle, the verdict in h2, one line of explanation, then ONE primary button. */
export function VerdictCard({ tone, title, explanation, action, className, "aria-label": ariaLabel }: Props) {
  const v = VERDICT[tone];
  const t = TONES[v.tone];
  const Icon = v.icon;
  return (
    <section role="status" aria-label={ariaLabel} className={cx("card flex flex-col items-start gap-3 p-7", className)}>
      <span className={cx("grid h-10 w-10 place-items-center rounded-pill", t.soft, t.text)}>
        <Icon aria-hidden size={20} strokeWidth={1.75} />
      </span>
      <h2 className="type-h2">{title}</h2>
      {explanation && <p className="max-w-2xl text-ink-2">{explanation}</p>}
      {action && <div className="mt-1">{action}</div>}
    </section>
  );
}
