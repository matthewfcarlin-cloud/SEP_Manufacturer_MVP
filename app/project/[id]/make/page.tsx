import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuoteComparison } from "@/components/make/QuoteComparison";
import { QuoteRequestPanel, type MatchSummary } from "@/components/make/QuoteRequestPanel";
import { SpecSheetCard } from "@/components/make/SpecSheetCard";
import { PageHeader } from "@/components/PageHeader";
import { SourcingPanel } from "@/components/sourcing/SourcingPanel";
import { getAccessibleProject } from "@/lib/access";
import { matchVersion } from "@/lib/match";
import { buildSpecSheet } from "@/lib/outreach/specSheet";
import { getShopById } from "@/lib/shops";
import type { Process } from "@/lib/types";
import { latestVersion } from "@/lib/versions";

export async function generateMetadata(props: PageProps<"/project/[id]/make">): Promise<Metadata> {
  const { id } = await props.params;
  const project = (await getAccessibleProject(id))?.project;
  return { title: project ? `Make · ${project.name}` : "Project not found" };
}

/** The Make stage: quotes from matched local demo shops, and overseas sourcing on Alibaba. */
export default async function MakePage(props: PageProps<"/project/[id]/make">) {
  const { id } = await props.params;
  const project = (await getAccessibleProject(id))?.project;
  if (!project) notFound();
  const version = latestVersion(project);

  const header = (
    <PageHeader
      eyebrow={
        <>
          <span>Stage 3 · Make</span>
          <span aria-hidden>·</span>
          <span>v{version.number} · {version.targetQuantity.toLocaleString("en-US")} units</span>
        </>
      }
      title="Make"
      description="Get quotes from shops that can make this version, compare them, and choose one to plan around."
    />
  );

  if (!version.analysis) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
        {header}
        <div className="flex flex-col items-start gap-3 border border-dashed border-line p-8">
          <p className="font-semibold">Analyze v{version.number} first</p>
          <p className="max-w-lg text-sm text-muted">Quotes need to know how the part gets made and what it should cost. The analysis works that out in about 2 minutes.</p>
          <Link href={`/project/${project.id}?v=${version.number}#analysis-heading`} className="bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90">
            Go to the analysis
          </Link>
        </div>
      </div>
    );
  }

  const matches = matchVersion(version).slice(0, 5);
  const shops: MatchSummary[] = matches.map((m) => {
    const shop = getShopById(m.shopId);
    return {
      shopId: m.shopId,
      name: shop?.name ?? m.shopId,
      neighborhood: shop?.neighborhood ?? "",
      machine: m.matchedMachine.model,
      idle: m.idleBoost,
      idleHours: m.matchedMachine.idleHoursPerWeek,
    };
  });
  const process = version.analysis.paths[0].process;
  const now = new Date().toISOString();
  const sheets = { summary: buildSpecSheet(version, process, "summary", now), full: buildSpecSheet(version, process, "full", now) };
  const outreach = version.outreach;
  const shopNames = Object.fromEntries(
    (outreach?.quotes ?? []).map((q) => [q.shopId, { name: getShopById(q.shopId)?.name ?? q.shopId, neighborhood: getShopById(q.shopId)?.neighborhood ?? "" }]),
  );
  const estimates = Object.fromEntries(version.analysis.paths.map((p) => [p.process, p.unitCostUsd])) as Partial<Record<Process, { low: number; high: number }>>;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-14 px-4 py-12 sm:px-6 sm:py-16">
      {header}

      <div className="flex flex-col gap-2">
        <p className="eyebrow text-accent">Local shops · demo</p>
        {shops.length > 0 ? (
          <QuoteRequestPanel projectId={project.id} version={version.number} shops={shops} sheets={sheets} requestedAt={outreach?.requestedAt} />
        ) : (
          <p className="border border-dashed border-line p-6 text-sm text-muted">No local demo shop has a machine that fits this part yet.</p>
        )}
      </div>

      {outreach && outreach.quotes.length > 0 && (
        <>
          <QuoteComparison projectId={project.id} version={version.number} outreach={outreach} shops={shopNames} estimates={estimates} />
          <SpecSheetCard sheet={outreach.specSheet} title="Spec sheet as sent" />
        </>
      )}

      <div className="flex flex-col gap-2 border-t border-line pt-10">
        <p className="eyebrow text-accent">Overseas · Alibaba</p>
        <SourcingPanel key={`sourcing-v${version.number}`} projectId={project.id} version={version} />
      </div>
    </div>
  );
}
