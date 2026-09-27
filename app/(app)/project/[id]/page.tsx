import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalysisResults } from "@/components/analysis/AnalysisResults";
import { RunAnalysisButton } from "@/components/analysis/RunAnalysisButton";
import { ExpandableNotes } from "@/components/ExpandableNotes";
import { GeometryPanel } from "@/components/GeometryPanel";
import { ProjectViewer } from "@/components/viewer/ProjectViewer";
import { formatDimensions, formatNumber, formatUnitCostRange, formatUsd } from "@/lib/format";
import { matchVersion } from "@/lib/match";
import { getAccessibleProject } from "@/lib/access";
import { ShopMatches } from "@/components/ShopMatches";
import { BusinessCasePanel } from "@/components/businessCase/BusinessCasePanel";
import { VersionTimeline } from "@/components/versions/VersionTimeline";
import { AiBudgetNote } from "@/components/AiBudgetNote";
import { AiInputsPanel } from "@/components/privacy/AiInputsPanel";
import { DangerZone } from "@/components/privacy/DangerZone";
import { LearningToggle } from "@/components/privacy/LearningToggle";
import { resolveAiInputs } from "@/lib/aiInputs";
import { buildProjectBrief } from "@/lib/analysis/prompt";
import type { ProjectVersion } from "@/lib/types";
import { getVersion, latestVersion, parseVersionParam } from "@/lib/versions";
import { ShowDetails } from "@/components/product/ShowDetails";
import { ProductSpotlight, type Callout } from "@/components/product/ProductSpotlight";
import { TabIntro } from "@/components/product/TabIntro";
import { UnitCostSparkline } from "@/components/studio/UnitCostSparkline";
import { PROCESS_LABELS } from "@/lib/processes";
import { moneyVerdict, tabSummary } from "@/lib/studio/plainSummary";
import { unitCostTrend } from "@/lib/studio/summary";

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

  const verdict = moneyVerdict(version);
  const best = version.analysis?.paths[0];
  const trend = unitCostTrend(project);
  const g = version.geometry;
  const inches = (mm: number) => (mm / 25.4).toFixed(1);
  const left: Callout[] = [
    {
      label: "Size",
      value: g ? formatDimensions(g.boundingBoxMm) : "Not measured",
      note: g ? `about ${inches(g.boundingBoxMm.x)} × ${inches(g.boundingBoxMm.y)} × ${inches(g.boundingBoxMm.z)} in` : undefined,
      href: "#details-part",
      cta: "Measurements",
    },
    {
      label: "Material",
      value: best?.materials[0] ?? version.materialHints?.[0] ?? "Not chosen yet",
      note: best && best.materials.length > 1 ? `or ${best.materials.slice(1, 3).join(", ")}` : undefined,
      href: best ? "#details-making" : "#details-part",
      cta: "Materials",
    },
  ];
  const right: Callout[] = best
    ? [
        { label: "Best way to make it", value: PROCESS_LABELS[best.process], note: `Fits ${best.fitScore}/100`, href: "#details-making", cta: "All the ways" },
        { label: `Cost each, ${version.targetQuantity.toLocaleString("en-US")} made`, value: formatUnitCostRange(best.unitCostUsd), note: "estimate", href: "#details-money", cta: "Price & profit" },
        { label: "Who can make it", value: `${Math.min(shopMatches.length, 5)} local shops`, note: "demo data", href: "#details-makers", cta: "See makers" },
      ]
    : [{ label: "How it's made", value: "Not looked at yet", note: "about 2 minutes", href: "#analysis-heading", cta: "Run the analysis" }];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12">
      <TabIntro
        eyebrow={
          <>
            <span>Design &amp; money</span>
            <span aria-hidden>·</span>
            <span>v{version.number} · {created}</span>
          </>
        }
        title="Design & money"
        lines={tabSummary(version, "design")}
      />

      {version.cadFileUrl && (
        <ProductSpotlight
          key={version.cadFileUrl}
          url={version.cadFileUrl}
          name={project.name}
          left={left}
          right={right}
        />
      )}

      {access === "example" && (
        <p className="border border-line bg-surface px-4 py-3 text-sm text-muted">
          <span className="font-semibold text-ink">Shared example.</span> Anyone can open and try this demo project, and changes are
          visible to everyone. Your own projects are private to your browser.
        </p>
      )}

      {version.analysis ? (
        <section aria-label="Does it make money?" className={`flex flex-col gap-3 border-l-4 bg-surface p-6 ${verdict?.tone === "bad" ? "border-accent" : verdict?.tone === "good" ? "border-idle" : "border-line"}`}>
          <p className="eyebrow text-[11px] text-muted">Does it make money?</p>
          <p className="text-2xl font-semibold leading-snug">{verdict?.text}</p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/project/${project.id}?v=${version.number}#business-case-heading`} className="border border-line px-4 py-2 text-sm font-medium hover:border-ink">
              {version.businessCase ? "Change the price" : "Set a price"}
            </Link>
            {verdict?.tone === "bad" && (
              <Link href={`/project/${project.id}/versions/new?from=${version.number}&tweak=0.0`} className="bg-ink px-4 py-2 text-sm font-medium text-bg hover:opacity-90">
                Try a design tweak
              </Link>
            )}
          </div>
        </section>
      ) : (
        <section aria-labelledby="analysis-heading" className="flex flex-col gap-4 border border-dashed border-line p-6">
          <h3 id="analysis-heading" className="font-semibold">See how it could be made</h3>
          <p className="max-w-2xl text-muted">
            An AI manufacturing engineer will read your part, photos, and notes, then suggest 2–4 ways to make it with estimated costs, how
            long each takes, and design tweaks, and which local shops can make it.
          </p>
          <AiBudgetNote />
          <RunAnalysisButton projectId={project.id} version={version.number} />
        </section>
      )}

      {version.analysis && best && (
        <ShowDetails
          id="details-making"
          title="How it could be made"
          teaser={`${version.analysis.paths.length} ways, best: ${PROCESS_LABELS[best.process]}, ${formatUnitCostRange(best.unitCostUsd)} each (est.)`}
        >
          <section aria-labelledby="analysis-heading" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 id="analysis-heading" className="display-type text-2xl">How it could be made</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/project/${project.id}/pitch`} className="bg-ink px-4 py-2 text-sm font-medium text-bg hover:opacity-90">Open pitch kit</Link>
                <RunAnalysisButton projectId={project.id} version={version.number} variant="secondary" />
              </div>
            </div>
            <AiBudgetNote />
            <AnalysisResults analysis={version.analysis} quantity={version.targetQuantity} topMatch={shopMatches[0]} tweakLink={{ projectId: project.id, version: version.number }} />
          </section>
        </ShowDetails>
      )}

      {version.analysis && (
        <ShowDetails id="details-money" title="Price, profit and break-even" teaser={version.businessCase ? `Retail ${formatUsd(version.businessCase.retailPriceUsd)} · exact figures at every run size` : "Pick a price, or ask the AI for one"}>
          <BusinessCasePanel
            key={`business-case-v${version.number}`}
            projectId={project.id}
            version={version.number}
            paths={version.analysis.paths}
            targetQuantity={version.targetQuantity}
            initial={version.businessCase}
          />
          <div className="flex flex-col gap-2 border-t border-line pt-6">
            <p className="eyebrow text-[11px] text-muted">Cost per unit across versions (est.)</p>
            <UnitCostSparkline points={trend} />
          </div>
        </ShowDetails>
      )}

      {version.analysis && (
        <ShowDetails id="details-makers" title="Who can make it" teaser={`${Math.min(shopMatches.length, 5)} local matches (demo data)`}>
          <ShopMatches matches={shopMatches} version={version} />
          <Link
            href={`/project/${project.id}/make`}
            className="group flex flex-wrap items-center justify-between gap-3 border border-line bg-surface p-5 hover:border-ink"
          >
            <span>
              <span className="eyebrow block text-[11px] text-accent">Stage 3 · Make</span>
              <span className="font-semibold">Send them a request, compare quotes, or find overseas suppliers</span>
            </span>
            <span className="eyebrow flex items-center gap-2 text-[11px]">
              Go to Make <span aria-hidden className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none">→</span>
            </span>
          </Link>
        </ShowDetails>
      )}

      <ShowDetails
        id="details-part"
        title="Your part: 3D model, measurements and brief"
        teaser={`${version.targetQuantity.toLocaleString("en-US")} units${version.geometry ? ` · ${formatDimensions(version.geometry.boundingBoxMm)}` : ""} · ${project.versions.length} version${project.versions.length === 1 ? "" : "s"}`}
        defaultOpen={!version.analysis}
      >
        <VersionTimeline project={project} selected={version.number} />
        <RevisionNote version={version} />
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
          {/* Photos sit under the viewer, so a long brief on the right doesn't leave a gap here. */}
          <div className="flex flex-col gap-6">
            {version.cadFileUrl ? (
              <ProjectViewer key={version.cadFileUrl} url={version.cadFileUrl} hasThinWalls={Boolean(version.geometry?.thinWallWarning)} className="aspect-[4/3] w-full" />
            ) : (
              <div className="grid aspect-[4/3] place-items-center border border-line text-sm text-muted">No CAD file uploaded.</div>
            )}
            {version.imageUrls.length > 0 && (
              <section className="flex flex-col gap-3">
                <h3 className="font-semibold">Photos and sketches</h3>
                <div className="grid grid-cols-3 gap-3">
                  {version.imageUrls.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element -- served from our own API route
                    <img key={url} src={url} alt={`${project.name} v${version.number}, reference photo ${i + 1}`} className="aspect-square w-full border border-line object-cover" />
                  ))}
                </div>
              </section>
            )}
          </div>
          <div className="flex flex-col gap-6">
            {version.geometry && <GeometryPanel geometry={version.geometry} />}
            <section className="border border-line bg-surface p-5">
              <h3 className="mb-4 font-semibold">Brief</h3>
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
          </div>
        </div>
        <AiInputsPanel
          projectId={project.id}
          version={version.number}
          inputs={aiInputs}
          briefText={buildProjectBrief(project, version, aiInputs.includePhotos ? version.imageUrls.length : 0)}
          photoUrls={version.imageUrls}
          isOpen={!version.analysis}
        />
      </ShowDetails>

      {access === "owner" && <LearningToggle projectId={project.id} learning={project.learning} />}
      {access === "owner" && (
        <DangerZone projectId={project.id} projectName={project.name} version={version.number} versionCount={project.versions.length} />
      )}
    </div>
  );
}
