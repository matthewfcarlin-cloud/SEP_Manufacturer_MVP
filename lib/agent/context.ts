import { notesForAi } from "../aiInputs";
import { buildBusinessCase, formatMarginRange } from "../businessCase";
import { cheapestByVolume, effectiveCostCurve, type CostCurve } from "../costCurve";
import { formatDaysRange, formatDimensions, formatNumber, formatToolingRange, formatUnitCostRange } from "../format";
import { buildIterationStory } from "../iterationStory";
import { matchVersion } from "../match";
import { PROCESS_LABELS } from "../processes";
import { getShopById } from "../shops";
import { nextStep } from "../studio/nextStep";
import { STAGES, stageProgress } from "../studio/stage";
import type { Project, ProjectVersion } from "../types";

// Everything the build agent knows about the product, as plain text for the
// system prompt. Built only from what the app already shows the owner, and
// through notesForAi(), so notes the inventor withheld stay withheld.

function geometryLines(version: ProjectVersion): string[] {
  const g = version.geometry;
  if (!g) return ["Geometry: not measured."];
  return [
    `Geometry (measured, mm): ${formatDimensions(g.boundingBoxMm)}, volume ${formatNumber(g.volumeCm3)} cm³` +
      (g.typicalWallMm !== undefined ? `, typical wall ${formatNumber(g.typicalWallMm)} mm` : "") +
      `, ${g.isWatertight ? "watertight" : "mesh has gaps"}${g.thinWallWarning ? ", some walls under 1 mm" : ""}.`,
  ];
}

function analysisLines(version: ProjectVersion): string[] {
  const a = version.analysis;
  if (!a) return ["Manufacturing analysis: Not analyzed yet."];
  const lines = [
    "Manufacturing analysis (AI estimates, USD, at the target quantity unless noted):",
    `Summary: ${a.productSummary}`,
    `Recommendation: ${a.topRecommendation}`,
    ...a.paths.flatMap((p, i) => [
      `${i + 1}. ${PROCESS_LABELS[p.process]} (${p.fitScore}/100 fit): ${formatUnitCostRange(p.unitCostUsd)} per unit, tooling ${formatToolingRange(p.toolingCostUsd)}, lead time ${formatDaysRange(p.leadTimeDays)}, materials ${p.materials.join(", ")}.`,
      ...p.designTweaks.map((t) => `   Tweak: ${t.change} (${t.impact})`),
    ]),
    `Risks: ${a.risks.join(" ")}`,
  ];
  const curves = a.paths.map(effectiveCostCurve).filter((c): c is CostCurve => c !== null);
  const byVolume = curves.length === a.paths.length ? cheapestByVolume(curves) : null;
  if (byVolume) lines.push(`Cost by volume: ${byVolume}`);
  return lines;
}

function businessCaseLines(version: ProjectVersion): string[] {
  if (!version.analysis || !version.businessCase) return ["Business case: not set up yet."];
  const inputs = version.businessCase;
  const bc = buildBusinessCase(version.analysis.paths, inputs);
  return [
    `Business case (estimate): $${inputs.retailPriceUsd} retail, maker receives ${Math.round(inputs.revenueShare * 100)}% (~$${bc.revenuePerUnit.toFixed(2)}/unit). ${bc.verdict.headline} ${bc.verdict.detail ?? ""}`.trim(),
    ...bc.tiers.map(
      (t) => `   ${t.quantity.toLocaleString("en-US")} units: ${PROCESS_LABELS[t.process]}, ${formatUnitCostRange(t.allIn)} all-in per part, margin ${formatMarginRange(t.margin)}.`,
    ),
  ];
}

function shopLines(version: ProjectVersion): string[] {
  const matches = matchVersion(version);
  if (matches.length === 0) return ["Shop matches: none yet."];
  return [
    "Shop matches (fictional demo shops; nothing has been sent to them):",
    ...matches.map((m) => {
      const shop = getShopById(m.shopId);
      return `- ${shop?.name ?? m.shopId} (${shop?.neighborhood ?? ""}): ${m.matchedMachine.model}, ${PROCESS_LABELS[m.matchedMachine.type]}, match ${m.score}/100${m.idleBoost ? ", machine idle this month" : ""}.`;
    }),
  ];
}

function quoteLines(version: ProjectVersion): string[] {
  const lines: string[] = [];
  const outreach = version.outreach;
  if (outreach?.quotes.length) {
    lines.push(`Demo quotes (simulated by the app from fictional demo shops, for ${version.targetQuantity.toLocaleString("en-US")} units; share level: ${outreach.specSheet.shareLevel}):`);
    for (const q of outreach.quotes) {
      const shop = getShopById(q.shopId)?.name ?? q.shopId;
      const chosen = q.id === outreach.chosenQuoteId ? " CHOSEN" : "";
      lines.push(`- ${shop}: ${PROCESS_LABELS[q.process]}, $${q.unitPriceUsd.toFixed(2)}/unit + $${q.toolingUsd.toLocaleString("en-US")} tooling, ${q.leadTimeDays} days, MOQ ${q.moq}, status ${q.status}.${chosen}`);
    }
  } else {
    lines.push("Demo quotes: none requested yet.");
  }
  const suppliers = version.sourcing?.suppliers ?? [];
  if (suppliers.length) {
    lines.push("Alibaba shortlist (entered by the creator; the app never contacts suppliers):");
    for (const s of suppliers) {
      const terms = s.quote ? ` Terms: ${[s.quote.unitUsd && `$${s.quote.unitUsd}/unit`, s.quote.moq && `MOQ ${s.quote.moq}`, s.quote.leadDays && `${s.quote.leadDays} days`].filter(Boolean).join(", ")}.` : "";
      lines.push(`- ${s.name}: ${s.status}.${terms}`);
    }
  }
  return lines;
}

function planLines(version: ProjectVersion): string[] {
  const plan = version.plan;
  if (!plan) return ["Launch plan: none yet."];
  const basis = plan.basedOn.kind === "quote" ? "the chosen demo quote" : "the analysis lead time";
  return [
    `Launch plan (production dated from ${basis}; budgets are estimates): launch ${plan.launchDate}.`,
    ...plan.milestones.map((m) => `- ${m.title} (${m.key}): ${m.startDate} → ${m.endDate}, $${m.budgetUsd.low.toLocaleString("en-US")}–$${m.budgetUsd.high.toLocaleString("en-US")}.`),
    ...plan.warnings.map((w) => `Warning: ${w}`),
  ];
}

/** `similarProducts` is the B2 block from lib/learning/retrieval.ts, when there is one. */
export function buildAgentContext(project: Project, version: ProjectVersion, similarProducts?: string | null): string {
  const story = buildIterationStory(project).filter((s) => s.to <= version.number);
  const { current } = stageProgress(project);
  const step = nextStep(project);
  return [
    `PRODUCT: ${project.name} (version ${version.number} of ${project.versions.length})`,
    `Current stage: ${STAGES.find((s) => s.key === current)?.label} (journey: Idea → Design → Make → Money → Launch → Sell). Next step the app suggests: ${step.title}. ${step.detail}`,
    `Target quantity: ${version.targetQuantity.toLocaleString("en-US")} units. Budget: ${version.budgetUsd !== undefined ? `$${version.budgetUsd.toLocaleString("en-US")}` : "not given"}. Material ideas: ${version.materialHints?.join(", ") || "none given"}.`,
    `Inventor's description: ${notesForAi(version)}`,
    ...geometryLines(version),
    "",
    ...analysisLines(version),
    "",
    ...businessCaseLines(version),
    "",
    ...shopLines(version),
    "",
    ...quoteLines(version),
    "",
    ...planLines(version),
    version.listing ? `Etsy listing drafted: "${version.listing.title}" at $${version.listing.priceUsd}.` : "Etsy listing: not drafted yet.",
    ...(story.length ? ["", "Version history:", ...story.map((s) => `- v${s.from} → v${s.to}: ${s.summary}`)] : []),
    ...(similarProducts ? ["", similarProducts] : []),
  ].join("\n");
}
