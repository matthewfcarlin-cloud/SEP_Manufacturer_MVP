import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { Analysis, Project } from "../types";
import { goldenCasesSchema, scoreCase, type GoldenCase } from "./score";

const cases = goldenCasesSchema.parse(JSON.parse(readFileSync("evals/golden/cases.json", "utf8")));
const pedal = cases.find((c) => c.name === "pedal-enclosure")!;
// A real saved analysis of the pedal enclosure.
const saved = (JSON.parse(readFileSync("demo/sample-project.json", "utf8")) as Project).versions[0].analysis!;

describe("golden cases", () => {
  test("there are 10–20, each valid and uniquely named", () => {
    expect(cases.length).toBeGreaterThanOrEqual(10);
    expect(cases.length).toBeLessThanOrEqual(20);
    expect(new Set(cases.map((c) => c.name)).size).toBe(cases.length);
  });
});

describe("scoreCase", () => {
  test("the real pedal analysis scores well on its own case", () => {
    const score = scoreCase(pedal, saved);
    expect(score).toMatchObject({ schemaValid: true, processMatch: 1, costOverlap: 1 });
    expect(score.specificity).toBeGreaterThan(0.5);
    expect(score.total).toBeGreaterThanOrEqual(75);
  });

  test("the wrong process in first place scores 0, in second place half", () => {
    const wrongFirst: GoldenCase = { ...pedal, expected: { ...pedal.expected, bestProcess: ["sheet_metal"] } };
    expect(scoreCase(wrongFirst, saved).processMatch).toBe(0.5);
    const nowhere: GoldenCase = { ...pedal, expected: { ...pedal.expected, bestProcess: ["laser_cutting"] } };
    expect(scoreCase(nowhere, saved).processMatch).toBe(0);
  });

  test("a cost range that misses the plausible range scores 0", () => {
    const cheap: GoldenCase = { ...pedal, expected: { ...pedal.expected, unitCostUsd: { low: 0.1, high: 1 } } };
    expect(scoreCase(cheap, saved).costOverlap).toBe(0);
  });

  test("generic text that never uses the part's dimensions scores no specificity", () => {
    const generic: Analysis = { ...saved, productSummary: "A product.", detectedFeatures: ["a shape"], topRecommendation: "Make it.", risks: ["Costs."], paths: saved.paths.map((p) => ({ ...p, pros: [], cons: [], designTweaks: p.designTweaks.map((t) => ({ ...t, change: "Change it.", why: "Better.", impact: "Cheaper." })) })) };
    expect(scoreCase(pedal, generic).specificity).toBe(0);
  });

  test("required mentions score the share found", () => {
    const partly: GoldenCase = { ...pedal, expected: { ...pedal.expected, mustMention: ["wall", "zeppelin"] } };
    expect(scoreCase(partly, saved).mentions).toBe(0.5);
  });

  test("a failed analysis scores zero across the board", () => {
    expect(scoreCase(pedal, null)).toEqual({ schemaValid: false, processMatch: 0, costOverlap: 0, specificity: 0, mentions: 0, total: 0 });
  });
});
