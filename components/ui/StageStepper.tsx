"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import type { StageStatus } from "@/lib/studio/stage";
import type { Stage } from "@/lib/types";
import { cx } from "./classes";
import { useStageCelebration } from "./Celebration";

export type StepperStage = { key: Stage; label: string; status: StageStatus; href?: string };

const SPOKEN: Record<StageStatus, string> = { done: "done", current: "current stage", todo: "not started" };

function Circle({ status, number, isCelebrating }: { status: StageStatus; number: number; isCelebrating: boolean }) {
  if (status === "done") {
    return (
      <span className={cx("grid h-7 w-7 place-items-center rounded-pill bg-green text-white", isCelebrating && "motion-safe:animate-[stepper-done_480ms_cubic-bezier(.2,.8,.2,1)]")}>
        <Check aria-hidden size={16} strokeWidth={2.5} />
      </span>
    );
  }
  if (status === "current") {
    return (
      <span className="grid h-7 w-7 place-items-center rounded-pill bg-surface shadow-[0_0_0_2px_var(--accent)]">
        <span className="h-1.5 w-1.5 rounded-pill bg-accent motion-safe:animate-[stepper-pulse_1.6s_ease-in-out_infinite]" />
      </span>
    );
  }
  return <span className="grid h-7 w-7 place-items-center rounded-pill bg-border font-mono text-[13px] text-muted">{number}</span>;
}

/**
 * Stage stepper (§3), vertical: 28px circles joined by a 2px line (green once
 * done). When a stage becomes done while the page is open, its circle pops to
 * a check and the celebration runs (unless `celebrate` is false).
 */
export function StageStepper({ stages, selectedKey, celebrate = true, className }: { stages: readonly StepperStage[]; /** The stage shown on screen now. */ selectedKey?: Stage; celebrate?: boolean; className?: string }) {
  const statuses = Object.fromEntries(stages.map((s) => [s.key, s.status])) as Record<Stage, StageStatus>;
  const celebrating = useStageCelebration(statuses, celebrate);

  return (
    <ol aria-label="Stages" className={cx("flex flex-col", className)}>
      {stages.map((s, i) => {
        const isLast = i === stages.length - 1;
        const label = (
          <span className={cx("text-[15px]", s.status === "current" ? "font-semibold text-ink" : s.status === "done" ? "text-ink" : "text-ink-2")}>
            {s.label}
            <span className="sr-only"> ({SPOKEN[s.status]})</span>
          </span>
        );
        return (
          <li key={s.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Circle status={s.status} number={i + 1} isCelebrating={celebrating.includes(s.key)} />
              {!isLast && <span aria-hidden className={cx("my-1 min-h-4 w-0.5 flex-1 rounded-pill transition-colors", s.status === "done" ? "bg-green" : "bg-border")} />}
            </div>
            <div className={cx("flex min-w-0 flex-1 items-start", !isLast && "pb-2")}>
              {s.href ? (
                <Link
                  href={s.href}
                  aria-current={s.key === selectedKey ? "page" : undefined}
                  className={cx("-my-1.5 flex h-10 w-full items-center rounded-control px-2.5 transition-colors", s.key === selectedKey ? "bg-surface shadow-card" : "hover:bg-hover")}
                >
                  {label}
                </Link>
              ) : (
                <span className="pt-0.5">{label}</span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
