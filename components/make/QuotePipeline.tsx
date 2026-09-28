import { Check } from "lucide-react";
import { cx } from "@/components/ui/classes";
import { QUOTE_STAGES } from "@/lib/outreach/pipeline";
import type { QuoteStatus } from "@/lib/types";

/** Sent → Quoted → Sample → Ordered as a small horizontal stepper, the quote's current step marked. */
export function QuotePipeline({ status }: { status: QuoteStatus }) {
  const current = QUOTE_STAGES.findIndex((s) => s.key === status);
  return (
    <ol aria-label="Quote pipeline" className="flex items-start">
      {QUOTE_STAGES.map((s, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        const isLast = i === QUOTE_STAGES.length - 1;
        return (
          <li key={s.key} className="flex flex-1 flex-col items-center gap-1 text-center">
            <div className="flex w-full items-center">
              <span aria-hidden className={cx("h-0.5 flex-1", i === 0 ? "bg-transparent" : i <= current ? "bg-green" : "bg-border")} />
              <span
                aria-hidden
                className={cx(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-pill",
                  state === "done" && "bg-green text-white",
                  state === "current" && "bg-surface shadow-[0_0_0_2px_var(--accent)]",
                  state === "todo" && "bg-border",
                )}
              >
                {state === "done" && <Check size={12} strokeWidth={3} />}
                {state === "current" && <span className="h-1.5 w-1.5 rounded-pill bg-accent" />}
              </span>
              <span aria-hidden className={cx("h-0.5 flex-1", isLast ? "bg-transparent" : i < current ? "bg-green" : "bg-border")} />
            </div>
            <span className={cx("text-[12px]", state === "current" ? "font-semibold text-ink" : "text-ink-2")}>
              {s.label}
              {state === "current" && <span className="sr-only"> (current)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
