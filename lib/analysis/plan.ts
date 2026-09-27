import { notesForAi } from "../aiInputs";
import { formatDaysRange, formatToolingRange, formatUnitCostRange } from "../format";
import type { ProductionFacts } from "../plan/schedule";
import { PROCESS_LABELS } from "../processes";
import { MILESTONE_KEYS, planDraftSchema } from "../schemas";
import { getShopById } from "../shops";
import type { Project, ProjectVersion } from "../types";
import { runStructured, type CallTextModel } from "./structured";
import type { PlanDraft } from "../plan/schedule";

export const PLAN_SYSTEM_PROMPT = `You plan product launches for first-time hardware creators: from a finished design to a product on sale. Draft the eight milestones below for this specific product, in order: ${MILESTONE_KEYS.join(", ")}.

- Durations are calendar days, realistic for a small first run with a local shop. The production lead time and cost are given: use them for "production" exactly. Use 0 for tooling only if the brief says there is none.
- Budgets are honest low-high USD estimates for that step alone (prototype parts, sample fees, photography, listing fees, launch ads). Never repeat the production cost in other steps.
- Titles are short and specific to this product. Notes say what to do and what to watch for, in one sentence.
- Warnings (0-3) name real timing or budget risks for this plan, e.g. a lead time that pushes launch past a key selling season. Don't invent facts.`;

export function buildPlanBrief(project: Project, version: ProjectVersion, facts: ProductionFacts): string {
  const best = version.analysis?.paths[0];
  const chosen = version.outreach?.quotes.find((q) => q.id === version.outreach?.chosenQuoteId);
  const lines = [
    `Product: ${project.name}`,
    `What it is: ${notesForAi(version)}`,
    `Run size: ${version.targetQuantity.toLocaleString("en-US")} units.`,
  ];
  if (best) {
    lines.push(
      `Process: ${PROCESS_LABELS[best.process]}, est. ${formatUnitCostRange(best.unitCostUsd)} per unit, tooling ${formatToolingRange(best.toolingCostUsd)}, lead time ${formatDaysRange(best.leadTimeDays)}.`,
    );
  }
  if (chosen) {
    lines.push(`Chosen quote (demo shop ${getShopById(chosen.shopId)?.name ?? chosen.shopId}): $${chosen.unitPriceUsd.toFixed(2)}/unit, tooling $${chosen.toolingUsd}, ${chosen.leadTimeDays} days, MOQ ${chosen.moq}.`);
  }
  lines.push(
    `Production (use exactly): ${facts.leadDays} days, $${Math.round(facts.budget.low).toLocaleString("en-US")}–$${Math.round(facts.budget.high).toLocaleString("en-US")}. Tooling: ${facts.hasTooling ? "yes" : "none"}.`,
    version.businessCase ? `Retail price: $${version.businessCase.retailPriceUsd}.` : "Retail price: not set yet.",
    `Today is ${new Date().toISOString().slice(0, 10)}.`,
    "",
    "Draft the plan.",
  );
  return lines.join("\n");
}

export function runPlanDraft(callModel: CallTextModel, brief: string): Promise<PlanDraft> {
  return runStructured(callModel, brief, {
    schema: planDraftSchema,
    logTag: "plan",
    refusalMessage: "The AI declined to draft this plan.",
    failMessage: "The AI's plan didn't pass our checks. Please try again.",
  });
}
