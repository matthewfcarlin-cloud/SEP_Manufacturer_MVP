import { ArrowRight, FileText } from "lucide-react";
import type { Metadata } from "next";
import { AiBudgetNote } from "@/components/AiBudgetNote";
import { AnalysisResults } from "@/components/analysis/AnalysisResults";
import { RunAnalysisButton } from "@/components/analysis/RunAnalysisButton";
import { TweakCards } from "@/components/design/TweakCards";
import { StageShell } from "@/components/product/StageShell";
import { ShopMatches } from "@/components/ShopMatches";
import { ButtonLink } from "@/components/ui/Button";
import { getAccessibleProject } from "@/lib/access";
import { matchVersion } from "@/lib/match";
import { loadStage } from "@/lib/studio/loadStage";
import { stageHref } from "@/lib/studio/stageRoutes";

export async function generateMetadata(props: PageProps<"/project/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const project = (await getAccessibleProject(id))?.project;
  return { title: project?.name ?? "Project not found" };
}

/** The Design stage (the product's home screen): how it could be made, and who nearby can make it. */
export default async function DesignPage(props: PageProps<"/project/[id]">) {
  const { id } = await props.params;
  const { project, access, version } = await loadStage(id, (await props.searchParams).v);
  const shopMatches = matchVersion(version);

  return (
    <StageShell
      project={project}
      version={version}
      access={access}
      screen="design"
      path={stageHref(project.id, "design")}
      highlights={version.analysis && <TweakCards projectId={project.id} version={version.number} path={version.analysis.paths[0]} />}
    >
      {version.analysis ? (
        <>
          <section id="analysis-heading" aria-label="How it could be made" className="flex scroll-mt-20 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="type-h2">How it could be made</h2>
              <div className="flex flex-wrap items-center gap-2">
                <ButtonLink href={`/project/${project.id}/pitch`} variant="secondary" size="sm" icon={FileText}>
                  Open pitch kit
                </ButtonLink>
                <RunAnalysisButton projectId={project.id} version={version.number} variant="secondary" />
              </div>
            </div>
            <AiBudgetNote />
            <AnalysisResults analysis={version.analysis} quantity={version.targetQuantity} topMatch={shopMatches[0]} tweakLink={{ projectId: project.id, version: version.number }} />
          </section>
          <section aria-labelledby="makers-heading" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="makers-heading" className="type-h2">
                Who can make it
              </h2>
              <ButtonLink href={stageHref(project.id, "make")} variant="secondary" size="sm" iconRight={ArrowRight}>
                Go to Make
              </ButtonLink>
            </div>
            <ShopMatches matches={shopMatches} version={version} />
          </section>
        </>
      ) : (
        <section id="analysis-heading" className="flex scroll-mt-20 flex-col gap-3">
          <h2 className="type-h2">What the analysis gives you</h2>
          <p className="max-w-2xl text-ink-2">
            An AI manufacturing engineer reads your part, photos and notes, then suggests 2–4 ways to make it with estimated costs, how long each takes,
            design tweaks that make it cheaper, and which local shops can make it.
          </p>
          <AiBudgetNote />
        </section>
      )}
    </StageShell>
  );
}
