import { QUOTE_STAGES } from "@/lib/outreach/pipeline";
import type { QuoteStatus } from "@/lib/types";

/** Sent → Quoted → Sample → Ordered, with the quote's current step highlighted. */
export function QuotePipeline({ status }: { status: QuoteStatus }) {
  const current = QUOTE_STAGES.findIndex((s) => s.key === status);
  return (
    <ol aria-label="Quote pipeline" className="grid grid-cols-4 gap-1">
      {QUOTE_STAGES.map((s, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={s.key} className="flex flex-col gap-1">
            <span aria-hidden className={`h-1 ${state === "done" ? "bg-ink" : state === "current" ? "bg-accent" : "bg-line"}`} />
            <span className={`eyebrow text-[10px] ${state === "current" ? "text-accent" : state === "done" ? "text-ink" : "text-muted"}`}>
              {s.label}
              {state === "current" && <span className="sr-only"> (current)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
