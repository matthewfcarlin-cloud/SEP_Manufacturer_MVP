import { AskMokoPanel } from "@/components/agent/AskMokoPanel";
import { ProductHero } from "@/components/product/ProductHero";
import { ProductNav } from "@/components/product/ProductNav";
import { getAccessibleProject } from "@/lib/access";
import { STAGES, stageProgress } from "@/lib/studio/stage";
import { latestVersion } from "@/lib/versions";

/**
 * Every product screen shares the Ask Moko panel, docked on the right on wide
 * screens. Living in the layout, a conversation carries on as the creator
 * moves between screens. It works on the latest version.
 */
export default async function ProductLayout({ children, params }: LayoutProps<"/project/[id]">) {
  const { id } = await params;
  const found = await getAccessibleProject(id);
  if (!found) return children; // the page itself answers 404
  const { project, access } = found;
  const { current } = stageProgress(project);

  return (
    <div className="xl:flex">
      <div className="min-w-0 flex-1">
        <ProductHero project={project} isExample={access === "example"} />
        <ProductNav projectId={project.id} projectName={project.name} />
        {children}
      </div>
      <AskMokoPanel
        projectId={project.id}
        projectName={project.name}
        version={latestVersion(project).number}
        stageLabel={STAGES.find((s) => s.key === current)?.label ?? ""}
      />
    </div>
  );
}
