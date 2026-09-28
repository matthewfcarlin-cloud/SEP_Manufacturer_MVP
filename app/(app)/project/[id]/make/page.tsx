import type { Metadata } from "next";
import { BomPanel } from "@/components/bom/BomPanel";
import { QuoteCards } from "@/components/make/QuoteCards";
import { QuoteNumbers } from "@/components/make/QuoteNumbers";
import { QuoteRequestPanel, type MatchSummary } from "@/components/make/QuoteRequestPanel";
import { SpecSheetCard } from "@/components/make/SpecSheetCard";
import { OrderPanel } from "@/components/orders/OrderPanel";
import { SourcingPanel } from "@/components/sourcing/SourcingPanel";
import { StageShell } from "@/components/product/StageShell";
import { loadStage } from "@/lib/studio/loadStage";
import { stageHref } from "@/lib/studio/stageRoutes";
import { getAccessibleProject } from "@/lib/access";
import { matchVersion } from "@/lib/match";
import { orderView } from "@/lib/orders/view";
import { buildSpecSheet } from "@/lib/outreach/specSheet";
import { getShopById } from "@/lib/shops";
import type { Process } from "@/lib/types";

export async function generateMetadata(props: PageProps<"/project/[id]/make">): Promise<Metadata> {
  const { id } = await props.params;
  const project = (await getAccessibleProject(id))?.project;
  return { title: project ? `Make · ${project.name}` : "Project not found" };
}

/** The Make stage: quotes from matched local demo shops, and overseas sourcing on Alibaba. */
export default async function MakePage(props: PageProps<"/project/[id]/make">) {
  const { id } = await props.params;
  const { project, access, version } = await loadStage(id);
  const shell = (children: React.ReactNode, highlights?: React.ReactNode) => (
    <StageShell project={project} version={version} access={access} screen="make" path={stageHref(project.id, "make")} highlights={highlights}>
      {children}
    </StageShell>
  );

  if (!version.analysis) return shell(<p className="text-ink-2">Quotes, suppliers and the order plan appear here once Moko has worked out how it could be made.</p>);

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

  return shell(
    <>
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-semibold text-accent-ink">Local shops (demo data)</p>
        {shops.length > 0 ? (
          <QuoteRequestPanel projectId={project.id} version={version.number} shops={shops} sheets={sheets} requestedAt={outreach?.requestedAt} />
        ) : (
          <p className="rounded-card bg-sidebar p-5 text-ink-2">No local demo shop has a machine that fits this part yet.</p>
        )}
      </div>

      {outreach && outreach.quotes.length > 0 && (
        <>
          <QuoteNumbers outreach={outreach} shops={shopNames} estimates={estimates} />
          <SpecSheetCard sheet={outreach.specSheet} title="Spec sheet as sent" />
        </>
      )}

      <div>
        <BomPanel
          key={`bom-v${version.number}`}
          projectId={project.id}
          projectName={project.name}
          version={version.number}
          targetQuantity={version.targetQuantity}
          processes={version.analysis.paths.map((p) => p.process)}
          initial={version.bom}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-semibold text-accent-ink">Overseas suppliers on Alibaba</p>
        <SourcingPanel key={`sourcing-v${version.number}`} projectId={project.id} version={version} />
      </div>

      <div>
        <OrderPanel key={`order-v${version.number}`} projectId={project.id} version={version.number} initial={orderView(version)} />
      </div>
    </>,
    outreach && outreach.quotes.length > 0 ? <QuoteCards projectId={project.id} version={version.number} outreach={outreach} shops={shopNames} /> : undefined,
  );
}
