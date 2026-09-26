import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalysisResults } from "@/components/analysis/AnalysisResults";
import { RunAnalysisButton } from "@/components/analysis/RunAnalysisButton";
import { GeometryPanel } from "@/components/GeometryPanel";
import { PageHeader } from "@/components/PageHeader";
import { ProjectViewer } from "@/components/viewer/ProjectViewer";
import { formatNumber, formatUsd } from "@/lib/format";
import { matchVersion } from "@/lib/match";
import { getAccessibleProject } from "@/lib/access";
import { ShopMatches } from "@/components/ShopMatches";
import { BusinessCasePanel } from "@/components/businessCase/BusinessCasePanel";
import { VersionTimeline } from "@/components/versions/VersionTimeline";
import { AiBudgetNote } from "@/components/AiBudgetNote";
import { AiInputsPanel } from "@/components/privacy/AiInputsPanel";
import { DangerZone } from "@/components/privacy/DangerZone";
import { resolveAiInputs } from "@/lib/aiInputs";
import { buildProjectBrief } from "@/lib/analysis/prompt";
import type { ProjectVersion } from "@/lib/types";
import { getVersion, latestVersion, parseVersionParam } from "@/lib/versions";

export async function generateMetadata(props: PageProps<"/project/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const project = (await getAccessibleProject(id))?.project;
  return { title: project?.name ?? "Project not found" };
}

function Brief({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function RevisionNote({ version }: { version: ProjectVersion }) {
  if (!version.changeNote && !version.appliedTweak) return null;
  // The form pre-fills the note from the tweak; don't print the same text twice.
  const repeatsTweak = Boolean(version.appliedTweak && version.changeNote?.includes(version.appliedTweak.change));
  return (
    <section className="rounded-xl border border-line bg-surface p-5 text-sm">
      <p className="eyebrow text-muted">What changed from v{version.basedOn}</p>
      {version.changeNote && !repeatsTweak && <p className="mt-2 whitespace-pre-line">{version.changeNote}</p>}
      {version.appliedTweak && (
        <p className="mt-2 border-l-2 border-accent pl-3 text-muted">
          <span className="font-medium text-ink">Applied AI tweak: </span>
          {version.appliedTweak.change}
        </p>
      )}
    </section>
  );
}

export default async function ProjectPage(props: PageProps<"/project/[id]">) {
  const { id } = await props.params;
  const found = await getAccessibleProject(id);
  if (!found) notFound();
  const { project, access } = found;
  const { v } = await props.searchParams;
  const requested = parseVersionParam(v);
  const version = requested === null ? latestVersion(project) : getVersion(project, requested);
  if (!version) notFound();
  const shopMatches = matchVersion(version);
  const aiInputs = resolveAiInputs(version);

  const created = new Date(version.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader
        eyebrow={
          <>
            <Link href="/projects" className="hover:text-ink">Projects</Link>
            <span aria-hidden>/</span>
            <span>v{version.number} · {created}</span>
            <span aria-hidden>·</span>
            <span>{version.targetQuantity.toLocaleString("en-US")} units</span>
          </>
        }
        title={project.name}
      />

      {access === "example" && (
        <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
          <span className="font-semibold text-ink">Shared example.</span> Anyone can open and try this demo project, and changes are
          visible to everyone. Your own projects are private to your browser.
        </p>
      )}

      <VersionTimeline project={project} selected={version.number} />
      <RevisionNote version={version} />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        {version.cadFileUrl ? (
          <ProjectViewer
            key={version.cadFileUrl}
            url={version.cadFileUrl}
            hasThinWalls={Boolean(version.geometry?.thinWallWarning)}
            className="aspect-[4/3] w-full"
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center rounded-xl border border-line text-sm text-muted">
            No CAD file uploaded.
          </div>
        )}
        <div className="flex flex-col gap-6">
          {version.geometry && <GeometryPanel geometry={version.geometry} />}
          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-4 font-semibold">Brief</h2>
            <dl className="grid grid-cols-2 gap-4">
              <Brief label="Target quantity">{formatNumber(version.targetQuantity, 0)} units</Brief>
              <Brief label="Budget">
                {version.budgetUsd !== undefined ? formatUsd(version.budgetUsd) : "Not set"}
              </Brief>
              <div className="col-span-2">
                <Brief label="Material ideas">
                  {version.materialHints?.length ? version.materialHints.join(", ") : "None given"}
                </Brief>
              </div>
              {version.notes && (
                <div className="col-span-2">
                  <Brief label="Notes">
                    <span className="whitespace-pre-line">{version.notes}</span>
                  </Brief>
                </div>
              )}
            </dl>
          </section>
        </div>
      </div>

      {version.imageUrls.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Photos and sketches</h2>
          <div className="flex flex-wrap gap-3">
            {version.imageUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- served from our own API route
              <img
                key={url}
                src={url}
                alt={`${project.name} v${version.number}, reference photo ${i + 1}`}
                className="h-40 w-40 rounded-lg border border-line object-cover"
              />
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

      <section aria-labelledby="analysis-heading" className="flex flex-col gap-4 border-t border-line pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="analysis-heading" className="display-type text-[clamp(2rem,4vw,3.25rem)]">
            How it could be made
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {version.analysis && <Link href={`/project/${project.id}/pitch`} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-bg hover:opacity-90">Open pitch kit</Link>}
            {version.analysis && <RunAnalysisButton projectId={project.id} version={version.number} variant="secondary" />}
          </div>
        </div>
        {version.analysis ? (
          <AnalysisResults
            analysis={version.analysis}
            quantity={version.targetQuantity}
            topMatch={shopMatches[0]}
            tweakLink={{ projectId: project.id, version: version.number }}
          />
        ) : (
          <div className="flex flex-col gap-4 rounded-xl border border-dashed border-line p-6">
            <p className="max-w-2xl text-muted">
              An AI manufacturing engineer will read your part, photos, and notes, then suggest 2–4
              ways to make it with estimated costs, lead times, and design tweaks, favoring machines
              that are idle at local shops this month.
            </p>
            <RunAnalysisButton projectId={project.id} version={version.number} />
            <AiBudgetNote />
          </div>
        )}
      </section>
      {version.analysis && (
        <BusinessCasePanel
          key={version.number}
          projectId={project.id}
          version={version.number}
          paths={version.analysis.paths}
          targetQuantity={version.targetQuantity}
          initial={version.businessCase}
        />
      )}
      {version.analysis && <ShopMatches matches={shopMatches} version={version} />}
      {access === "owner" && (
        <DangerZone projectId={project.id} projectName={project.name} version={version.number} versionCount={project.versions.length} />
      )}
    </div>
  );
}
