import { describe, expect, test } from "vitest";
import { formatDaysRange, formatDimensions, formatToolingRange, formatUnitCostRange } from "./format";

describe("range formatting", () => {
  test("unit costs show cents under $100 and whole dollars above", () => {
    expect(formatUnitCostRange({ low: 4.2, high: 6.8 })).toBe("$4.20–$6.80");
    expect(formatUnitCostRange({ low: 95, high: 140 })).toBe("$95–$140");
  });

  test("tooling of zero reads as none", () => {
    expect(formatToolingRange({ low: 0, high: 0 })).toBe("None");
    expect(formatToolingRange({ low: 0, high: 400 })).toBe("$0–$400");
    expect(formatToolingRange({ low: 8000, high: 15000 })).toBe("$8,000–$15,000");
  });

  test("collapses equal bounds", () => {
    expect(formatDaysRange({ low: 5, high: 5 })).toBe("5 days");
    expect(formatDaysRange({ low: 7, high: 12 })).toBe("7–12 days");
  });

  test("dimensions keep one decimal", () => {
    expect(formatDimensions({ x: 122, y: 66, z: 39.5 })).toBe("122 × 66 × 39.5 mm");
  });
});
