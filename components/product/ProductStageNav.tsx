"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui/classes";
import { StageStepper } from "@/components/ui/StageStepper";
import { STAGES, type StageStatus } from "@/lib/studio/stage";
import { stageForPath, stageHref } from "@/lib/studio/stageRoutes";
import type { Stage } from "@/lib/types";

type Props = { projectId: string; productName: string; statuses: Record<Stage, StageStatus> };

/**
 * The product's six stages, in place of top tabs: a 220px vertical stepper on
 * the left (it also runs the stage-complete celebration), and a scrolling row
 * of stages on phones. Clicking a stage shows it in the main column.
 */
export function ProductStageNav({ projectId, productName, statuses }: Props) {
  const pathname = usePathname();
  const selected = stageForPath(pathname);
  const stages = STAGES.map((s) => ({ key: s.key, label: s.label, status: statuses[s.key], href: stageHref(projectId, s.key) }));

  return (
    <>
      <nav aria-label={`${productName} stages`} className="sticky top-0 hidden max-h-svh w-[220px] shrink-0 overflow-y-auto px-4 pt-10 md:block print:hidden">
        <p className="type-small mb-4 px-2.5 text-muted">Stages</p>
        <StageStepper stages={stages} selectedKey={selected} />
      </nav>

      <nav aria-label={`${productName} stages`} className="relative -mb-2 overflow-x-auto px-4 pt-6 md:hidden print:hidden">
        <ol className="flex gap-2">
          {stages.map((s) => {
            const isSelected = s.key === selected;
            return (
              <li key={s.key} className="shrink-0">
                <Link
                  href={s.href}
                  aria-current={isSelected ? "page" : undefined}
                  className={cx(
                    "flex h-9 items-center gap-1.5 rounded-pill px-3.5 text-[14px] font-medium transition-colors",
                    isSelected ? "bg-accent-soft text-accent-ink" : "bg-surface text-ink-2 shadow-card",
                  )}
                >
                  {s.status === "done" && <Check aria-hidden size={14} strokeWidth={2.5} className="text-green-ink" />}
                  {s.label}
                  {s.status === "current" && <span aria-hidden className="h-1.5 w-1.5 rounded-pill bg-accent" />}
                  <span className="sr-only"> ({s.status === "done" ? "done" : s.status === "current" ? "current stage" : "not started"})</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
