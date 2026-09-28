import type { Metadata } from "next";
import Link from "next/link";
import { AiBudgetNote } from "@/components/AiBudgetNote";
import { DraftPlanButton } from "@/components/plan/DraftPlanButton";
import { PlanBudget } from "@/components/plan/PlanBudget";
import { LaunchTimeline } from "@/components/plan/LaunchTimeline";
import { getAccessibleProject } from "@/lib/access";
import { nextDeadline, productionFacts, todayIso } from "@/lib/plan/schedule";
import { getShopById } from "@/lib/shops";
import { AlertTriangle, FileText } from "lucide-react";
import { StageShell } from "@/components/product/StageShell";
import { ButtonLink } from "@/components/ui/Button";
import { loadStage } from "@/lib/studio/loadStage";
import { stageHref } from "@/lib/studio/stageRoutes";

export async function generateMetadata(props: PageProps<"/project/[id]/plan">): Promise<Metadata> {
  const { id } = await props.params;
  const project = (await getAccessibleProject(id))?.project;
  return { title: project ? `Plan · ${project.name}` : "Project not found" };
}

/** The Launch stage's plan: dated milestones, budget per step, today and launch markers. */
export default async function PlanPage(props: PageProps<"/project/[id]/plan">) {
  const { id } = await props.params;
  const { project, access, version } = await loadStage(id);
  const plan = version.plan;
  const today = todayIso();
  const facts = productionFacts(version);
  const chosen = version.outreach?.quotes.find((q) => q.id === version.outreach?.chosenQuoteId);
  const next = plan ? nextDeadline(plan, today) : undefined;

  return (
    <StageShell
      project={project}
      version={version}
      access={access}
      screen="launch"
      path={stageHref(project.id, "launch")}
      highlights={version.analysis && plan ? <LaunchTimeline plan={plan} today={today} /> : undefined}
    >
      {!version.analysis ? (
        <p className="text-ink-2">Your launch plan is dated from how version {version.number} gets made, so it appears here after the analysis.</p>
      ) : (
        <>
          <section className="card card-pad flex flex-col items-start gap-3">
            <p>
              {chosen ? (
                <>Production is dated from your chosen demo quote: <strong>{getShopById(chosen.shopId)?.name}</strong>, {chosen.leadTimeDays} days.</>
              ) : (
                <>No quote chosen yet, so production timing comes from the analysis ({facts.leadDays} days, est.). <Link href={`/project/${project.id}/make`} className="font-medium text-blue-ink hover:underline">Choose a quote</Link> to date it from a shop.</>
              )}
            </p>
            {plan && <DraftPlanButton projectId={project.id} version={version.number} hasPlan />}
            <AiBudgetNote />
          </section>

          {plan ? (
            <>
              <dl className="grid grid-cols-2 gap-5 @lg:grid-cols-4">
                {[
                  ["Launch", plan.launchDate],
                  ["Next up", next ? `${next.endDate} · ${next.title}` : "All done"],
                  ["Total budget, est.", `$${Math.round(plan.milestones.reduce((n, m) => n + m.budgetUsd.low, 0)).toLocaleString("en-US")}–$${Math.round(plan.milestones.reduce((n, m) => n + m.budgetUsd.high, 0)).toLocaleString("en-US")}`],
                  ["Dated from", plan.basedOn.kind === "quote" ? "Chosen quote" : "Analysis"],
                ].map(([k, v]) => (
                  <div key={k} className="card flex flex-col gap-1 p-4">
                    <dt className="type-small text-muted">{k}</dt>
                    <dd className="text-[15px] font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              {plan.warnings.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {plan.warnings.map((w) => (
                    <li key={w} className="flex gap-2.5 rounded-control bg-amber-soft px-4 py-2.5 text-[14px]">
                      <AlertTriangle aria-hidden size={18} strokeWidth={1.75} className="shrink-0 text-amber-ink" />
                      {w}
                    </li>
                  ))}
                </ul>
              )}
              <section aria-labelledby="budget-heading" className="flex flex-col gap-4">
                <h2 id="budget-heading" className="type-h2">Budget</h2>
                <PlanBudget plan={plan} />
                <p className="text-[13px] text-ink-2">Budgets are AI estimates; production is the chosen quote (a demo quote) or the analysis estimate.</p>
              </section>
            </>
          ) : (
            <p className="text-ink-2">No plan yet. Draft one above to see your milestones on a timeline.</p>
          )}
        </>
      )}
      <section className="card card-pad flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="type-h3">Pitch kit</h2>
          <p className="type-small text-ink-2">A pitch for a company that could make, license or stock it.</p>
        </div>
        <ButtonLink href={`/project/${project.id}/pitch`} variant="secondary" size="sm" icon={FileText}>
          Open the pitch kit
        </ButtonLink>
      </section>
    </StageShell>
  );
}
