import { describe, expect, test } from "vitest";
import sample from "@/demo/sample-project.json";
import type { BusinessCaseInputs, Project } from "../types";
import { moneyReadout, priceRange, profitBars } from "./money";

const v = (sample as Project).versions[0];
const paths = v.analysis!.paths;
const at = (retailPriceUsd: number): BusinessCaseInputs => ({ ...v.businessCase!, retailPriceUsd });

describe("moneyReadout", () => {
  test("a losing price says so in plain words, with the price that would work", () => {
    const r = moneyReadout(paths, at(32), 250);
    expect(r.tone).toBe("bad");
    expect(r.title).toBe("At $32 you'd lose money on each sale.");
    expect(r.explanation).toMatch(/^Try a design tweak, or raise the price to about \$\d[\d,]*\.$/);
  });

  test("a good price names the money per sale, never a margin percentage", () => {
    const r = moneyReadout(paths, at(400), 250);
    expect(r.tone).toBe("good");
    expect(r.title).toMatch(/^At \$400 you'd make about \$\d[\d,]* per sale\.$/);
    expect(`${r.title} ${r.explanation}`).not.toMatch(/%|margin/i);
  });

  test("without a price it asks for one", () => {
    expect(moneyReadout(paths, undefined, 250)).toMatchObject({ tone: "neutral", title: "Does it make money?" });
  });
});

describe("profitBars", () => {
  test("total profit (or loss) at 100, 1,000 and 10,000 made, whatever run sizes are saved", () => {
    const bars = profitBars(paths, { ...at(32), quantityTiers: [250] });
    expect(bars.map((b) => b.quantity)).toEqual([100, 1000, 10000]);
    expect(bars[0].profit).toBeLessThan(0); // $32 loses money at 100
    expect(profitBars(paths, at(400)).every((b) => b.profit > 0)).toBe(true);
  });
});

describe("priceRange", () => {
  test("covers the current price, the suggestion and a healthy price, from $1", () => {
    const r = priceRange(paths, at(32), 250);
    expect(r.min).toBe(1);
    expect(r.max).toBeGreaterThanOrEqual(64);
    expect(r.max).toBeGreaterThanOrEqual(v.businessCase!.priceSuggestion!.high);
    expect(r.step).toBe(1);
  });
});
