import { describe, expect, test, vi } from "vitest";
import sample from "@/demo/sample-project.json";
import { formatToolingRange, formatUnitCostRange } from "../format";
import type { Project } from "../types";
import { buildPriceBrief, PRICE_SYSTEM_PROMPT, runPriceSuggestion, type CallPriceModel } from "./price";
import { AnalysisError } from "./run";

const project = sample as Project;
const version = project.versions[0];
const good = {
  suggested: 179,
  low: 149,
  high: 229,
  comparables: ["Boutique fuzz pedals: $150-250", "Mass-market fuzz pedals: $60-100"],
  reasoning: "Hand-built boutique pedals sell to players who pay for tone and finish.",
};

describe("buildPriceBrief", () => {
  const brief = buildPriceBrief(project, version);

  test("describes the product from the notes and analysis", () => {
    expect(brief).toContain(project.name);
    expect(brief).toContain(version.analysis!.detectedFeatures[0]);
    expect(brief).toContain("122 × 66 × 39.5 mm");
  });

  test("leaves manufacturing costs out so the price comes from the market, not cost-plus", () => {
    for (const path of version.analysis!.paths) {
      expect(brief).not.toContain(formatUnitCostRange(path.unitCostUsd));
      expect(brief).not.toContain(formatToolingRange(path.toolingCostUsd));
    }
    expect(brief).not.toMatch(/unit cost|per part/i);
    // The analysis summary carries a manufacturing takeaway, often a cost.
    expect(brief).not.toContain(version.analysis!.productSummary);
    expect(PRICE_SYSTEM_PROMPT).toMatch(/not from what it costs to make/);
    expect(PRICE_SYSTEM_PROMPT).toMatch(/states a retail target/);
  });
});

describe("runPriceSuggestion", () => {
  test("returns a valid suggestion with prices rounded to cents", async () => {
    const call = vi.fn<CallPriceModel>().mockResolvedValue({ stopReason: "end_turn", output: { ...good, suggested: 179.004 } });
    expect(await runPriceSuggestion(call, "brief")).toEqual({ ...good, suggested: 179 });
    expect(call).toHaveBeenCalledTimes(1);
  });

  test("retries once, naming what failed", async () => {
    const call = vi
      .fn<CallPriceModel>()
      .mockResolvedValueOnce({ stopReason: "end_turn", output: { ...good, suggested: 400 } })
      .mockResolvedValueOnce({ stopReason: "end_turn", output: good });
    expect(await runPriceSuggestion(call, "brief")).toEqual(good);
    expect(call.mock.calls[1][0]).toContain("suggested: must be between low and high");
  });

  test("rejects a placeholder in place of reasoning", async () => {
    const call = vi
      .fn<CallPriceModel>()
      .mockResolvedValueOnce({ stopReason: "end_turn", output: { ...good, reasoning: "placeholder" } })
      .mockResolvedValueOnce({ stopReason: "end_turn", output: good });
    expect(await runPriceSuggestion(call, "brief")).toEqual(good);
    expect(call.mock.calls[1][0]).toContain("reasoning: explain the price in a real sentence");
  });

  test("gives up with a user-safe error after two bad answers", async () => {
    const call = vi.fn<CallPriceModel>().mockResolvedValue({ stopReason: "end_turn", output: { ...good, comparables: [] } });
    await expect(runPriceSuggestion(call, "brief")).rejects.toThrow(AnalysisError);
    expect(call).toHaveBeenCalledTimes(2);
  });
});
