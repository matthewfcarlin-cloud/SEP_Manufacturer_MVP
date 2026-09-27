import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AiBudgetNote } from "@/components/AiBudgetNote";
import { PageHeader } from "@/components/PageHeader";
import { DraftPlanButton } from "@/components/plan/DraftPlanButton";
import { PlanBudget } from "@/components/plan/PlanBudget";
import { PlanTimeline } from "@/components/plan/PlanTimeline";
import { getAccessibleProject } from "@/lib/access";
import { nextDeadline, productionFacts, todayIso } from "@/lib/plan/schedule";
import { getShopById } from "@/lib/shops";
import { latestVersion } from "@/lib/versions";

export async function generateMetadata(props: PageProps<"/project/[id]/plan">): Promise<Metadata> {
  const { id } = await props.params;
  const project = (await getAccessibleProject(id))?.project;
  return { title: project ? `Plan · ${project.name}` : "Project not found" };
}

/** The Launch stage's plan: dated milestones, budget per step, today and launch markers. */
export default async function PlanPage(props: PageProps<"/project/[id]/plan">) {
  const { id } = await props.params;
  const project = (await getAccessibleProject(id))?.project;
  if (!project) notFound();
  const version = latestVersion(project);
  const plan = version.plan;
  const today = todayIso();
  const facts = productionFacts(version);
  const chosen = version.outreach?.quotes.find((q) => q.id === version.outreach?.chosenQuoteId);
  const next = plan ? nextDeadline(plan, today) : undefined;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader
        eyebrow={
          <>
            <span>Stage 5 · Launch</span>
            <span aria-hidden>·</span>
            <span>v{version.number} · {version.targetQuantity.toLocaleString("en-US")} units</span>
          </>
        }
        title="Plan"
        description="Every step from here to launch day, with dates and a budget. Production timing comes from your chosen quote, so choosing a different quote re-dates the plan."
      />

      {!version.analysis ? (
        <div className="flex flex-col items-start gap-3 border border-dashed border-line p-8">
          <p className="font-semibold">Analyze v{version.number} first</p>
          <Link href={`/project/${project.id}?v=${version.number}#analysis-heading`} className="bg-accent px-4 py-2 text-sm font-medium text-accent-ink">Go to the analysis</Link>
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3 border border-line bg-surface p-5">
            <p className="text-sm">
              {chosen ? (
                <>Production is dated from your chosen demo quote: <strong>{getShopById(chosen.shopId)?.name}</strong>, {chosen.leadTimeDays} days.</>
              ) : (
                <>No quote chosen yet, so production uses the analysis lead time ({facts.leadDays} days, est.). <Link href={`/project/${project.id}/make`} className="underline">Choose a quote</Link> to date it from a shop.</>
              )}
            </p>
            <DraftPlanButton projectId={project.id} version={version.number} hasPlan={Boolean(plan)} />
            <AiBudgetNote />
          </section>

          {plan ? (
            <>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  ["Launch", plan.launchDate],
                  ["Next deadline", next ? `${next.endDate} · ${next.title}` : "All done"],
                  ["Total budget, est.", `$${Math.round(plan.milestones.reduce((n, m) => n + m.budgetUsd.low, 0)).toLocaleString("en-US")}–$${Math.round(plan.milestones.reduce((n, m) => n + m.budgetUsd.high, 0)).toLocaleString("en-US")}`],
                  ["Dated from", plan.basedOn.kind === "quote" ? "Chosen quote" : "Analysis"],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-1 border-l border-line pl-3">
                    <dt className="eyebrow text-[10px] text-muted">{k}</dt>
                    <dd className="font-mono text-sm font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              <section aria-labelledby="timeline-heading" className="flex flex-col gap-4">
                <h2 id="timeline-heading" className="display-type text-[clamp(1.8rem,3.5vw,2.6rem)]">Timeline</h2>
                <PlanTimeline plan={plan} today={today} />
              </section>
              {plan.warnings.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {plan.warnings.map((w) => (
                    <li key={w} className="flex gap-2 border-l-4 border-accent bg-accent/10 px-4 py-2 text-sm">
                      <span aria-hidden className="font-bold text-accent">!</span>
                      {w}
                    </li>
                  ))}
                </ul>
              )}
              <section aria-labelledby="budget-heading" className="flex flex-col gap-4">
                <h2 id="budget-heading" className="display-type text-[clamp(1.8rem,3.5vw,2.6rem)]">Budget</h2>
                <PlanBudget plan={plan} />
                <p className="text-xs text-muted">Budgets are AI estimates; production is the chosen quote (a demo quote) or the analysis estimate.</p>
              </section>
            </>
          ) : (
            <p className="border border-dashed border-line p-6 text-sm text-muted">No plan yet. Draft one to see your milestones on a timeline.</p>
          )}
        </>
      )}
    </div>
  );
}
