import { describe, expect, test } from "vitest";
import bracket from "@/demo/bracket-project.json";
import sample from "@/demo/sample-project.json";
import type { Project, ProjectVersion } from "../types";
import { keyNumbers, unitCostTrend } from "./summary";
import { nextStep } from "./nextStep";
import { STAGES, stageProgress } from "./stage";

const pedal = sample as Project;
const brackets = bracket as Project;
const withLatest = (p: Project, patch: Partial<ProjectVersion>): Project => ({
  ...p,
  versions: [...p.versions.slice(0, -1), { ...p.versions[p.versions.length - 1], ...patch }],
});

describe("stageProgress", () => {
  test("covers the six stages in journey order", () => {
    expect(STAGES.map((s) => s.key)).toEqual(["idea", "design", "make", "money", "launch", "sell"]);
  });

  test("an unanalyzed upload is at Design", () => {
    const p = withLatest(pedal, { analysis: undefined, businessCase: undefined, pitch: undefined });
    const { current, statuses } = stageProgress(p);
    expect(current).toBe("design");
    expect(statuses.idea).toBe("done");
    expect(statuses.design).toBe("current");
    expect(statuses.money).toBe("todo");
  });

  test("choosing a quote, or agreeing with an Alibaba supplier, completes Make", () => {
    const chosen = withLatest(pedal, { outreach: { requestedAt: "2026-09-27T12:00:00.000Z", specSheet: {} as never, quotes: [], chosenQuoteId: "a" } });
    expect(stageProgress(chosen).statuses.make).toBe("done");
    const agreed = withLatest(pedal, { outreach: undefined, sourcing: { suppliers: [{ status: "agreed" }] as never } });
    expect(stageProgress(agreed).statuses.make).toBe("done");
  });

  test("later stages can be done out of order, and the current stage is the first gap", () => {
    // An analysis, a business case and pitch text, but no chosen quote.
    const { current, statuses } = stageProgress(withLatest(pedal, { outreach: undefined }));
    expect(statuses.design).toBe("done");
    expect(statuses.money).toBe("done");
    expect(current).toBe("make");
    expect(statuses.make).toBe("current");
  });
});

describe("nextStep", () => {
  test("asks to analyze first", () => {
    const step = nextStep(withLatest(pedal, { analysis: undefined }));
    expect(step.title).toMatch(/^Analyze/);
    expect(step.href).toBe(`/project/${pedal.id}?v=1#analysis-heading`);
  });

  test("a part that looks the wrong size comes before anything else", () => {
    const g = pedal.versions[0].geometry!;
    const step = nextStep(withLatest(pedal, { analysis: undefined, geometry: { ...g, boundingBoxMm: { x: 1.9, y: 1.9, z: 1 } } }));
    expect(step.title).toMatch(/units/i);
    expect(step.href).toContain("/versions/new");
  });

  test("asks for a price once analyzed", () => {
    const step = nextStep(withLatest(pedal, { businessCase: undefined }));
    expect(step.title).toMatch(/price/i);
    expect(step.href).toBe(`/project/${pedal.id}/money?v=1#business-case-heading`);
  });

  test("with a price set, asks for quotes from the matched shops", () => {
    const step = nextStep(withLatest(pedal, { outreach: undefined }));
    expect(step.title).toBe("Request quotes");
    expect(step.detail).toMatch(/^\d demo shops can make it\. One click sends them a request\.$/);
    expect(step.detail).not.toMatch(/idle/i);
    expect(step.href).toBe(`/project/${pedal.id}/make`);
  });

  test("with quotes in and none chosen, asks to compare them", () => {
    const outreach = { requestedAt: "2026-09-27T12:00:00.000Z", specSheet: {} as never, quotes: [{ id: "a" }, { id: "b" }] as never };
    const step = nextStep(withLatest(pedal, { outreach }));
    expect(step.title).toBe("2 quotes waiting");
    expect(step.href).toBe(`/project/${pedal.id}/make`);
  });
});

describe("keyNumbers", () => {
  test("gives cost, retail and margin at the target quantity, all as ranges", () => {
    const k = keyNumbers(pedal.versions[0]);
    expect(k.unitCost).toEqual(pedal.versions[0].analysis!.paths[0].unitCostUsd);
    expect(k.retailUsd).toBe(32);
    expect(k.margin!.low).toBeLessThanOrEqual(k.margin!.high);
  });

  test("leaves numbers out rather than inventing them", () => {
    const k = keyNumbers({ ...pedal.versions[0], analysis: undefined, businessCase: undefined });
    expect(k).toEqual({ unitCost: undefined, retailUsd: undefined, margin: undefined });
  });
});

describe("unitCostTrend", () => {
  test("one point per analyzed version, oldest first", () => {
    const trend = unitCostTrend(brackets);
    expect(trend.map((p) => p.version)).toEqual([1, 2]);
    expect(trend[1].mid).toBeLessThan(trend[0].mid); // the sheet-metal redesign got cheaper
  });
});
