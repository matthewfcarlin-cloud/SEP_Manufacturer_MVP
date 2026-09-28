"use client";

import { Check, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cx } from "@/components/ui/classes";
import type { Guide } from "@/lib/studio/home";
import { ProgressRing } from "./ProgressRing";

/** "Your first product": a setup guide like Shopify's, five steps with a ring. Collapses once everything is done. */
export function GettingStarted({ guide }: { guide: Guide }) {
  const [isOpen, setIsOpen] = useState(!guide.isComplete);
  const { steps, doneCount, isComplete } = guide;

  return (
    <section aria-labelledby="getting-started-heading" className="card card-pad flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <ProgressRing done={doneCount} total={steps.length} />
        <div className="min-w-0 flex-1">
          <h2 id="getting-started-heading" className="type-h3">
            Your first product
          </h2>
          <p className="type-small text-ink-2">{isComplete ? "All set. Nice work." : `${doneCount} of ${steps.length} done`}</p>
        </div>
        {isComplete && (
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls="getting-started-steps"
            onClick={() => setIsOpen((o) => !o)}
            aria-label={isOpen ? "Hide steps" : "Show steps"}
            className="grid h-9 w-9 place-items-center rounded-control text-ink-2 transition-colors hover:bg-hover hover:text-ink"
          >
            <ChevronDown aria-hidden size={18} strokeWidth={1.75} className={cx("transition-transform", isOpen && "rotate-180")} />
          </button>
        )}
      </div>

      {isOpen && (
        <ol id="getting-started-steps" className="flex flex-col">
          {steps.map((step) => (
            <li key={step.key}>
              {step.isDone ? (
                <div className="flex h-11 items-center gap-3 px-1">
                  <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-pill bg-green text-white">
                    <Check size={13} strokeWidth={2.5} />
                  </span>
                  <span className="text-[15px] text-ink-2 line-through decoration-muted">{step.label}</span>
                  <span className="sr-only">(done)</span>
                </div>
              ) : (
                <Link href={step.href} className="group flex h-11 items-center gap-3 rounded-control px-1 transition-colors hover:bg-hover">
                  <span aria-hidden className="h-5 w-5 shrink-0 rounded-pill border-2 border-border" />
                  <span className="flex-1 text-[15px] font-medium text-ink">{step.label}</span>
                  <ChevronRight aria-hidden size={18} strokeWidth={1.75} className="text-muted transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
