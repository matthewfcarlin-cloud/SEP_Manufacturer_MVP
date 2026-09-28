"use client";

import Link from "next/link";
import { cx } from "@/components/ui/classes";
import { progressPercent } from "@/components/ui/progress";
import { useAiUsage } from "./useAiUsage";

/** Low enough to nudge toward an own key: roughly one analysis left. */
const LOW_BUDGET_USD = 0.6;

/** The sidebar's usage card: what's left of the demo AI budget, and where to add your own key. Re-checks on each navigation. */
export function UsageCard({ limitUsd }: { limitUsd: number }) {
  const usage = useAiUsage();

  if (usage?.kind === "key") {
    return (
      <section aria-label="AI usage" className="card flex flex-col gap-1 p-3.5">
        <p className="type-small text-muted">AI key</p>
        <p className="flex items-center gap-2 text-[14px] font-medium text-ink">
          <span aria-hidden className="h-1.5 w-1.5 rounded-pill bg-green" />
          Using your own key
        </p>
        <Link href="/settings" className="text-[13px] font-semibold text-accent-ink hover:underline">
          Manage key
        </Link>
      </section>
    );
  }

  const remaining = usage?.remainingUsd;
  const isLow = remaining !== undefined && remaining < LOW_BUDGET_USD;
  return (
    <section aria-label="AI usage" className="card flex flex-col gap-2 p-3.5">
      <p className="type-small text-muted">Demo budget</p>
      <div className="h-1 overflow-hidden rounded-pill bg-border" role="progressbar" aria-label="Demo budget left" aria-valuemin={0} aria-valuemax={limitUsd} aria-valuenow={remaining ?? undefined}>
        <div className={cx("h-full rounded-pill transition-[width]", isLow ? "bg-amber" : "bg-accent")} style={{ width: `${remaining === undefined ? 0 : progressPercent(remaining, limitUsd)}%` }} />
      </div>
      <div className="flex items-center justify-between gap-2">
        {remaining === undefined ? (
          <span aria-hidden className="skeleton h-3 w-16" />
        ) : (
          <p className="text-[14px] font-medium text-ink">
            <span className="font-mono">${remaining.toFixed(2)}</span> left
          </p>
        )}
        <Link href="/settings" className="text-[13px] font-semibold text-accent-ink hover:underline">
          Add your key
        </Link>
      </div>
    </section>
  );
}
