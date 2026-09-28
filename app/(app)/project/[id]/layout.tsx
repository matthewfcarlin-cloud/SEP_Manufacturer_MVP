import { AskMokoPanel } from "@/components/agent/AskMokoPanel";
import { ProductStageNav } from "@/components/product/ProductStageNav";
import { getAccessibleProject } from "@/lib/access";
import { stageProgress } from "@/lib/studio/stage";
import { latestVersion } from "@/lib/versions";

/**
 * The product studio (design/DESIGN.md §4): the stage stepper on the left, the
 * chosen stage in the middle, Ask Moko docked on the right (collapsible to a
 * floating button). Living in the layout, the stepper can celebrate a stage
 * the moment it completes, and a conversation carries on between stages.
 */
export default async function ProductLayout({ children, params }: LayoutProps<"/project/[id]">) {
  const { id } = await params;
  const found = await getAccessibleProject(id);
  if (!found) return children; // the page itself answers 404
  const { project } = found;
  const latest = latestVersion(project);
  const { statuses } = stageProgress(project);

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <ProductStageNav projectId={project.id} productName={project.name} statuses={statuses} />
      <div className="min-w-0 flex-1">{children}</div>
      <AskMokoPanel
        projectId={project.id}
        projectName={project.name}
        version={latest.number}
        hasAnalysis={Boolean(latest.analysis)}
        hasTweaks={Boolean(latest.analysis?.paths[0]?.designTweaks.length)}
        hasQuotes={Boolean(latest.outreach?.quotes.length)}
      />
    </div>
  );
}
