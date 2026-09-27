import type { z } from "zod";
import type { planDraftSchema } from "../schemas";
import type { LaunchPlan, Milestone, ProjectVersion } from "../types";

// The AI drafts each milestone's title, duration, budget and note. The code
// owns what must be exact: production lead time and cost (chosen quote, else
// the analysis), tooling (zero when there is none), and every date. So
// choosing a different quote re-dates the plan instantly, with no AI call.

export type PlanDraft = z.infer<typeof planDraftSchema>;
type Range = { low: number; high: number };
const DAY_MS = 86_400_000;

const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

export type ProductionFacts = { basedOn: LaunchPlan["basedOn"]; leadDays: number; budget: Range; hasTooling: boolean };

export function productionFacts(version: ProjectVersion): ProductionFacts {
  const outreach = version.outreach;
  const chosen = outreach?.quotes.find((q) => q.id === outreach.chosenQuoteId);
  if (chosen) {
    const cost = chosen.unitPriceUsd * chosen.quantity + chosen.toolingUsd;
    return { basedOn: { kind: "quote", quoteId: chosen.id }, leadDays: chosen.leadTimeDays, budget: { low: cost, high: cost }, hasTooling: chosen.toolingUsd > 0 };
  }
  const best = version.analysis?.paths[0];
  if (!best) return { basedOn: { kind: "analysis" }, leadDays: 30, budget: { low: 0, high: 0 }, hasTooling: false };
  const q = version.targetQuantity;
  return {
    basedOn: { kind: "analysis" },
    leadDays: best.leadTimeDays.high,
    budget: { low: best.unitCostUsd.low * q + best.toolingCostUsd.low, high: best.unitCostUsd.high * q + best.toolingCostUsd.high },
    hasTooling: best.toolingCostUsd.high > 0,
  };
}

type Step = Omit<Milestone, "startDate" | "endDate">;

/** Lays steps back to back from `start`. A zero-day step sits on the cursor without advancing it. */
function dated(steps: Step[], start: string): Milestone[] {
  let cursor = start;
  return steps.map((step) => {
    if (step.durationDays === 0) return { ...step, startDate: cursor, endDate: cursor };
    const m = { ...step, startDate: cursor, endDate: addDays(cursor, step.durationDays - 1) };
    cursor = addDays(m.endDate, 1);
    return m;
  });
}

/** Puts the exact production and tooling numbers into the AI's steps. */
function withFacts(steps: Step[], facts: ProductionFacts): Step[] {
  return steps.map((s) => {
    if (s.key === "production") return { ...s, durationDays: facts.leadDays, budgetUsd: facts.budget };
    if (s.key === "tooling" && !facts.hasTooling) return { ...s, durationDays: 0, budgetUsd: { low: 0, high: 0 }, note: "No tooling needed for this process." };
    if (s.key === "launch") return { ...s, durationDays: Math.max(1, s.durationDays) };
    return s;
  });
}

function assemble(steps: Step[], facts: ProductionFacts, start: string, generatedAt: string, warnings: string[]): LaunchPlan {
  const milestones = dated(withFacts(steps, facts), start);
  return { generatedAt, startDate: start, launchDate: milestones[milestones.length - 1].endDate, basedOn: facts.basedOn, milestones, warnings };
}

export function buildPlan(draft: PlanDraft, version: ProjectVersion, generatedAt: string, today: string): LaunchPlan {
  const steps: Step[] = draft.milestones.map((m) => ({
    key: m.key,
    title: m.title,
    durationDays: Math.round(m.durationDays),
    budgetUsd: { low: Math.round(m.budgetLowUsd), high: Math.round(m.budgetHighUsd) },
    note: m.note,
  }));
  return assemble(steps, productionFacts(version), today, generatedAt, draft.warnings);
}

/** Re-dates an existing plan from the version's current quote (or analysis). Keeps the AI's words and the start date. */
export function redatePlan(plan: LaunchPlan, version: ProjectVersion): LaunchPlan {
  const steps: Step[] = plan.milestones.map((m) => ({ key: m.key, title: m.title, durationDays: m.durationDays, budgetUsd: m.budgetUsd, note: m.note }));
  return assemble(steps, productionFacts(version), plan.startDate, plan.generatedAt, plan.warnings);
}

/** The first milestone that isn't finished by `today` (YYYY-MM-DD). */
export function nextDeadline(plan: LaunchPlan, today: string): Milestone | undefined {
  return plan.milestones.find((m) => m.endDate >= today && m.durationDays > 0);
}

export const todayIso = () => new Date().toISOString().slice(0, 10);
