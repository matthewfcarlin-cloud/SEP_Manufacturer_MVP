import { BuildAgent } from "@/components/agent/BuildAgent";
import { ProductNav } from "@/components/product/ProductNav";
import { getAccessibleProject } from "@/lib/access";
import { starterQuestions } from "@/lib/agent/starters";
import { STAGES, stageProgress } from "@/lib/studio/stage";
import { latestVersion } from "@/lib/versions";

/**
 * Every product screen (overview, compare, new version, pitch…) shares the
 * agent panel. Living in the layout, a conversation carries on as the
 * creator moves between screens. It works on the latest version.
 */
export default async function ProductLayout({ children, params }: LayoutProps<"/project/[id]">) {
  const { id } = await params;
  const found = await getAccessibleProject(id);
  if (!found) return children; // the page itself answers 404
  const { project } = found;
  const { current } = stageProgress(project);

  return (
    <>
      <ProductNav projectId={project.id} projectName={project.name} />
      {children}
      <BuildAgent
        projectId={project.id}
        projectName={project.name}
        version={latestVersion(project).number}
        stageLabel={STAGES.find((s) => s.key === current)?.label ?? ""}
        starters={starterQuestions(project)}
      />
    </>
  );
}
