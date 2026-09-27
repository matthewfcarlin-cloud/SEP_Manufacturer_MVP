import { describe, expect, test } from "vitest";
import type { ProductFeatures } from "../types";
import { findSimilar, similarProductsBlock, similarityScore } from "./similar";

const row = (projectId: string, overrides: Partial<ProductFeatures> = {}): ProductFeatures => ({
  projectId,
  version: 1,
  category: "enclosure",
  process: "cnc_milling",
  material: "aluminum",
  sizeBucket: "m",
  volumeCm3: 120,
  quantity: 250,
  unitCostEst: { low: 36, high: 60 },
  ...overrides,
});

const query = { projectId: "Query00001", category: "enclosure", process: "cnc_milling", material: "aluminum", sizeBucket: "m", quantity: 250 } as const;

describe("similarityScore", () => {
  test("an identical product scores 1", () => {
    expect(similarityScore(query, row("A"))).toBeCloseTo(1);
  });

  test("each differing feature lowers the score; neighboring sizes count partly", () => {
    const exact = similarityScore(query, row("A"));
    const otherProcess = similarityScore(query, row("A", { process: "sheet_metal" }));
    const nextSize = similarityScore(query, row("A", { sizeBucket: "l" }));
    const farSize = similarityScore(query, row("A", { sizeBucket: "xs" }));
    expect(otherProcess).toBeLessThan(exact);
    expect(nextSize).toBeLessThan(exact);
    expect(farSize).toBeLessThan(nextSize);
  });

  test("quantity is compared on a log scale: 10x apart counts partly, 100x apart not at all", () => {
    const tenX = similarityScore(query, row("A", { quantity: 2_500 }));
    const hundredX = similarityScore(query, row("A", { quantity: 25_000 }));
    expect(tenX).toBeGreaterThan(hundredX);
    expect(similarityScore({ projectId: "Q", quantity: 250 }, row("A", { quantity: 25_000 }))).toBe(0);
  });

  test("only the query's known features count, so an unanalyzed product can still match on size and quantity", () => {
    expect(similarityScore({ projectId: "Q", sizeBucket: "m", quantity: 250 }, row("A", { process: "sheet_metal" }))).toBeCloseTo(1);
  });
});

describe("findSimilar", () => {
  test("ranks by similarity, keeps at most k, and drops weak matches", () => {
    const rows = [
      row("Weak", { category: "toy_game", process: "fdm_print", material: "pla_petg", sizeBucket: "xs", quantity: 10 }),
      row("Close", { process: "sheet_metal" }),
      row("Exact"),
      ...Array.from({ length: 6 }, (_, i) => row(`Filler${i}`, { material: "steel", process: "sheet_metal" })),
    ];
    const found = findSimilar(query, rows, 5);
    expect(found).toHaveLength(5);
    expect(found.slice(0, 2).map((r) => r.projectId)).toEqual(["Exact", "Close"]);
    expect(found.map((r) => r.projectId)).not.toContain("Weak");
  });

  test("never returns the asking creator's own product", () => {
    expect(findSimilar(query, [row("Query00001"), row("Other")]).map((r) => r.projectId)).toEqual(["Other"]);
  });

  test("returns at most one version per product, its best match", () => {
    const found = findSimilar(query, [row("A", { version: 1, process: "sheet_metal" }), row("A", { version: 2 }), row("B")]);
    expect(found.filter((r) => r.projectId === "A")).toEqual([expect.objectContaining({ version: 2 })]);
  });
});

describe("similarProductsBlock", () => {
  test("nothing similar means no block at all", () => {
    expect(similarProductsBlock([])).toBeNull();
  });

  test("describes each product by its features and says where every number came from, without ids", () => {
    const block = similarProductsBlock([
      row("Secret0001", { realQuotes: { count: 2, medianUnitUsd: 41.5, medianQuantity: 250 }, revision: { tweakProcess: "sheet_metal", unitCostChangePct: -40 } }),
      row("Secret0002", { category: undefined, wallMm: 2.4 }),
    ])!;
    expect(block).toMatch(/SIMILAR PRODUCTS/);
    expect(block).toMatch(/enclosure · CNC milling · aluminum · size M · 250 units/i);
    expect(block).toContain("AI estimate $36.00–$60.00/unit");
    expect(block).toContain("2 real supplier quotes: median $41.50/unit at 250 units");
    expect(block).toContain("revised with a sheet metal tweak: unit cost −40%");
    expect(block).toMatch(/no real quotes yet/i);
    expect(block).not.toContain("Secret");
  });
});
