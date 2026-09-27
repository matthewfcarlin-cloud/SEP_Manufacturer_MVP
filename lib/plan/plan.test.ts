import { describe, expect, test } from "vitest";
import bracket from "@/demo/bracket-project.json";
import { MILESTONE_KEYS } from "../schemas";
import type { Project, ProjectVersion } from "../types";
import { buildPlan, nextDeadline, productionFacts, redatePlan, type PlanDraft } from "./schedule";

const v2 = (bracket as Project).versions[1] as ProjectVersion;
const draft: PlanDraft = {
  milestones: MILESTONE_KEYS.map((key) => ({ key, title: key, durationDays: 10, budgetLowUsd: 100, budgetHighUsd: 200, note: "n" })),
  warnings: ["Holiday rush"],
};
const TODAY = "2026-09-28";

describe("productionFacts", () => {
  test("come from the chosen quote when there is one", () => {
    const chosen = v2.outreach!.quotes.find((q) => q.id === v2.outreach!.chosenQuoteId)!;
    const facts = productionFacts(v2);
    expect(facts.basedOn).toEqual({ kind: "quote", quoteId: chosen.id });
    expect(facts.leadDays).toBe(chosen.leadTimeDays);
    const cost = chosen.unitPriceUsd * chosen.quantity + chosen.toolingUsd;
    expect(facts.budget).toEqual({ low: cost, high: cost });
  });

  test("fall back to the analysis's best path", () => {
    const facts = productionFacts({ ...v2, outreach: undefined });
    const best = v2.analysis!.paths[0];
    expect(facts.basedOn).toEqual({ kind: "analysis" });
    expect(facts.leadDays).toBe(best.leadTimeDays.high);
    expect(facts.budget.low).toBeCloseTo(best.unitCostUsd.low * v2.targetQuantity + best.toolingCostUsd.low);
  });
});

describe("buildPlan", () => {
  const plan = buildPlan(draft, v2, "2026-09-28T09:00:00.000Z", TODAY);

  test("dates milestones back to back from today, in order", () => {
    expect(plan.milestones.map((m) => m.key)).toEqual([...MILESTONE_KEYS]);
    expect(plan.startDate).toBe(TODAY);
    expect(plan.milestones[0]).toMatchObject({ startDate: "2026-09-28", endDate: "2026-10-07", durationDays: 10 });
    expect(plan.milestones[1].startDate).toBe("2026-10-08");
    expect(plan.launchDate).toBe(plan.milestones.at(-1)!.endDate);
  });

  test("production uses the real lead time and cost, not the AI's guess", () => {
    const production = plan.milestones.find((m) => m.key === "production")!;
    const facts = productionFacts(v2);
    expect(production.durationDays).toBe(facts.leadDays);
    expect(production.budgetUsd).toEqual(facts.budget);
  });

  test("keeps the AI's warnings", () => {
    expect(plan.warnings).toContain("Holiday rush");
  });
});

describe("redatePlan", () => {
  test("choosing a slower quote pushes the launch date out, without a new AI draft", () => {
    const plan = buildPlan(draft, v2, "2026-09-28T09:00:00.000Z", TODAY);
    const slow = { ...v2.outreach!.quotes[0], leadTimeDays: 60 };
    const withSlow = { ...v2, outreach: { ...v2.outreach!, quotes: [slow, ...v2.outreach!.quotes.slice(1)], chosenQuoteId: slow.id } };
    const redated = redatePlan(plan, withSlow);
    expect(redated.launchDate > plan.launchDate).toBe(true);
    expect(redated.basedOn).toEqual({ kind: "quote", quoteId: slow.id });
    expect(redated.milestones.find((m) => m.key === "production")!.durationDays).toBe(60);
    expect(redated.milestones[0].title).toBe(plan.milestones[0].title); // the AI's words are kept
    expect(redated.startDate).toBe(plan.startDate);
  });

  test("no tooling on the chosen quote means a zero-day tooling step", () => {
    const plan = buildPlan(draft, v2, "2026-09-28T09:00:00.000Z", TODAY);
    const free = { ...v2.outreach!.quotes[0], toolingUsd: 0 };
    const redated = redatePlan(plan, { ...v2, outreach: { ...v2.outreach!, quotes: [free], chosenQuoteId: free.id } });
    const tooling = redated.milestones.find((m) => m.key === "tooling")!;
    expect(tooling.durationDays).toBe(0);
    expect(tooling.startDate).toBe(tooling.endDate);
  });
});

describe("nextDeadline", () => {
  test("is the first milestone not yet finished", () => {
    const plan = buildPlan(draft, v2, "2026-09-28T09:00:00.000Z", TODAY);
    expect(nextDeadline(plan, "2026-10-09")?.key).toBe("prototype");
    expect(nextDeadline(plan, "2099-01-01")).toBeUndefined();
  });
});
