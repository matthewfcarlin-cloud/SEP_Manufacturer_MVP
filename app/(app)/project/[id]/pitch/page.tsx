import type { Metadata } from "next";
import { PitchDocument } from "@/components/pitch/PitchDocument";
import { StageShell } from "@/components/product/StageShell";
import { loadStage } from "@/lib/studio/loadStage";
import { AiBudgetNote } from "@/components/AiBudgetNote";
import { PitchToolbar } from "@/components/pitch/PitchToolbar";
import { SharePanel } from "@/components/privacy/SharePanel";
import { buildIterationStory } from "@/lib/iterationStory";
import { matchVersion } from "@/lib/match";
import { getAccessibleProject } from "@/lib/access";
import { getShopById } from "@/lib/shops";
import type { Analysis, ProjectVersion } from "@/lib/types";
import { latestAnalyzedVersion } from "@/lib/versions";

export async function generateMetadata(props: PageProps<"/project/[id]/pitch">): Promise<Metadata> {
  const { id } = await props.params;
  const project = (await getAccessibleProject(id))?.project;
  return { title: project ? `${project.name} · Pitch` : "Pitch not found" };
}

const topShopName = (v: ProjectVersion) => {
  const top = matchVersion(v)[0];
  return top ? getShopById(top.shopId)?.name : undefined;
};

export default async function PitchPage(props: PageProps<"/project/[id]/pitch">) {
  const { id } = await props.params;
  const { project, access, version: latest } = await loadStage(id);
  // Pitch the newest analyzed version; the iteration story covers the rest.
  const version = latestAnalyzedVersion(project) ?? latest;
  const shell = (children: React.ReactNode) => (
    <StageShell project={project} version={version} access={access} screen="pitch" path={`/project/${project.id}/pitch`} isDetailsOpen={Boolean(version.analysis)}>
      {children}
    </StageShell>
  );

  if (!version.analysis) return shell(<p className="text-ink-2">The pitch is built from the analysis: how it gets made, what it costs, and the storyboard.</p>);

  const analyzed = version as ProjectVersion & { analysis: Analysis };
  const match = matchVersion(analyzed).find((m) => m.matchedMachine.type === analyzed.analysis.paths[0].process);
  const shop = match ? getShopById(match.shopId) : undefined;

  return shell(
    <>
      <div className="flex flex-col gap-4 print:hidden">
        <PitchToolbar
          projectId={project.id}
          projectName={project.name}
          version={analyzed.number}
          pitch={analyzed.pitch}
          cadFileUrl={analyzed.cadFileUrl}
          hasRenders={Boolean(analyzed.renders?.length)}
        />
        <AiBudgetNote />
        {access === "owner" ? (
          <SharePanel projectId={project.id} share={project.share} />
        ) : (
          <p className="text-[13px] text-ink-2">This is a shared example, already public. Share links are for your own projects.</p>
        )}
      </div>
      <PitchDocument
        project={project}
        version={analyzed}
        story={buildIterationStory(project, topShopName)}
        topMatch={match && shop ? { match, shop } : undefined}
        isOwnerView
      />
    </>,
  );
}
