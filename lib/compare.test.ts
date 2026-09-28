import { describe, expect, test } from "vitest";
import legacy from "@/test/fixtures/legacy-project.json";
import { compareVersions, summarizeVersion } from "./compare";
import type { Analysis, ManufacturingPath, ProjectVersion } from "./types";

const baseAnalysis = legacy.analysis as Analysis;
const path = (overrides: Partial<ManufacturingPath>): ManufacturingPath => ({ ...baseAnalysis.paths[0], ...overrides });

const version = (number: number, best: Partial<ManufacturingPath> | null, extra: Partial<ProjectVersion> = {}): ProjectVersion => ({
  number,
  createdAt: new Date(2026, 0, number).toISOString(),
  notes: "",
  targetQuantity: 500,
  imageUrls: [],
  ...(best && { analysis: { ...baseAnalysis, paths: [path(best), ...baseAnalysis.paths.slice(1)] } }),
  ...extra,
});

const molded = version(1, { process: "injection_molding", fitScore: 68, unitCostUsd: { low: 8, high: 12 }, toolingCostUsd: { low: 15000, high: 21000 } });
const bent = version(2, { process: "sheet_metal", fitScore: 88, unitCostUsd: { low: 5, high: 7 }, toolingCostUsd: { low: 0, high: 300 } });

describe("compareVersions", () => {
  const cmp = compareVersions(summarizeVersion(molded, "Vernon Plastics"), summarizeVersion(bent, "Gardena Sheet Works"));

  test("unit cost delta compares range midpoints", () => {
    const unit = cmp.rows.find((r) => r.key === "unitCost")!;
    expect(unit.change).toBe("−40%"); // 10 → 6
    expect(unit.direction).toBe("better");
  });

  test("tooling delta is in dollars and lower is better", () => {
    const tooling = cmp.rows.find((r) => r.key === "tooling")!;
    expect(tooling.change).toBe("−$17.9k"); // 18,000 → 150
    expect(tooling.direction).toBe("better");
  });

  test("fit score delta is in points and higher is better", () => {
    const fit = cmp.rows.find((r) => r.key === "fitScore")!;
    expect(fit.change).toBe("+20");
    expect(fit.direction).toBe("better");
  });

  test("process and top shop report a switch", () => {
    expect(cmp.rows.find((r) => r.key === "process")!.change).toBe("Switched");
    expect(cmp.rows.find((r) => r.key === "topShop")!.b).toBe("Gardena Sheet Works");
  });

  test("the summary reads like a person wrote it", () => {
    expect(cmp.summary).toBe("Each one costs 40% less, the one-time setup cost is $17.9k lower, it's made by sheet metal instead of injection molding, and it fits 20 points better.");
  });

  test("keeps acronyms when naming a process mid-sentence", () => {
    const milled = version(3, { process: "cnc_milling", fitScore: 88, unitCostUsd: { low: 5, high: 7 }, toolingCostUsd: { low: 0, high: 300 } });
    expect(compareVersions(summarizeVersion(bent), summarizeVersion(milled)).summary).toBe("It's made by CNC milling instead of sheet metal.");
  });

  test("a worse version is marked worse", () => {
    const back = compareVersions(summarizeVersion(bent), summarizeVersion(molded));
    expect(back.rows.find((r) => r.key === "unitCost")!.direction).toBe("worse");
    expect(back.summary).toMatch(/^Each one costs 67% more/);
  });

  test("identical versions say nothing meaningful changed", () => {
    const same = compareVersions(summarizeVersion(bent), summarizeVersion({ ...bent, number: 3 }));
    expect(same.summary).toBe("No real change in what it costs or how it's made.");
    expect(same.rows.every((r) => r.direction === "same")).toBe(true);
  });

  test("the per-sale row compares what you keep on each sale, in dollars, from each version's own price", () => {
    const priced = (v: ProjectVersion) => ({ ...v, businessCase: { retailPriceUsd: 40, priceSource: "user" as const, quantityTiers: [100], revenueShare: 0.5 } });
    const withMargins = compareVersions(summarizeVersion(priced(molded)), summarizeVersion(priced(bent)));
    const perSale = withMargins.rows.find((r) => r.key === "perSale")!;
    expect(perSale.a).toMatch(/^−?\$[\d.,]+$/);
    expect(perSale.change).toMatch(/^\+\$[\d.,]+$/);
    expect(perSale.direction).toBe("better");
    expect(withMargins.summary).toMatch(/you keep \$[\d.,]+ more per sale/);
    expect(withMargins.summary).not.toMatch(/margin|%.*pts/);
  });

  test("the per-sale row stays empty unless both versions have a price", () => {
    const perSale = cmp.rows.find((r) => r.key === "perSale")!;
    expect(perSale.change).toBeNull();
    expect(perSale.a).toBe("—");
    expect(cmp.summary).not.toContain("per sale");
  });

  test("flags when target quantities differ", () => {
    expect(cmp.quantitiesDiffer).toBe(false);
    const bigger = compareVersions(summarizeVersion(molded), summarizeVersion({ ...bent, targetQuantity: 5000 }));
    expect(bigger.quantitiesDiffer).toBe(true);
  });

  test("an unanalyzed version gives no deltas instead of invented ones", () => {
    const pending = compareVersions(summarizeVersion(molded), summarizeVersion(version(2, null)));
    expect(pending.bothAnalyzed).toBe(false);
    expect(pending.rows.every((r) => r.change === null)).toBe(true);
    expect(pending.summary).toBe("See how version 2 is made to compare it with version 1.");
  });
});
