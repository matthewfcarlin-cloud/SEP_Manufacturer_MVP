import { describe, expect, test } from "vitest";
import {
  allInCostAt,
  formatCompactUsd,
  formatMarginRange,
  breakEvenQuantity,
  buildBusinessCase,
  cheapestPathAt,
  unitCostAt,
} from "./businessCase";
import type { BusinessCaseInputs, ManufacturingPath } from "./types";

const curve = (points: [number, number, number][]) => points.map(([quantity, low, high]) => ({ quantity, low, high }));

const basePath: Omit<ManufacturingPath, "process" | "unitCostUsd" | "toolingCostUsd" | "unitCostAtVolume"> = {
  fitScore: 80,
  leadTimeDays: { low: 5, high: 10 },
  materials: ["PLA"],
  pros: [],
  cons: [],
  designTweaks: [{ change: "Hollow the base to a 2 mm shell", why: "Less material", impact: "~20% cheaper" }],
};

// No tooling, cost falls slowly with volume.
const printed: ManufacturingPath = {
  ...basePath,
  process: "fdm_print",
  unitCostUsd: { low: 15, high: 22 },
  toolingCostUsd: { low: 0, high: 0 },
  unitCostAtVolume: curve([[10, 20, 30], [100, 15, 22], [1000, 12, 18], [10000, 11, 16]]),
};

// Big mold, cheap parts.
const molded: ManufacturingPath = {
  ...basePath,
  process: "injection_molding",
  unitCostUsd: { low: 4, high: 6 },
  toolingCostUsd: { low: 8000, high: 12000 },
  unitCostAtVolume: curve([[10, 6, 9], [100, 4, 6], [1000, 2, 3], [10000, 1.5, 2.5]]),
};

const paths = [printed, molded];

const inputs = (retailPriceUsd: number, quantityTiers = [100, 1000, 10000]): BusinessCaseInputs => ({
  retailPriceUsd,
  priceSource: "user",
  quantityTiers,
  revenueShare: 0.5,
});

describe("unitCostAt", () => {
  test("interpolates on a log-log scale between priced volumes", () => {
    const c = unitCostAt(molded, Math.sqrt(100 * 1000));
    expect(c.low).toBeCloseTo(Math.sqrt(4 * 2), 6);
    expect(c.high).toBeCloseTo(Math.sqrt(6 * 3), 6);
    expect(c.basis).toBe("curve");
  });

  test("returns priced volumes exactly", () => {
    expect(unitCostAt(molded, 1000)).toEqual({ low: 2, high: 3, basis: "curve" });
  });

  test("clamps outside the priced range and flags it", () => {
    expect(unitCostAt(molded, 5)).toEqual({ low: 6, high: 9, basis: "clamped" });
    expect(unitCostAt(molded, 50000)).toEqual({ low: 1.5, high: 2.5, basis: "clamped" });
  });

  test("falls back to the flat target-quantity cost when there's no curve", () => {
    const legacy = { ...molded, unitCostAtVolume: undefined };
    expect(unitCostAt(legacy, 1000)).toEqual({ low: 4, high: 6, basis: "flat" });
  });
});

describe("allInCostAt and cheapestPathAt", () => {
  test("spreads tooling over the run", () => {
    const c = allInCostAt(molded, 1000);
    expect(c.low).toBeCloseTo(2 + 8);
    expect(c.high).toBeCloseTo(3 + 12);
  });

  test("printing wins small runs, molding wins big ones", () => {
    expect(cheapestPathAt(paths, 100).process).toBe("fdm_print");
    expect(cheapestPathAt(paths, 10000).process).toBe("injection_molding");
  });
});

describe("breakEvenQuantity", () => {
  test("finds where tooling pays back, with the conservative case later", () => {
    const be = breakEvenQuantity(molded, 20);
    expect(be.optimistic).toBeGreaterThan(300);
    expect(be.optimistic).toBeLessThan(700);
    expect(be.conservative).toBeGreaterThan(be.optimistic!);
  });

  test("is null when the price never covers the part", () => {
    expect(breakEvenQuantity(molded, 1)).toEqual({ optimistic: null, conservative: null });
  });

  test("is 1 when there is no tooling and each part makes money", () => {
    expect(breakEvenQuantity(printed, 100)).toEqual({ optimistic: 1, conservative: 1 });
  });
});

describe("buildBusinessCase", () => {
  test("tiers carry the cheapest process, ranged costs, and margins on your revenue", () => {
    const bc = buildBusinessCase(paths, inputs(60));
    expect(bc.revenuePerUnit).toBe(30);
    const [t100, , t10k] = bc.tiers;
    expect(t100.process).toBe("fdm_print");
    expect(t10k.process).toBe("injection_molding");
    // Conservative margin uses the high cost.
    expect(t100.margin.low).toBeCloseTo((30 - 22) / 30);
    expect(t100.margin.high).toBeCloseTo((30 - 15) / 30);
    expect(t100.profit.low).toBeCloseTo(100 * (30 - 22));
  });

  test("flags tiers outside the priced volumes", () => {
    const bc = buildBusinessCase(paths, inputs(60, [5, 1000, 50000]));
    expect(bc.tiers.map((t) => t.basis)).toEqual(["clamped", "curve", "clamped"]);
  });

  test("verdict: profitable everywhere", () => {
    const { verdict } = buildBusinessCase(paths, inputs(200));
    expect(verdict.tone).toBe("good");
    expect(verdict.headline).toBe("Makes money at every run size shown at $200.");
    expect(verdict.detail).toMatch(/^About \$[\d.,]+ per sale at 100 made, \$[\d.,]+ at 10,000 \(est\.\)\.$/);
    expect(`${verdict.headline} ${verdict.detail}`).not.toMatch(/margin|%/i);
  });

  test("verdict: tooling makes small runs unprofitable, and suggests a process that works there", () => {
    const { verdict } = buildBusinessCase(paths, inputs(40));
    expect(verdict.tone).toBe("mixed");
    expect(verdict.headline).toMatch(/^Makes money from about [\d,]+ made at \$40 \(about \$[\d.,]+ per sale at 1,000, est\.\)\.$/);
    expect(verdict.detail).toMatch(/^The one-time setup cost is too big to pay back under about [\d,]+ made: injection molding needs \$8,000–\$12,000 up front\./);
    expect(verdict.detail).toContain("Try FDM printing for smaller runs (about $18.50 each at 100 made, no one-time setup cost).");
    expect(verdict.detail).not.toMatch(/tooling/i);
  });

  test("verdict: never suggests an alternative that also loses money", () => {
    const { verdict } = buildBusinessCase(paths, inputs(30));
    expect(verdict.tone).toBe("mixed");
    expect(verdict.detail).toMatch(/^The one-time setup cost is too big to pay back/);
    expect(verdict.detail).toContain("No other way shown covers its cost at 100 made at this price");
    expect(verdict.detail).not.toContain("FDM");
  });

  test("verdict: per-part cost, not tooling, suggests the top design tweak", () => {
    const flatOnly = [{ ...printed, unitCostAtVolume: curve([[10, 40, 50], [100, 30, 40], [1000, 10, 12], [10000, 8, 10]]) }];
    const { verdict } = buildBusinessCase(flatOnly, inputs(40, [100, 1000]));
    expect(verdict.tone).toBe("mixed");
    expect(verdict.detail).toContain("the cost of each one is too high");
    expect(verdict.detail).toContain("Hollow the base to a 2 mm shell");
  });

  test("verdict: thin margins say what price would work", () => {
    const { verdict } = buildBusinessCase(paths, inputs(7));
    expect(verdict.tone).toBe("mixed");
    expect(verdict.headline).toMatch(/^At \$7 you'd only just make money: at best about \$0\.50 per sale at 10,000 made\.$/);
    // Best all-in mid is $3.00 at 10k units: 3 / 0.5 / 0.7 = $8.57, rounded up.
    expect(verdict.detail).toBe("A price around $9 leaves room to spare at 10,000 made.");
  });

  test("verdict: not profitable at any volume", () => {
    const { verdict } = buildBusinessCase(paths, inputs(4));
    expect(verdict.tone).toBe("bad");
    expect(verdict.headline).toBe("Loses money at every run size shown at $4.");
    expect(verdict.detail).toBe("Each one costs at least about $3.00 to make, so the price would need to be about $9.");
  });
});

describe("formatting", () => {
  test("margin ranges use a dash only when both ends are positive", () => {
    expect(formatMarginRange({ low: 0.31, high: 0.444 })).toBe("31–44%");
    expect(formatMarginRange({ low: -0.56, high: 0.28 })).toBe("−56% to 28%");
    expect(formatMarginRange({ low: -2.56, high: -0.81 })).toBe("−256% to −81%");
  });

  test("compact dollars carry a real minus sign", () => {
    expect(formatCompactUsd(135000)).toBe("$135k");
    expect(formatCompactUsd(-4100)).toBe("−$4.1k");
  });
});
