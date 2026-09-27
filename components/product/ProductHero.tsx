import Link from "next/link";
import { DemoBadge } from "@/components/Badges";
import { StudioModel } from "@/components/studio/StudioModel";
import { nextStep } from "@/lib/studio/nextStep";
import { stageProgress, STAGES } from "@/lib/studio/stage";
import type { Project } from "@/lib/types";
import { latestAnalyzedVersion, latestVersion } from "@/lib/versions";

/** The top of every product page: the name, its spinning model, and one big Next step with a single button. */
export function ProductHero({ project, isExample }: { project: Project; isExample: boolean }) {
  const version = latestVersion(project);
  const step = nextStep(project);
  const { current, statuses } = stageProgress(project);
  const stageIndex = STAGES.findIndex((s) => s.key === current);
  const still = (latestAnalyzedVersion(project) ?? version).renders?.[0];

  return (
    <section aria-label="Product" className="@container border-b border-line print:hidden">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 @2xl:grid-cols-[12rem_minmax(0,1fr)] @2xl:items-center @5xl:grid-cols-[14rem_minmax(0,1fr)_24rem]">
        <div className="hidden overflow-hidden border border-line @2xl:block">
          <StudioModel url={version.cadFileUrl} still={still} name={project.name} />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <p className="eyebrow flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span>
              Stage {stageIndex + 1} of 6 · <span className="text-accent">{STAGES[stageIndex].label}</span>
            </span>
            <span aria-hidden>·</span>
            <span>
              v{version.number} · {version.targetQuantity.toLocaleString("en-US")} units
            </span>
            {isExample && <DemoBadge label="Example" title="A shared demo product anyone can open" />}
          </p>
          <h1 className="display-type text-[clamp(2.25rem,5vw,4rem)] leading-[0.9] [overflow-wrap:anywhere]">{project.name}</h1>
          <ol aria-label={`Stage ${stageIndex + 1} of 6: ${STAGES[stageIndex].label}`} className="flex gap-1.5">
            {STAGES.map((s) => (
              <li key={s.key} title={s.label} className={`h-2 w-2 ${statuses[s.key] === "done" ? "bg-ink" : statuses[s.key] === "current" ? "bg-accent" : "bg-line"}`} />
            ))}
          </ol>
        </div>
        <div className="flex flex-col gap-3 border-l-4 border-accent bg-surface p-5 @2xl:col-span-2 @5xl:col-span-1">
          <p className="eyebrow text-[11px] text-accent">Next step</p>
          <p className="text-xl font-semibold leading-snug">{step.title}</p>
          <p className="text-sm text-muted">{step.detail}</p>
          <Link href={step.href} className="group mt-1 inline-flex items-center justify-between gap-4 self-start bg-ink px-5 py-3 font-medium text-bg hover:opacity-90">
            {step.cta}
            <span aria-hidden className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
