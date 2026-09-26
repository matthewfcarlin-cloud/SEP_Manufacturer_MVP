import { describe, expect, test, vi } from "vitest";
import bracket from "@/demo/bracket-project.json";
import sample from "@/demo/sample-project.json";
import type { Project } from "../types";
import { buildPitchBrief, PITCH_SYSTEM_PROMPT, runPitchGeneration } from "./pitch";
import { AnalysisError } from "./run";
import type { CallTextModel } from "./structured";

const pedal = sample as Project;
const brackets = bracket as Project;
const good = {
  oneLiner: "A stomp-proof boutique fuzz enclosure built on idle local sheet-metal capacity.",
  problem: "Small pedal builders buy generic die-cast shells, then drill and finish each one by hand. It eats hours per pedal and every enclosure looks the same.",
  product: "A pre-punched, finished 125B enclosure made in Los Angeles in runs of a few hundred, ready to populate.",
  audience: "Boutique pedal builders buy it; a parts distributor or enclosure maker would license and stock it.",
  ask: "We are looking for a licensing partner to produce and distribute the enclosure line.",
};

describe("buildPitchBrief", () => {
  test("carries the product, the recommended process, and the business case verdict", () => {
    const brief = buildPitchBrief(pedal, pedal.versions[0]);
    expect(brief).toContain(pedal.name);
    expect(brief).toContain(pedal.versions[0].analysis!.productSummary);
    expect(brief).toMatch(/Recommended process: \w+/);
    expect(brief).toMatch(/Business case \(estimate\): (Profitable|Thin|Not profitable)/);
  });

  test("includes how the design improved across versions", () => {
    const brief = buildPitchBrief(brackets, brackets.versions[1]);
    expect(brief).toContain("Design history:");
    expect(brief).toContain("v1 → v2");
    expect(brief).toContain("Unit cost −14%");
  });

  test("says there's no business case yet rather than inventing numbers", () => {
    const noCase = { ...pedal.versions[0], businessCase: undefined };
    expect(buildPitchBrief(pedal, noCase)).toContain("Business case: not set up yet");
  });

  test("the system prompt aims at a company decision-maker and forbids invented facts", () => {
    expect(PITCH_SYSTEM_PROMPT).toMatch(/decision-maker/);
    expect(PITCH_SYSTEM_PROMPT).toMatch(/Never invent/);
  });
});

describe("runPitchGeneration", () => {
  test("returns the pitch, marked as not edited", async () => {
    const call = vi.fn<CallTextModel>().mockResolvedValue({ stopReason: "end_turn", output: good });
    expect(await runPitchGeneration(call, "brief")).toEqual({ ...good, editedByUser: false });
  });

  test("retries a field that runs far over its word limit", async () => {
    const call = vi
      .fn<CallTextModel>()
      .mockResolvedValueOnce({ stopReason: "end_turn", output: { ...good, oneLiner: "word ".repeat(40) } })
      .mockResolvedValueOnce({ stopReason: "end_turn", output: good });
    await runPitchGeneration(call, "brief");
    expect(call.mock.calls[1][0]).toContain("oneLiner: keep it under 16 words");
  });

  test("fails with a user-safe error after two bad answers", async () => {
    const call = vi.fn<CallTextModel>().mockResolvedValue({ stopReason: "end_turn", output: { ...good, ask: "placeholder" } });
    await expect(runPitchGeneration(call, "brief")).rejects.toThrow(AnalysisError);
  });
});
