import type { Metadata } from "next";
import { BusinessCaseProvider } from "@/components/businessCase/BusinessCaseContext";
import { BusinessCasePanel } from "@/components/businessCase/BusinessCasePanel";
import { LiveMoneySummary } from "@/components/money/LiveMoneySummary";
import { PriceSlider } from "@/components/money/PriceSlider";
import { ProfitBars } from "@/components/money/ProfitBars";
import { StageShell } from "@/components/product/StageShell";
import { UnitCostSparkline } from "@/components/studio/UnitCostSparkline";
import { getAccessibleProject } from "@/lib/access";
import { loadStage } from "@/lib/studio/loadStage";
import { stageProgress } from "@/lib/studio/stage";
import { stageHref } from "@/lib/studio/stageRoutes";
import { unitCostTrend } from "@/lib/studio/summary";

export async function generateMetadata(props: PageProps<"/project/[id]/money">): Promise<Metadata> {
  const { id } = await props.params;
  const project = (await getAccessibleProject(id))?.project;
  return { title: project ? `Money · ${project.name}` : "Project not found" };
}

/**
 * The Money stage: a verdict that follows the price slider, and profit at 100,
 * 1,000 and 10,000 made. Every figure and the full table are in the details.
 */
export default async function MoneyPage(props: PageProps<"/project/[id]/money">) {
  const { id } = await props.params;
  const { project, access, version } = await loadStage(id, (await props.searchParams).v);
  const path = stageHref(project.id, "money");

  if (!version.analysis) {
    return (
      <StageShell project={project} version={version} access={access} screen="money" path={path}>
        <p className="text-ink-2">Price, profit and break-even appear here once Moko has worked out how it could be made.</p>
      </StageShell>
    );
  }

  const { statuses } = stageProgress(project);
  const next =
    statuses.make !== "done"
      ? { label: "Get quotes", href: stageHref(project.id, "make") }
      : statuses.launch !== "done"
        ? { label: "Plan your launch", href: stageHref(project.id, "launch") }
        : { label: "Get ready to sell", href: stageHref(project.id, "sell") };

  return (
    <BusinessCaseProvider
      key={`business-case-v${version.number}`}
      projectId={project.id}
      version={version.number}
      paths={version.analysis.paths}
      targetQuantity={version.targetQuantity}
      initial={version.businessCase}
    >
      <StageShell
        project={project}
        version={version}
        access={access}
        screen="money"
        path={path}
        summary={<LiveMoneySummary tweakHref={`/project/${project.id}/versions/new?from=${version.number}&tweak=0.0`} next={next} />}
        highlights={
          <div className="grid gap-5 @3xl:grid-cols-2">
            <PriceSlider />
            <ProfitBars />
          </div>
        }
      >
        <BusinessCasePanel />
        <section className="flex flex-col gap-2">
          <h2 className="type-h3">Cost of each across versions (est.)</h2>
          <UnitCostSparkline points={unitCostTrend(project)} />
        </section>
      </StageShell>
    </BusinessCaseProvider>
  );
}
