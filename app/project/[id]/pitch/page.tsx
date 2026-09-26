import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoBadge, IdleBadge } from "@/components/Badges";
import { PitchHero } from "@/components/pitch/PitchHero";
import { PrintButton } from "@/components/pitch/PrintButton";
import { formatToolingRange, formatUnitCostRange, formatUsd } from "@/lib/format";
import { matchVersion } from "@/lib/match";
import { PROCESS_LABELS } from "@/lib/processes";
import { getShopById } from "@/lib/shops";
import { getProject } from "@/lib/projectStore";
import type { ManufacturingPath } from "@/lib/types";
import { latestAnalyzedVersion, latestVersion } from "@/lib/versions";

export async function generateMetadata(props: PageProps<"/project/[id]/pitch">): Promise<Metadata> {
  const { id } = await props.params;
  const project = await getProject(id);
  return { title: project ? `${project.name} · Pitch kit` : "Pitch kit not found" };
}

function CostCard({ path, quantity }: { path: ManufacturingPath; quantity: number }) {
  const runLow = path.unitCostUsd.low * quantity + path.toolingCostUsd.low;
  const runHigh = path.unitCostUsd.high * quantity + path.toolingCostUsd.high;
  return (
    <section aria-labelledby="cost-heading" className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-accent">At a glance</p>
          <h2 id="cost-heading" className="display-type mt-2 text-[clamp(1.8rem,3.5vw,2.75rem)]">The cost picture</h2>
        </div>
        <p className="text-sm text-muted">Estimate for {quantity.toLocaleString("en-US")} units</p>
      </div>
      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-bg p-4">
          <dt className="text-sm text-muted">Per unit</dt>
          <dd className="mt-2 font-mono text-xl font-semibold">{formatUnitCostRange(path.unitCostUsd)}</dd>
          <p className="mt-1 text-xs text-muted">Estimated manufacturing cost</p>
        </div>
        <div className="rounded-xl bg-bg p-4">
          <dt className="text-sm text-muted">One-time tooling</dt>
          <dd className="mt-2 font-mono text-xl font-semibold">{formatToolingRange(path.toolingCostUsd)}</dd>
          <p className="mt-1 text-xs text-muted">Setup and tooling estimate</p>
        </div>
        <div className="rounded-xl bg-ink p-4 text-bg">
          <dt className="text-sm text-bg/70">Parts + tooling</dt>
          <dd className="mt-2 font-mono text-xl font-semibold">{formatUsd(runLow)}–{formatUsd(runHigh)}</dd>
          <p className="mt-1 text-xs text-bg/70">At the target quantity</p>
        </div>
      </dl>
      <p className="mt-4 text-xs text-muted">Planning estimates only; finishing, shipping, and taxes may be additional.</p>
    </section>
  );
}

export default async function PitchPage(props: PageProps<"/project/[id]/pitch">) {
  const { id } = await props.params;
  const project = await getProject(id);
  if (!project) notFound();
  // Pitch the newest version that has been analyzed.
  const version = latestAnalyzedVersion(project) ?? latestVersion(project);

  const topPath = version.analysis?.paths.reduce<ManufacturingPath | undefined>(
    (best, path) => !best || path.fitScore > best.fitScore ? path : best,
    undefined,
  );
  const matches = matchVersion(version);
  const topMatch = topPath && matches.find((match) => match.matchedMachine.type === topPath.process);
  const matchedShop = topMatch ? getShopById(topMatch.shopId) : undefined;

  return (
    <article className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12 print:max-w-none print:gap-7 print:px-0 print:py-0">
      <header className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link href={`/project/${project.id}`} className="text-sm font-medium text-muted hover:text-ink">← Back to project</Link>
        <PrintButton />
      </header>

      {!version.analysis ? (
        <section className="rounded-2xl border border-line bg-surface p-8">
          <p className="eyebrow text-accent">Pitch kit</p>
          <h1 className="display-type mt-2 text-4xl">{project.name}</h1>
          <p className="mt-3 max-w-xl text-muted">Run a manufacturing analysis first to build the recommended process, estimate, shop match, and storyboard for this pitch kit.</p>
          <Link href={`/project/${project.id}`} className="mt-5 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">View project analysis</Link>
        </section>
      ) : (
        <>
          <section className="grid gap-8 border-b border-line pb-9 md:grid-cols-[1.1fr_0.9fr] md:items-end print:grid-cols-2">
            <div>
              <p className="eyebrow text-accent">Product pitch · {version.targetQuantity.toLocaleString("en-US")} unit run</p>
              <h1 className="display-type mt-4 max-w-3xl text-[clamp(2.8rem,7vw,6rem)]">{project.name}</h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{version.analysis.productSummary}</p>
            </div>
            <div className="rounded-2xl bg-ink p-6 text-bg sm:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-bg/60">The opportunity</p>
              <p className="mt-3 text-xl font-medium leading-relaxed">{version.analysis.topRecommendation}</p>
            </div>
          </section>

          <PitchHero projectName={project.name} cadFileUrl={version.cadFileUrl} />

          {topPath && (
            <section aria-labelledby="manufacturing-heading" className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
                <p className="eyebrow text-accent">How it gets made</p>
                <h2 id="manufacturing-heading" className="display-type mt-2 text-3xl">{PROCESS_LABELS[topPath.process]}</h2>
                <p className="mt-2 text-sm text-muted">Recommended process · {topPath.fitScore}/100 fit</p>
                <p className="mt-5 text-sm leading-relaxed">{topPath.pros[0] ?? topPath.materials.join(", ")}</p>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
                {matchedShop && topMatch ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2"><p className="eyebrow text-accent">Local shop match</p>{topMatch.idleBoost && <IdleBadge hoursPerWeek={topMatch.matchedMachine.idleHoursPerWeek} />}</div>
                    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
                      <h3 className="text-2xl font-semibold tracking-tight">{matchedShop.name}</h3>
                      <DemoBadge />
                    </div>
                    <p className="mt-1 text-sm text-muted">{matchedShop.neighborhood} · {topMatch.matchedMachine.model}</p>
                    <p className="mt-4 text-sm leading-relaxed">{topMatch.reasons.join(" ")}</p>
                    {topMatch.requiredTweaks[0] && <p className="mt-4 border-l-2 border-accent pl-3 text-sm"><span className="font-semibold">Design for the quote: </span>{topMatch.requiredTweaks[0]}</p>}
                  </>
                ) : (
                  <>
                    <p className="eyebrow text-accent">Local shop match</p>
                    <h3 className="display-type mt-2 text-3xl">No direct shop match yet</h3>
                    <p className="mt-3 text-sm text-muted">The recommended process is shown above. Review other manufacturing paths for currently available local machine matches.</p>
                  </>
                )}
              </div>
            </section>
          )}

          {topPath && <CostCard path={topPath} quantity={version.targetQuantity} />}

          <section aria-labelledby="storyboard-heading" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow text-accent">A 30-second spot</p>
                <h2 id="storyboard-heading" className="display-type mt-2 text-[clamp(1.8rem,3.5vw,2.75rem)]">The story in six frames</h2>
              </div>
              <p className="text-sm text-muted">A first pass for the product conversation</p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
              {version.analysis.storyboard.map((shot) => (
                <li key={shot.shot} className="flex min-h-48 flex-col justify-between rounded-xl border border-line bg-surface p-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-accent">Frame {String(shot.shot).padStart(2, "0")} <span className="text-muted">· {shot.seconds}s</span></p>
                    <p className="mt-4 text-sm leading-relaxed">{shot.visual}</p>
                  </div>
                  <p className="mt-5 border-t border-line pt-3 text-sm italic text-muted">“{shot.voiceover}”</p>
                </li>
              ))}
            </ol>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-xs text-muted">
            <span>{project.name} · Idlefit pitch kit</span>
            <span>Shop listings and costs are fictional demo estimates.</span>
          </footer>
        </>
      )}
    </article>
  );
}
