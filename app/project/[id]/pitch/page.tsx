import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PitchDocument } from "@/components/pitch/PitchDocument";
import { PitchToolbar } from "@/components/pitch/PitchToolbar";
import { buildIterationStory } from "@/lib/iterationStory";
import { matchVersion } from "@/lib/match";
import { getProject } from "@/lib/projectStore";
import { getShopById } from "@/lib/shops";
import type { Analysis, ProjectVersion } from "@/lib/types";
import { latestAnalyzedVersion } from "@/lib/versions";

export async function generateMetadata(props: PageProps<"/project/[id]/pitch">): Promise<Metadata> {
  const { id } = await props.params;
  const project = await getProject(id);
  return { title: project ? `${project.name} · Pitch` : "Pitch not found" };
}

const topShopName = (v: ProjectVersion) => {
  const top = matchVersion(v)[0];
  return top ? getShopById(top.shopId)?.name : undefined;
};

export default async function PitchPage(props: PageProps<"/project/[id]/pitch">) {
  const { id } = await props.params;
  const project = await getProject(id);
  if (!project) notFound();
  // Pitch the newest analyzed version; the iteration story covers the rest.
  const version = latestAnalyzedVersion(project);

  const back = (
    <Link href={`/project/${project.id}`} className="text-sm font-medium text-muted hover:text-ink print:hidden">
      ← Back to project
    </Link>
  );

  if (!version?.analysis) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        {back}
        <section className="rounded-2xl border border-line bg-surface p-8">
          <p className="eyebrow text-accent">Licensing pitch</p>
          <h1 className="display-type mt-2 text-4xl">{project.name}</h1>
          <p className="mt-3 max-w-xl text-muted">Run a manufacturing analysis first. The pitch is built from it: how it gets made, what it costs, and the storyboard.</p>
          <Link href={`/project/${project.id}`} className="mt-5 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
            View project analysis
          </Link>
        </section>
      </div>
    );
  }

  const analyzed = version as ProjectVersion & { analysis: Analysis };
  const match = matchVersion(analyzed).find((m) => m.matchedMachine.type === analyzed.analysis.paths[0].process);
  const shop = match ? getShopById(match.shopId) : undefined;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12 print:max-w-none print:px-0 print:py-0">
      <div className="flex flex-col gap-4 border-b border-line pb-6 print:hidden">
        {back}
        <PitchToolbar
          projectId={project.id}
          projectName={project.name}
          version={analyzed.number}
          pitch={analyzed.pitch}
          cadFileUrl={analyzed.cadFileUrl}
          hasRenders={Boolean(analyzed.renders?.length)}
        />
      </div>
      <PitchDocument
        project={project}
        version={analyzed}
        story={buildIterationStory(project, topShopName)}
        topMatch={match && shop ? { match, shop } : undefined}
        isOwnerView
      />
    </div>
  );
}
