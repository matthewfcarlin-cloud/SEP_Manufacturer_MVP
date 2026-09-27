import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { Project } from "../types";
import { buildOutcome, outcomeRequestSchema } from "./outcomes";

const project = JSON.parse(readFileSync("demo/sample-project.json", "utf8")) as Project;
const version = project.versions[0];
const base = { projectId: project.id, version: 1 };

const parse = (body: unknown) => {
  const parsed = outcomeRequestSchema.safeParse(body);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  return parsed.data;
};

describe("outcome requests", () => {
  test("only the three creator-entered kinds are accepted; tweak cost deltas are computed, never posted", () => {
    expect(outcomeRequestSchema.safeParse({ ...base, kind: "tweak_cost_delta", value: -3 }).success).toBe(false);
  });

  test.each([
    [{ kind: "real_quote", process: "cnc_milling", quantity: 0, actualUsd: 30 }],
    [{ kind: "real_quote", process: "cnc_milling", quantity: 100, actualUsd: -1 }],
    [{ kind: "real_quote", process: "laser_magic", quantity: 100, actualUsd: 30 }],
    [{ kind: "real_quote", process: "cnc_milling", quantity: 100, actualUsd: 30, note: "free text" }],
    [{ kind: "units_sold", value: 2.5 }],
  ])("rejects a malformed request %#", (body) => {
    expect(outcomeRequestSchema.safeParse({ ...base, ...body }).success).toBe(false);
  });
});

describe("buildOutcome", () => {
  test("a real quote on the creator's own project is real, with the analysis estimate computed server-side", () => {
    const result = buildOutcome(parse({ ...base, kind: "real_quote", process: "cnc_milling", quantity: 100, actualUsd: 52.5, material: "Aluminum 6061 (anodized)" }), version, "owner");
    expect(result).toEqual({
      ok: true,
      outcome: {
        id: expect.any(String),
        projectId: project.id,
        version: 1,
        kind: "real_quote",
        process: "cnc_milling",
        material: "Aluminum 6061 (anodized)",
        quantity: 100,
        estimateUsd: { low: 45, high: 75 },
        actualUsd: 52.5,
        source: "real",
        createdAt: expect.any(String),
      },
    });
  });

  test("the same quote entered on a shared example is demo, so learning never reads it", () => {
    const result = buildOutcome(parse({ ...base, kind: "real_quote", process: "cnc_milling", quantity: 100, actualUsd: 52.5 }), version, "example");
    expect(result).toMatchObject({ ok: true, outcome: { source: "demo" } });
  });

  test("the estimate is interpolated between the analysis's priced volumes", () => {
    const result = buildOutcome(parse({ ...base, kind: "actual_unit_cost", process: "sheet_metal", quantity: 250, actualUsd: 20 }), version, "owner");
    if (!result.ok) throw new Error(result.error);
    expect(result.outcome.estimateUsd!.low).toBeGreaterThan(14);
    expect(result.outcome.estimateUsd!.low).toBeLessThan(25);
    expect(result.outcome.estimateUsd!.high).toBeLessThan(45);
  });

  test("a material must be one the analysis listed for that process, matched case-insensitively and stored as listed", () => {
    const ok = buildOutcome(parse({ ...base, kind: "real_quote", process: "sls_print", quantity: 100, actualUsd: 40, material: "nylon pa12" }), version, "owner");
    expect(ok).toMatchObject({ ok: true, outcome: { material: "Nylon PA12" } });
    const bad = buildOutcome(parse({ ...base, kind: "real_quote", process: "sls_print", quantity: 100, actualUsd: 40, material: "unobtainium" }), version, "owner");
    expect(bad).toEqual({ ok: false, status: 400, error: expect.stringMatching(/material/i) });
  });

  test("a process the analysis didn't suggest can't be compared, so it's refused", () => {
    const result = buildOutcome(parse({ ...base, kind: "real_quote", process: "laser_cutting", quantity: 100, actualUsd: 10 }), version, "owner");
    expect(result).toEqual({ ok: false, status: 422, error: expect.stringMatching(/isn't one of this version's manufacturing paths/i) });
  });

  test("a quote needs an analyzed version", () => {
    const unanalyzed = { ...version, analysis: undefined };
    const result = buildOutcome(parse({ ...base, kind: "real_quote", process: "cnc_milling", quantity: 100, actualUsd: 10 }), unanalyzed, "owner");
    expect(result).toMatchObject({ ok: false, status: 422 });
  });

  test("units sold need no analysis", () => {
    const unanalyzed = { ...version, analysis: undefined };
    const result = buildOutcome(parse({ ...base, kind: "units_sold", value: 40 }), unanalyzed, "owner");
    expect(result).toMatchObject({ ok: true, outcome: { kind: "units_sold", value: 40, source: "real" } });
  });
});
