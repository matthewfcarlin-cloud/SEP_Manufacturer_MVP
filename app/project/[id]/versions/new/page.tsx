import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PROCESS_LABELS } from "@/lib/processes";
import { getProject } from "@/lib/projectStore";
import { listTweaks } from "@/lib/tweaks";
import { getVersion, latestVersion, nextVersionNumber, parseVersionParam } from "@/lib/versions";
import { NewVersionForm, type TweakChoice } from "./NewVersionForm";

export async function generateMetadata(props: PageProps<"/project/[id]/versions/new">): Promise<Metadata> {
  const { id } = await props.params;
  const project = await getProject(id);
  return { title: project ? `New version · ${project.name}` : "Project not found" };
}

export default async function NewVersionPage(props: PageProps<"/project/[id]/versions/new">) {
  const { id } = await props.params;
  const project = await getProject(id);
  if (!project) notFound();
  const { from, tweak } = await props.searchParams;
  const requested = parseVersionParam(from);
  const base = requested === null ? latestVersion(project) : getVersion(project, requested);
  if (!base) notFound();

  const tweaks: TweakChoice[] = listTweaks(base).map((o) => ({
    key: o.key,
    processLabel: PROCESS_LABELS[o.process],
    change: o.tweak.change,
    impact: o.tweak.impact,
  }));
  const preselected = typeof tweak === "string" && tweaks.some((t) => t.key === tweak) ? tweak : null;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader
        eyebrow={
          <>
            <Link href={`/project/${project.id}?v=${base.number}`} className="hover:text-ink">
              {project.name}
            </Link>
            <span aria-hidden>/</span>
            <span>
              v{base.number} → v{nextVersionNumber(project)}
            </span>
          </>
        }
        title="New version"
        description={`Upload the revised part. It gets its own measurements, analysis, and shop matches, and v${base.number} stays as it is so you can compare them.`}
      />
      <NewVersionForm
        projectId={project.id}
        base={{
          number: base.number,
          notes: base.notes,
          targetQuantity: base.targetQuantity,
          budgetUsd: base.budgetUsd,
          materialHints: base.materialHints ?? [],
          photoCount: base.imageUrls.length,
        }}
        tweaks={tweaks}
        preselectedTweak={preselected}
      />
    </div>
  );
}
