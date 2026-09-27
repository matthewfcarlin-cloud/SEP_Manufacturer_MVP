import { describe, expect, test } from "vitest";
import sample from "@/demo/sample-project.json";
import { matchVersion } from "../match";
import type { DemoQuote, Outreach, Project } from "../types";
import { allInPerUnit, bestValueId, fastestId, sortQuotes } from "./compare";
import { advanceQuote, chooseQuote } from "./pipeline";
import { simulateQuotes } from "./simulate";
import { buildSpecSheet, FINISH_BY_PROCESS } from "./specSheet";

const pedal = sample as Project;
const version = pedal.versions[0];
const REQUESTED = "2026-09-27T12:00:00.000Z";
const matches = matchVersion(version);

describe("buildSpecSheet", () => {
  test("a summary sheet carries spec facts only: no renders, no notes", () => {
    const sheet = buildSpecSheet(version, "cnc_milling", "summary", REQUESTED);
    expect(sheet.dimensionsMm).toEqual({ x: 122, y: 66, z: 39.5 });
    expect(sheet.material).toBe(version.analysis!.paths.find((p) => p.process === "cnc_milling")!.materials[0]);
    expect(sheet.finish).toBe(FINISH_BY_PROCESS.cnc_milling);
    expect(sheet.renders).toEqual([]);
    expect(sheet.notes).toBeUndefined();
    expect(sheet.quoteBy).toBe("2026-10-04");
  });

  test("tiers include the target quantity, and the target price keeps a healthy margin", () => {
    const sheet = buildSpecSheet(version, "cnc_milling", "summary", REQUESTED);
    expect(sheet.quantityTiers).toEqual([100, 250, 1000, 10000]);
    // $32 retail × 50% to the maker × (1 − 30% healthy margin)
    expect(sheet.targetUnitPriceUsd).toBeCloseTo(11.2);
  });

  test("sharing more adds renders and notes, unless notes are held back from the AI", () => {
    const full = buildSpecSheet(version, "cnc_milling", "full", REQUESTED);
    expect(full.renders).toHaveLength(4);
    expect(full.notes).toBe(version.notes);
    const withheld = buildSpecSheet({ ...version, aiInputs: { includePhotos: true, includeNotes: false } }, "cnc_milling", "full", REQUESTED);
    expect(withheld.notes).toBeUndefined();
  });
});

describe("simulateQuotes", () => {
  const quotes = simulateQuotes(pedal.id, version, matches, REQUESTED);

  test("one demo quote per matched shop, at most five", () => {
    expect(quotes.length).toBe(Math.min(5, matches.length));
    expect(new Set(quotes.map((q) => q.shopId)).size).toBe(quotes.length);
    expect(quotes.every((q) => q.isDemo && q.status === "quoted")).toBe(true);
  });

  test("every price sits inside the analysis estimate for that shop's process", () => {
    for (const q of quotes) {
      const path = version.analysis!.paths.find((p) => p.process === q.process)!;
      expect(q.unitPriceUsd).toBeGreaterThanOrEqual(path.unitCostUsd.low);
      expect(q.unitPriceUsd).toBeLessThanOrEqual(path.unitCostUsd.high);
      expect(q.toolingUsd).toBeGreaterThanOrEqual(path.toolingCostUsd.low);
      expect(q.toolingUsd).toBeLessThanOrEqual(path.toolingCostUsd.high);
    }
  });

  test("is reproducible, and each shop writes its own note", () => {
    expect(simulateQuotes(pedal.id, version, matches, REQUESTED)).toEqual(quotes);
    expect(new Set(quotes.map((q) => q.note)).size).toBeGreaterThan(1);
  });
});

const q = (id: string, unit: number, tooling: number, lead: number, status: DemoQuote["status"] = "quoted"): DemoQuote => ({
  id, shopId: id, machineModel: "M", process: "cnc_milling", quantity: 100, unitPriceUsd: unit, toolingUsd: tooling, leadTimeDays: lead, moq: 10, note: "", status, isDemo: true,
});

describe("compare", () => {
  const quotes = [q("a", 10, 1000, 20), q("b", 12, 0, 10), q("c", 11, 200, 30)];

  test("best value is the lowest all-in cost per unit, tooling spread over the run", () => {
    expect(allInPerUnit(quotes[0])).toBe(20); // 10 + 1000/100
    expect(bestValueId(quotes)).toBe("b"); // 12 all-in
    expect(fastestId(quotes)).toBe("b");
  });

  test("sorts by best value, price or lead time", () => {
    expect(sortQuotes(quotes, "value").map((x) => x.id)).toEqual(["b", "c", "a"]);
    expect(sortQuotes(quotes, "price").map((x) => x.id)).toEqual(["a", "c", "b"]);
    expect(sortQuotes(quotes, "lead").map((x) => x.id)).toEqual(["b", "a", "c"]);
  });
});

describe("pipeline", () => {
  const outreach: Outreach = {
    requestedAt: REQUESTED,
    specSheet: buildSpecSheet(version, "cnc_milling", "summary", REQUESTED),
    quotes: [q("a", 10, 0, 10), q("b", 12, 0, 10)],
  };

  test("choosing a quote saves it; choosing again switches", () => {
    expect(chooseQuote(outreach, "a").chosenQuoteId).toBe("a");
    expect(chooseQuote(chooseQuote(outreach, "a"), "b").chosenQuoteId).toBe("b");
    expect(() => chooseQuote(outreach, "zzz")).toThrow(/No such quote/);
  });

  test("statuses only move forward, and only the chosen quote can be ordered", () => {
    const sampled = advanceQuote(outreach, "a", "sample");
    expect(sampled.quotes[0].status).toBe("sample");
    expect(() => advanceQuote(sampled, "a", "quoted")).toThrow(/forward/);
    expect(() => advanceQuote(outreach, "a", "ordered")).toThrow(/Choose this quote/);
    expect(advanceQuote(chooseQuote(outreach, "a"), "a", "ordered").quotes[0].status).toBe("ordered");
  });

  test("never mutates its input", () => {
    const before = structuredClone(outreach);
    chooseQuote(outreach, "a");
    advanceQuote(outreach, "a", "sample");
    expect(outreach).toEqual(before);
  });
});
