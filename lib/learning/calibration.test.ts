import { describe, expect, test } from "vitest";
import type { CalibrationCell } from "../types";
import { calibrate, calibrationCells, calibrationLabel, quantityBucket, SHRINK_K } from "./calibration";

const sample = (ratio: number, overrides = {}) => ({ process: "cnc_milling" as const, sizeBucket: "s" as const, quantity: 250, ratio, ...overrides });

describe("quantityBucket", () => {
  test.each([[1, "q1"], [99, "q1"], [100, "q100"], [999, "q100"], [1000, "q1k"], [9999, "q1k"], [10000, "q10k"], [5e6, "q10k"]] as const)("%i → %s", (q, b) => {
    expect(quantityBucket(q)).toBe(b);
  });
});

describe("calibrationCells", () => {
  test("shrinks the median ratio toward 1 with k = 5", () => {
    const [cell] = calibrationCells([sample(0.8), sample(0.8), sample(0.8)]);
    // (3 × 0.8 + 5 × 1) / (3 + 5) = 0.925
    expect(SHRINK_K).toBe(5);
    expect(cell).toEqual({ process: "cnc_milling", sizeBucket: "s", quantityBucket: "q100", n: 3, factor: 0.93 });
  });

  test("with lots of data the factor approaches the median", () => {
    const [cell] = calibrationCells(Array.from({ length: 95 }, () => sample(0.6)));
    expect(cell.factor).toBeCloseTo((95 * 0.6 + 5) / 100, 2);
  });

  test("uses the median, so one wild quote barely moves it", () => {
    const [cell] = calibrationCells([sample(1), sample(1), sample(1), sample(1), sample(9)]);
    expect(cell.factor).toBe(1);
  });

  test("keeps separate cells per process, size and quantity bucket", () => {
    const cells = calibrationCells([sample(0.5), sample(0.5, { process: "sheet_metal" }), sample(0.5, { sizeBucket: "m" }), sample(0.5, { quantity: 5000 })]);
    expect(cells).toHaveLength(4);
    expect(cells.every((c) => c.n === 1)).toBe(true);
  });

  test("drops impossible ratios (likely typos) instead of learning from them", () => {
    expect(calibrationCells([sample(0.01), sample(50), sample(Number.NaN)])).toEqual([]);
  });
});

describe("calibrate", () => {
  const cells: CalibrationCell[] = [{ process: "cnc_milling", sizeBucket: "s", quantityBucket: "q100", n: 14, factor: 0.8 }];

  test("scales the range and says where the correction came from", () => {
    expect(calibrate({ low: 40, high: 60 }, cells, "cnc_milling", "s", 250)).toEqual({ low: 32, high: 48, factor: 0.8, n: 14, label: "Calibrated from 14 real quotes" });
  });

  test("a cell with no data leaves the range alone and says so", () => {
    expect(calibrate({ low: 40, high: 60 }, cells, "sheet_metal", "s", 250)).toEqual({ low: 40, high: 60, factor: 1, n: 0, label: "Uncalibrated estimate" });
    expect(calibrate({ low: 40, high: 60 }, cells, "cnc_milling", "s", 5000)).toMatchObject({ n: 0 });
  });

  test("labels one quote in the singular", () => {
    expect(calibrationLabel(1)).toBe("Calibrated from 1 real quote");
  });
});
