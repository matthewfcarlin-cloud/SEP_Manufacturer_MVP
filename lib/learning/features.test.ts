import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { Outcome, Project } from "../types";
import { buildFeatureRows, featuresForVersion, isContributing, queryFeatures } from "./features";

const sample = JSON.parse(readFileSync("demo/sample-project.json", "utf8")) as Project;
const bracket = JSON.parse(readFileSync("demo/bracket-project.json", "utf8")) as Project;
const OWNER = { keyHash: "c".repeat(64) };

/** The sample pedal as a creator's own, contributing product. */
function mine(overrides: Partial<Project> = {}): Project {
  return {
    ...sample,
    id: "Mine000001",
    name: "Secret Pedal Name",
    isExample: undefined,
    owner: OWNER,
    learning: { contribute: true, updatedAt: "2026-09-27T00:00:00.000Z" },
    versions: sample.versions.map((v) => ({ ...v, analysis: v.analysis && { ...v.analysis, category: "enclosure" as const } })),
    ...overrides,
  };
}

const quote = (actualUsd: number, overrides: Partial<Outcome> = {}): Outcome => ({
  id: `q${actualUsd}`,
  projectId: "Mine000001",
  version: 1,
  kind: "real_quote",
  process: "cnc_milling",
  quantity: 250,
  estimateUsd: { low: 36, high: 60 },
  actualUsd,
  source: "real",
  createdAt: "2026-09-27T00:00:00.000Z",
  ...overrides,
});

describe("isContributing", () => {
  test("only an owned product whose owner switched contributing on", () => {
    expect(isContributing(mine())).toBe(true);
    expect(isContributing(mine({ learning: undefined }))).toBe(false);
    expect(isContributing(mine({ learning: { contribute: false, updatedAt: "x" } }))).toBe(false);
  });

  test("examples never contribute, even if flagged", () => {
    expect(isContributing(mine({ isExample: true, owner: undefined }))).toBe(false);
  });
});

describe("featuresForVersion", () => {
  test("reduces an analyzed version to structured features", () => {
    const project = mine();
    const row = featuresForVersion(project, project.versions[0], []);
    expect(row).toEqual({
      projectId: "Mine000001",
      version: 1,
      category: "enclosure",
      process: "cnc_milling",
      material: "aluminum",
      sizeBucket: "s",
      volumeCm3: project.versions[0].geometry!.volumeCm3,
      wallMm: project.versions[0].geometry!.typicalWallMm,
      quantity: 250,
      unitCostEst: { low: expect.any(Number), high: expect.any(Number) },
    });
  });

  test("never carries the name, notes, summary or any other free text", () => {
    const project = mine();
    const text = JSON.stringify(featuresForVersion(project, project.versions[0], []));
    expect(text).not.toContain("Secret Pedal Name");
    expect(text).not.toContain(project.versions[0].notes.slice(0, 20));
    expect(text).not.toContain(project.versions[0].analysis!.productSummary.slice(0, 20));
    expect(text).not.toContain("Aluminum 6061");
  });

  test("summarizes this version's real quotes only: not demo rows, other versions or other kinds", () => {
    const project = mine();
    const outcomes = [
      quote(40),
      quote(44),
      quote(50, { quantity: 500 }),
      quote(999, { source: "demo" }),
      quote(888, { version: 2 }),
      { ...quote(777), kind: "actual_unit_cost" as const },
    ];
    expect(featuresForVersion(project, project.versions[0], outcomes)?.realQuotes).toEqual({ count: 3, medianUnitUsd: 44, medianQuantity: 250 });
  });

  test("a version that applied a tweak records the unit-cost change against the version it revised", () => {
    const base = mine({ ...bracket, id: "Mine000002", isExample: undefined, owner: OWNER });
    const v2 = base.versions[1];
    const row = featuresForVersion(base, v2, []);
    expect(row?.revision).toEqual({ tweakProcess: "sheet_metal", unitCostChangePct: expect.any(Number) });
    expect(row!.revision!.unitCostChangePct).toBeLessThan(0);
  });

  test("an unanalyzed or unmeasured version has no features", () => {
    const project = mine();
    expect(featuresForVersion(project, { ...project.versions[0], analysis: undefined }, [])).toBeNull();
    expect(featuresForVersion(project, { ...project.versions[0], geometry: undefined }, [])).toBeNull();
  });
});

describe("buildFeatureRows", () => {
  test("rows come only from contributing products", () => {
    const rows = buildFeatureRows([
      { project: mine(), outcomes: [] },
      { project: mine({ id: "NotMine001", learning: undefined }), outcomes: [] },
      { project: { ...sample, learning: { contribute: true, updatedAt: "x" } }, outcomes: [] },
    ]);
    expect(rows.map((r) => r.projectId)).toEqual(["Mine000001"]);
  });
});

describe("queryFeatures", () => {
  test("before its first analysis, a version is described by size, quantity and material ideas", () => {
    const project = mine();
    const fresh = { ...project.versions[0], analysis: undefined, materialHints: ["aluminum"] };
    expect(queryFeatures({ ...project, versions: [fresh] }, fresh)).toEqual({ projectId: "Mine000001", sizeBucket: "s", quantity: 250, material: "aluminum" });
  });

  test("once analyzed, it adds category, process and the top path's material", () => {
    const project = mine();
    expect(queryFeatures(project, project.versions[0])).toEqual({
      projectId: "Mine000001",
      sizeBucket: "s",
      quantity: 250,
      category: "enclosure",
      process: "cnc_milling",
      material: "aluminum",
    });
  });
});
