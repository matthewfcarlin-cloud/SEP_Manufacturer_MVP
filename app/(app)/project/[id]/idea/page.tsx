import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ExpandableNotes } from "@/components/ExpandableNotes";
import { GeometryPanel } from "@/components/GeometryPanel";
import { AiInputsPanel } from "@/components/privacy/AiInputsPanel";
import { DangerZone } from "@/components/privacy/DangerZone";
import { LearningToggle } from "@/components/privacy/LearningToggle";
import { StageShell } from "@/components/product/StageShell";
import { VersionTimeline } from "@/components/versions/VersionTimeline";
import { getAccessibleProject } from "@/lib/access";
import { resolveAiInputs } from "@/lib/aiInputs";
import { buildProjectBrief } from "@/lib/analysis/prompt";
import { formatNumber, formatUsd } from "@/lib/format";
import { loadStage } from "@/lib/studio/loadStage";
import { stageHref } from "@/lib/studio/stageRoutes";
import type { ProjectVersion } from "@/lib/types";

export async function generateMetadata(props: PageProps<"/project/[id]/idea">): Promise<Metadata> {
  const { id } = await props.params;
  const project = (await getAccessibleProject(id))?.project;
  return { title: project ? `Idea · ${project.name}` : "Project not found" };
}

function Brief({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="type-small text-muted">{label}</dt>
      <dd className="text-[14px] text-ink">{children}</dd>
    </div>
  );
}

function RevisionNote({ version }: { version: ProjectVersion }) {
  if (!version.changeNote && !version.appliedTweak) return null;
  // The form pre-fills the note from the tweak; don't print the same text twice.
  const repeatsTweak = Boolean(version.appliedTweak && version.changeNote?.includes(version.appliedTweak.change));
  return (
    <section className="card card-pad text-[14px]">
      <h3 className="type-h3">What changed from version {version.basedOn}</h3>
      {version.changeNote && !repeatsTweak && <p className="mt-2 whitespace-pre-line">{version.changeNote}</p>}
      {version.appliedTweak && (
        <p className="mt-3 rounded-control bg-accent-soft px-3 py-2 text-ink-2">
          <span className="font-medium text-ink">Applied AI tweak: </span>
          {version.appliedTweak.change}
        </p>
      )}
    </section>
  );
}

/** The Idea stage: what you're making. The brief, files, measurements, versions, what the AI sees, and delete. */
export default async function IdeaPage(props: PageProps<"/project/[id]/idea">) {
  const { id } = await props.params;
  const { project, access, version } = await loadStage(id, (await props.searchParams).v);
  const aiInputs = resolveAiInputs(version);

  return (
    <StageShell project={project} version={version} access={access} screen="idea" path={stageHref(project.id, "idea")}>
      {access === "example" && (
        <p className="rounded-card bg-blue-soft px-4 py-3 text-[14px] text-ink-2">
          <span className="font-semibold text-ink">Shared example.</span> Anyone can open and try this demo project, and changes are visible to everyone.
          Your own projects are private to your browser.
        </p>
      )}
      <VersionTimeline project={project} selected={version.number} />
      <RevisionNote version={version} />
      <div className="grid gap-5 @3xl:grid-cols-2 [&>*]:min-w-0">
        <section className="card card-pad flex flex-col gap-4">
          <h2 className="type-h3">Brief</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Brief label="Target quantity">{formatNumber(version.targetQuantity, 0)} units</Brief>
            <Brief label="Budget">{version.budgetUsd !== undefined ? formatUsd(version.budgetUsd) : "Not set"}</Brief>
            <div className="col-span-2">
              <Brief label="Material ideas">{version.materialHints?.length ? version.materialHints.join(", ") : "None given"}</Brief>
            </div>
            {version.notes && (
              <div className="col-span-2">
                <Brief label="Notes">
                  <ExpandableNotes text={version.notes} />
                </Brief>
              </div>
            )}
          </dl>
        </section>
        {version.geometry && <GeometryPanel geometry={version.geometry} />}
      </div>
      {version.imageUrls.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="type-h3">Photos and sketches</h2>
          <div className="grid grid-cols-3 gap-3 @lg:grid-cols-5">
            {version.imageUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- served from our own API route
              <img key={url} src={url} alt={`${project.name} v${version.number}, reference photo ${i + 1}`} className="aspect-square w-full rounded-control object-cover" />
            ))}
          </div>
        </section>
      )}
      <AiInputsPanel
        projectId={project.id}
        version={version.number}
        inputs={aiInputs}
        briefText={buildProjectBrief(project, version, aiInputs.includePhotos ? version.imageUrls.length : 0)}
        photoUrls={version.imageUrls}
        isOpen={!version.analysis}
      />
      {access === "owner" && <LearningToggle projectId={project.id} learning={project.learning} />}
      {access === "owner" && <DangerZone projectId={project.id} projectName={project.name} version={version.number} versionCount={project.versions.length} />}
    </StageShell>
  );
}
