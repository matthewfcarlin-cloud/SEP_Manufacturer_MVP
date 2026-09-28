import { describe, expect, test } from "vitest";
import bracket from "@/demo/bracket-project.json";
import sample from "@/demo/sample-project.json";
import type { Project, ProjectVersion } from "../types";
import { moneyVerdict, tabSummary } from "./plainSummary";

const pedal = (sample as Project).versions[0];
const bracketV2 = (bracket as Project).versions[1];
const withPrice = (v: ProjectVersion, retailPriceUsd: number): ProjectVersion => ({ ...v, businessCase: { ...v.businessCase!, retailPriceUsd } });

describe("moneyVerdict", () => {
  test("says plainly when a price loses money, and what price would work", () => {
    const verdict = moneyVerdict(withPrice(pedal, 32))!;
    expect(verdict.tone).toBe("bad");
    expect(verdict.text).toMatch(/^At \$32 you'd lose money on each sale\. Try a design tweak, or raise the price to about \$\d[\d,]*\.$/);
    expect(verdict.text).not.toMatch(/%/);
  });

  test("a price with room to spare reads as good, with money per sale", () => {
    const verdict = moneyVerdict(withPrice(pedal, 400))!;
    expect(verdict.tone).toBe("good");
    expect(verdict.text).toMatch(/^At \$400 you'd make about \$\d+ per sale\. Estimated for 250 made, after the cost of making each one\.$/);
  });

  test("asks for a price when there isn't one, and says nothing before the analysis", () => {
    expect(moneyVerdict({ ...pedal, businessCase: undefined })?.text).toBe("Set a price to see whether it makes money.");
    expect(moneyVerdict({ ...pedal, analysis: undefined })).toBeNull();
  });
});

describe("tabSummary", () => {
  test("every tab is two plain lines, with no jargon", () => {
    for (const tab of ["design", "make", "plan", "pitch", "sell"] as const) {
      for (const v of [pedal, bracketV2]) {
        const lines = tabSummary(v, tab);
        expect(lines).toHaveLength(2);
        expect(lines.join(" ")).not.toMatch(/tooling|lead time|margin|MOQ|idle/i);
      }
    }
  });

  test("reflects where the product is", () => {
    expect(tabSummary(pedal, "make")[0]).toBe("5 quotes came back (demo).");
    expect(tabSummary(bracketV2, "make")[0]).toMatch(/^You picked .+ at \$4\.60 each \(demo quote\)\.$/);
    expect(tabSummary(bracketV2, "plan")[0]).toMatch(/^Launch day is [A-Z][a-z]+ \d{1,2}, \d{4} \(est\.\)\.$/);
    expect(tabSummary(bracketV2, "sell")[1]).toMatch(/^After Etsy's fees you'd keep about \$\d+\.\d\d per sale\.$/);
    expect(tabSummary({ ...pedal, analysis: undefined }, "design")[0]).toBe("Moko hasn't looked at this design yet.");
  });
});
