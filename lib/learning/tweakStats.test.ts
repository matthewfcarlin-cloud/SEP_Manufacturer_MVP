import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { ProductEvent, Project, TweakCategory, TweakStats } from "../types";
import { computeTweakStats, rankTweaks, tweakScore, tweaksThatWorkedBlock } from "./tweakStats";

// The bracket demo: v2 applied v1's sheet-metal tweak and got cheaper.
const bracket = JSON.parse(readFileSync("demo/bracket-project.json", "utf8")) as Project;
const OWNER = { keyHash: "4".repeat(64) };

/** Tags every tweak: the one v2 applied is change_process, the rest add_draft. */
function tagged(contribute = true): Project {
  const applied = bracket.versions[1].appliedTweak!;
  return {
    ...bracket,
    id: "Brack00001",
    isExample: undefined,
    owner: OWNER,
    learning: { contribute, updatedAt: "2026-09-27T00:00:00.000Z" },
    versions: bracket.versions.map((v) => ({
      ...v,
      analysis: v.analysis && {
        ...v.analysis,
        paths: v.analysis.paths.map((p) => ({
          ...p,
          designTweaks: p.designTweaks.map((t) => ({ ...t, category: (p.process === applied.process && t.change === applied.change ? "change_process" : "add_draft") as TweakCategory })),
        })),
      },
    })),
  };
}

let seq = 0;
const rating = (rating: "up" | "down", overrides: Partial<ProductEvent> = {}): ProductEvent => ({
  id: `r${seq++}`,
  workspaceId: "w".repeat(64),
  projectId: "Brack00001",
  version: 2,
  type: "tweak_rated",
  payload: { process: "sheet_metal", pathIndex: 0, tweakIndex: 0, rating },
  source: "real",
  createdAt: new Date(Date.UTC(2026, 8, 27, 0, 0, seq)).toISOString(),
  ...overrides,
});

const statsFor = (stats: TweakStats[], category: TweakCategory) => stats.find((s) => s.category === category)!;

describe("computeTweakStats", () => {
  test("counts suggestions, the applied tweak and its measured unit-cost change", () => {
    const stats = computeTweakStats([{ project: tagged(), events: [] }]);
    const switched = statsFor(stats, "change_process");
    expect(switched).toMatchObject({ suggested: 1, applied: 1, costDeltas: 1 });
    expect(switched.medianCostChangePct).toBeLessThan(0);
    expect(statsFor(stats, "add_draft").applied).toBe(0);
  });

  test("counts only each browser's latest rating of a tweak, and only real ones", () => {
    const stats = computeTweakStats([
      { project: tagged(), events: [rating("up"), rating("down"), rating("up", { workspaceId: "x".repeat(64) }), rating("up", { source: "demo", workspaceId: "y".repeat(64) })] },
    ]);
    // v2 path 0 tweak 0 is an add_draft tweak: one browser changed its mind to 👎, another said 👍; the demo row is ignored.
    expect(statsFor(stats, "add_draft")).toMatchObject({ up: 1, down: 1 });
  });

  test("products that haven't opted in don't count at all", () => {
    expect(computeTweakStats([{ project: tagged(false), events: [rating("up")] }])).toEqual([]);
  });
});

describe("tweakScore", () => {
  const base: TweakStats = { category: "add_draft", suggested: 10, applied: 0, up: 0, down: 0, costDeltas: 0, score: 0 };
  test("no evidence scores zero", () => {
    expect(tweakScore(base)).toBe(0);
  });
  test("being applied, rated up and cutting cost each raise it", () => {
    expect(tweakScore({ ...base, applied: 5 })).toBeGreaterThan(0);
    expect(tweakScore({ ...base, up: 4 })).toBeGreaterThan(0);
    expect(tweakScore({ ...base, costDeltas: 3, medianCostChangePct: -25 })).toBeGreaterThan(0);
    expect(tweakScore({ ...base, down: 4 })).toBeLessThan(0);
    expect(tweakScore({ ...base, costDeltas: 3, medianCostChangePct: 30 })).toBeLessThan(0);
  });
});

describe("rankTweaks", () => {
  test("re-orders a path's tweaks by what actually worked, keeping the AI's order on ties", () => {
    const v1 = tagged().versions[0];
    const sheet = v1.analysis!.paths.findIndex((p) => p.process === "sheet_metal");
    const before = rankTweaks(v1, [])[sheet].tweaks.map((t) => t.index);
    expect(before).toEqual(v1.analysis!.paths[sheet].designTweaks.map((_, i) => i));

    const stats = computeTweakStats([{ project: tagged(), events: [] }]);
    const ranked = rankTweaks(v1, stats);
    const winner = v1.analysis!.paths[sheet].designTweaks.findIndex((t) => t.category === "change_process");
    expect(ranked[sheet].tweaks[0]).toMatchObject({ index: winner, key: `${sheet}.${winner}`, category: "change_process" });
    expect(ranked[sheet].tweaks[0].evidence).toMatch(/applied 1 of 1 times; median unit cost −\d+% across 1 revision/);
  });

  test("tweaks from before B4 have no category and no evidence", () => {
    const [first] = rankTweaks(bracket.versions[0], []);
    expect(first.tweaks[0]).toMatchObject({ score: 0, evidence: "No results yet" });
    expect(first.tweaks[0].category).toBeUndefined();
  });
});

describe("tweaksThatWorkedBlock", () => {
  test("lists kinds of tweaks with evidence, and nothing without it", () => {
    expect(tweaksThatWorkedBlock([])).toBeNull();
    const block = tweaksThatWorkedBlock(computeTweakStats([{ project: tagged(), events: [] }]))!;
    expect(block).toMatch(/TWEAKS THAT WORKED/);
    expect(block).toMatch(/switch process: applied 1 of 1 times/);
    expect(block).not.toMatch(/add draft/);
    expect(block).not.toContain("Brack00001");
  });
});
