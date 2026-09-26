import { describe, expect, test } from "vitest";
import { sampleAnalysis } from "./analysis/fixtures";
import { cheapestByVolume, effectiveCostCurve } from "./costCurve";
import type { ManufacturingPath } from "./types";

const Q = [10, 100, 1000, 10000];
const path = (process: ManufacturingPath["process"], unit: number[], tooling: number): ManufacturingPath => ({
  ...sampleAnalysis().paths[0],
  process,
  toolingCostUsd: { low: tooling, high: tooling },
  unitCostAtVolume: Q.map((quantity, i) => ({ quantity, low: unit[i], high: unit[i] })),
});

describe("effectiveCostCurve", () => {
  test("adds tooling spread over each volume", () => {
    const curve = effectiveCostCurve(path("injection_molding", [3, 2, 1.5, 1], 5000))!;
    expect(curve.points.map((p) => p.mid)).toEqual([503, 52, 6.5, 1.5]);
  });

  test("uses low with low and high with high", () => {
    const p = { ...path("cnc_milling", [20, 18, 15, 12], 0), toolingCostUsd: { low: 100, high: 300 } };
    const first = effectiveCostCurve(p)!.points[0];
    expect([first.low, first.high]).toEqual([30, 50]);
  });

  test("returns null when the path has no curve (older analyses)", () => {
    expect(effectiveCostCurve({ ...sampleAnalysis().paths[0], unitCostAtVolume: undefined })).toBeNull();
  });
});

describe("cheapestByVolume", () => {
  test("names the crossover from printing to molding", () => {
    const curves = [
      effectiveCostCurve(path("sla_print", [30, 28, 26, 25], 0))!,
      effectiveCostCurve(path("injection_molding", [3, 2, 1.5, 1], 5000))!,
    ];
    expect(cheapestByVolume(curves)).toBe("SLA printing is cheapest up to 100 units; injection molding from 1,000.");
  });

  test("says so when one process wins everywhere", () => {
    const curves = [
      effectiveCostCurve(path("fdm_print", [5, 5, 5, 5], 0))!,
      effectiveCostCurve(path("cnc_milling", [40, 35, 30, 28], 200))!,
    ];
    expect(cheapestByVolume(curves)).toBe("FDM printing is cheapest at every volume shown.");
  });
});
