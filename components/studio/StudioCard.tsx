import Link from "next/link";
import { DemoBadge } from "@/components/Badges";
import { formatUnitCostRange } from "@/lib/format";
import { formatMarginRange } from "@/lib/businessCase";
import { nextStep } from "@/lib/studio/nextStep";
import { stageProgress, STAGES } from "@/lib/studio/stage";
import { keyNumbers, unitCostTrend } from "@/lib/studio/summary";
import type { Project } from "@/lib/types";
import { latestAnalyzedVersion, latestVersion } from "@/lib/versions";
import { StageRail } from "./StageRail";
import { StudioModel } from "./StudioModel";
import { UnitCostSparkline } from "./UnitCostSparkline";

function Figure({ label, value, muted = false, warn = false }: { label: string; value: string; muted?: boolean; warn?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-l border-line pl-3">
      <dt className="eyebrow truncate text-[10px] text-muted">{label}</dt>
      <dd className={`truncate font-mono text-sm tabular-nums ${muted ? "text-muted" : "font-semibold"} ${warn ? "text-accent" : ""}`}>{value}</dd>
    </div>
  );
}

/** One product in the studio: live model, journey stage, key numbers, cost trend and the next step. */
export function StudioCard({ project, isExample }: { project: Project; isExample: boolean }) {
  const version = latestVersion(project);
  const numbers = keyNumbers(version);
  const { current, statuses } = stageProgress(project);
  const step = nextStep(project);
  const still = (latestAnalyzedVersion(project) ?? version).renders?.[0];
  const stageLabel = STAGES.find((s) => s.key === current)?.label;

  return (
    <article className="flex w-full min-w-0 flex-col overflow-hidden border border-line bg-surface">
      <StudioModel url={version.cadFileUrl} still={still} name={project.name} />
      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow text-[11px] text-muted">
              v{version.number} · {version.targetQuantity.toLocaleString("en-US")} units · Stage: <span className="text-accent">{stageLabel}</span>
            </p>
            <h2 className="display-type mt-1.5 line-clamp-2 break-words text-3xl">
              <Link href={`/project/${project.id}`} className="hover:text-accent">
                {project.name}
              </Link>
            </h2>
          </div>
          {isExample && (
            <span className="shrink-0 whitespace-nowrap">
              <DemoBadge />
            </span>
          )}
        </div>

        <StageRail statuses={statuses} />

        <dl className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
          <Figure label="Cost, est." value={numbers.unitCost ? formatUnitCostRange(numbers.unitCost) : "Not analyzed"} muted={!numbers.unitCost} />
          <Figure label="Retail" value={numbers.retailUsd !== undefined ? `$${numbers.retailUsd.toLocaleString("en-US")}` : "Not set"} muted={numbers.retailUsd === undefined} />
          <Figure
            label={`Margin @ ${version.targetQuantity.toLocaleString("en-US")}, est.`}
            value={numbers.margin ? formatMarginRange(numbers.margin) : "—"}
            muted={!numbers.margin}
            warn={Boolean(numbers.margin && numbers.margin.mid < 0)}
          />
          <Figure label="Next deadline" value="No plan yet" muted />
        </dl>

        <UnitCostSparkline points={unitCostTrend(project)} />

        <Link href={step.href} className="group mt-auto flex flex-col gap-1 border-l-2 border-accent bg-bg px-4 py-3 transition-colors hover:bg-accent/5">
          <span className="eyebrow text-[10px] text-accent">Next step</span>
          <span className="font-semibold">{step.title}</span>
          <span className="line-clamp-2 text-sm text-muted">{step.detail}</span>
          <span className="eyebrow mt-1 flex items-center gap-1.5 text-[11px] text-ink">
            {step.cta} <span aria-hidden className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none">→</span>
          </span>
        </Link>
      </div>
    </article>
  );
}
