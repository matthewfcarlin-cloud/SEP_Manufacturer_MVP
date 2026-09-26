import { describe, expect, test, vi } from "vitest";
import { getShops } from "../shops";
import type { Project, ProjectVersion } from "../types";
import { summarizeCapacity } from "./capacity";
import { sampleAnalysis } from "./fixtures";
import { buildProjectBrief, buildSystemPrompt } from "./prompt";
import { AnalysisError, normalizeAnalysis, runAnalysis, type CallModel } from "./run";

const input = { images: [], text: "brief" };

describe("normalizeAnalysis", () => {
  const normalized = normalizeAnalysis(sampleAnalysis());

  test("sorts paths by fit score, best first", () => {
    expect(normalized.paths.map((p) => p.fitScore)).toEqual([82, 64]);
  });

  test("rounds unit cost to cents and tooling and lead time to whole numbers", () => {
    const cnc = normalized.paths[0];
    expect(cnc.unitCostUsd).toEqual({ low: 18.33, high: 26.5 });
    expect(cnc.toolingCostUsd).toEqual({ low: 150, high: 501 });
    expect(cnc.leadTimeDays).toEqual({ low: 7, high: 12 });
  });

  test("renumbers storyboard shots from 1", () => {
    expect(normalized.storyboard.map((s) => s.shot)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("does not mutate its input", () => {
    const original = sampleAnalysis();
    const snapshot = structuredClone(original);
    normalizeAnalysis(original);
    expect(original).toEqual(snapshot);
  });
});

describe("runAnalysis", () => {
  test("returns the normalized analysis when the first answer is valid", async () => {
    const call = vi.fn<CallModel>().mockResolvedValue({ stopReason: "end_turn", output: sampleAnalysis() });
    const result = await runAnalysis(call, input);
    expect(call).toHaveBeenCalledTimes(1);
    expect(result.paths[0].process).toBe("cnc_milling");
  });

  test("retries once, naming the validation problems, then succeeds", async () => {
    const bad = sampleAnalysis({ storyboard: sampleAnalysis().storyboard.slice(0, 4) });
    const call = vi
      .fn<CallModel>()
      .mockResolvedValueOnce({ stopReason: "end_turn", output: bad })
      .mockResolvedValueOnce({ stopReason: "end_turn", output: sampleAnalysis() });

    await runAnalysis(call, input);

    expect(call).toHaveBeenCalledTimes(2);
    const retryText = call.mock.calls[1][0].text;
    expect(retryText).toContain("brief");
    expect(retryText).toMatch(/storyboard: need exactly 6 shots, got 4/);
  });

  test.each([
    ["inverted cost range", { paths: [{ ...sampleAnalysis().paths[0], unitCostUsd: { low: 20, high: 5 } }, sampleAnalysis().paths[1]] }],
    ["single path", { paths: [sampleAnalysis().paths[0]] }],
    ["fit score over 100", { paths: [{ ...sampleAnalysis().paths[0], fitScore: 140 }, sampleAnalysis().paths[1]] }],
    ["storyboard far from 30 s", { storyboard: sampleAnalysis().storyboard.map((s) => ({ ...s, seconds: 20 })) }],
  ])("rejects %s and gives up after the retry", async (_label, patch) => {
    const call = vi.fn<CallModel>().mockResolvedValue({ stopReason: "end_turn", output: sampleAnalysis(patch) });
    await expect(runAnalysis(call, input)).rejects.toBeInstanceOf(AnalysisError);
    expect(call).toHaveBeenCalledTimes(2);
  });

  test("keeps the four best-fit paths when the model returns extras, without retrying", async () => {
    const base = sampleAnalysis().paths[0];
    const scores = [55, 90, 20, 70, 35, 80];
    const paths = scores.map((fitScore, i) => ({
      ...base,
      fitScore,
      // The weakest extra is a "not viable" placeholder with zero costs.
      ...(i === 2 && { unitCostUsd: { low: 0, high: 0 }, leadTimeDays: { low: 0, high: 0 } }),
    }));
    const call = vi.fn<CallModel>().mockResolvedValue({ stopReason: "end_turn", output: sampleAnalysis({ paths }) });
    const result = await runAnalysis(call, input);
    expect(call).toHaveBeenCalledTimes(1);
    expect(result.paths.map((p) => p.fitScore)).toEqual([90, 80, 70, 55]);
  });

  test("keeps a valid cost-by-volume curve, rounded to cents", async () => {
    const curve = [10, 100, 1000, 10000].map((quantity, i) => ({ quantity, low: 40 / (i + 1) + 0.004, high: 60 / (i + 1) }));
    const withCurve = sampleAnalysis({
      paths: sampleAnalysis().paths.map((p) => ({ ...p, unitCostAtVolume: curve })),
    });
    const call = vi.fn<CallModel>().mockResolvedValue({ stopReason: "end_turn", output: withCurve });
    const result = await runAnalysis(call, input);
    expect(call).toHaveBeenCalledTimes(1);
    expect(result.paths[0].unitCostAtVolume?.map((v) => v.quantity)).toEqual([10, 100, 1000, 10000]);
    expect(result.paths[0].unitCostAtVolume?.[0].low).toBe(40);
  });

  test("retries when the curve is priced at the wrong volumes", async () => {
    const badCurve = [5, 50, 500, 5000].map((quantity) => ({ quantity, low: 5, high: 8 }));
    const bad = sampleAnalysis({ paths: sampleAnalysis().paths.map((p) => ({ ...p, unitCostAtVolume: badCurve })) });
    const call = vi
      .fn<CallModel>()
      .mockResolvedValueOnce({ stopReason: "end_turn", output: bad })
      .mockResolvedValueOnce({ stopReason: "end_turn", output: sampleAnalysis() });
    await runAnalysis(call, input);
    expect(call.mock.calls[1][0].text).toMatch(/unitCostAtVolume: must price exactly 10, 100, 1000, 10000/);
  });

  test("retries after a truncated answer", async () => {
    const call = vi
      .fn<CallModel>()
      .mockResolvedValueOnce({ stopReason: "max_tokens", output: null })
      .mockResolvedValueOnce({ stopReason: "end_turn", output: sampleAnalysis() });
    await expect(runAnalysis(call, input)).resolves.toBeDefined();
    expect(call.mock.calls[1][0].text).toMatch(/cut off/);
  });

  test("does not retry a refusal", async () => {
    const call = vi.fn<CallModel>().mockResolvedValue({ stopReason: "refusal", output: null });
    await expect(runAnalysis(call, input)).rejects.toThrow(/declined/);
    expect(call).toHaveBeenCalledTimes(1);
  });
});

describe("prompts", () => {
  const v1: ProjectVersion = {
    number: 1,
    createdAt: new Date().toISOString(),
    notes: "Stompbox enclosure",
    targetQuantity: 250,
    budgetUsd: 4000,
    materialHints: ["aluminum"],
    imageUrls: [],
    geometry: {
      boundingBoxMm: { x: 122, y: 66, z: 39.5 },
      volumeCm3: 53.985,
      surfaceAreaCm2: 441.28,
      triangleCount: 28,
      isWatertight: true,
      thinWallWarning: false,
      typicalWallMm: 2.5,
    },
  };
  const project: Project = { id: "abcdefghij", name: "Fuzz pedal enclosure", createdAt: v1.createdAt, versions: [v1] };

  test("the brief carries this part's numbers and a mass anchor", () => {
    const brief = buildProjectBrief(project, v1, 2);
    expect(brief).toContain("122 × 66 × 39.5 mm");
    expect(brief).toContain("250 units");
    expect(brief).toContain("$4,000");
    expect(brief).toContain("aluminum 6061 ~146 g"); // 53.985 cm³ × 2.7
    expect(brief).toContain("attached above: 2");
  });

  test("the brief gives measured wall thickness and fill, not mesh resolution", () => {
    const brief = buildProjectBrief(project, v1, 0);
    expect(brief).toContain("Typical wall thickness (area-weighted median, measured): 2.5 mm");
    expect(brief).toContain("Material fills 17% of the bounding box"); // 53.985 / 318.054
    expect(brief).not.toContain("triangles");
  });

  test("the brief says so when there is no budget or geometry", () => {
    const brief = buildProjectBrief(project, { ...v1, budgetUsd: undefined, geometry: undefined }, 0);
    expect(brief).toContain("Budget: not given");
    expect(brief).toContain("No CAD geometry");
  });

  test("a first version's brief has no revision block", () => {
    expect(buildProjectBrief(project, v1, 0)).not.toContain("Revision:");
  });

  test("a revised version's brief says what changed and how the base version did", () => {
    const analysis = sampleAnalysis();
    const best = analysis.paths[0];
    const analyzedV1 = { ...v1, analysis };
    const v2: ProjectVersion = {
      ...v1,
      number: 2,
      basedOn: 1,
      changeNote: "Bent from one sheet",
      appliedTweak: { fromVersion: 1, process: best.process, change: best.designTweaks[0].change, why: "", impact: "cheaper" },
    };
    const brief = buildProjectBrief({ ...project, versions: [analyzedV1, v2] }, v2, 0);
    expect(brief).toContain("Revision: this is version 2, revised from version 1.");
    expect(brief).toContain("What the inventor changed: Bent from one sheet");
    expect(brief).toContain(best.designTweaks[0].change);
    expect(brief).toContain(`Version 1's best path was`);
    expect(brief.indexOf("Revision:")).toBeLessThan(brief.indexOf("Analyze this part."));
  });

  test("the system prompt lists every process with idle counts from the seed data", () => {
    const capacity = summarizeCapacity(getShops());
    expect(capacity.split("\n")).toHaveLength(9);
    expect(capacity).toMatch(/CNC turning \(cnc_turning\): \d+ machines at \d+ shops, 4 idle this month/);
    expect(buildSystemPrompt(capacity)).toContain(capacity);
  });

  test("the system prompt is deterministic, so it stays cacheable", () => {
    expect(buildSystemPrompt(summarizeCapacity(getShops()))).toBe(buildSystemPrompt(summarizeCapacity(getShops())));
  });
});
