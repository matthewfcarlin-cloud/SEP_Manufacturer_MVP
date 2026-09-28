import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { nextStep } from "@/lib/studio/nextStep";
import { statusTone } from "@/lib/studio/statusLine";
import type { Project } from "@/lib/types";
import type { ProductSummary } from "./ProductCard";
import { StepBar } from "./StepBar";
import { StudioModel } from "./StudioModel";

/** The product to pick up again: its render in a 280px warm panel, then name, status, progress and the one next step. */
export function ContinueCard({ project, summary }: { project: Project; summary: ProductSummary }) {
  const step = nextStep(project);
  return (
    <section aria-label="Continue where you left off" className="card flex flex-col overflow-hidden p-3 sm:flex-row sm:items-stretch sm:gap-6">
      <div className="h-[200px] shrink-0 overflow-hidden rounded-card bg-sidebar sm:h-auto sm:min-h-[220px] sm:w-[280px]">
        <StudioModel url={summary.cadUrl} still={summary.still} name={summary.name} className="h-full min-h-[200px] w-full" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-3 p-3 sm:py-4 sm:pl-0 sm:pr-4">
        <p className="type-small text-muted">Continue where you left off</p>
        <h2 className="type-h2 [overflow-wrap:anywhere]">{summary.name}</h2>
        <StatusPill tone={statusTone(summary.status)}>{summary.status}</StatusPill>
        <StepBar statuses={summary.statuses} stageIndex={summary.stageIndex} className="w-full max-w-sm" />
        <ButtonLink href={step.href} iconRight={ArrowRight} className="mt-1">
          Next: {step.cta}
        </ButtonLink>
      </div>
    </section>
  );
}
