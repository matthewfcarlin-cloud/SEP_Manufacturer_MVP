import { describe, expect, test } from "vitest";
import sample from "@/demo/sample-project.json";
import { unitCostAt } from "../businessCase";
import type { Project, ProjectVersion } from "../types";
import { alibabaSearchUrl, negotiationTargets, OPENING_DISCOUNT, quoteStanding } from "./targets";

const pedal = (sample as Project).versions[0];

describe("negotiationTargets", () => {
  test("needs an analysis", () => {
    expect(negotiationTargets({ ...pedal, analysis: undefined })).toBeNull();
  });

  test("without a business case: aim for the estimate's low end, walk away at its high end", () => {
    const v: ProjectVersion = { ...pedal, businessCase: undefined };
    const t = negotiationTargets(v)!;
    const est = unitCostAt(v.analysis!.paths[0], v.targetQuantity);
    expect(t.process).toBe(v.analysis!.paths[0].process);
    expect(t.target).toBeCloseTo(est.low, 2);
    expect(t.walkAway).toBeCloseTo(est.high, 2);
    expect(t.walkAwayReason).toBe("estimate");
    expect(t.openingAsk).toBeCloseTo(t.target * (1 - OPENING_DISCOUNT), 2);
  });

  test("uses the requested process, falling back to the top path", () => {
    const second = pedal.analysis!.paths[1].process;
    expect(negotiationTargets(pedal, second)!.process).toBe(second);
    expect(negotiationTargets(pedal, "laser_cutting")!.process).toBe(pedal.analysis!.paths.find((p) => p.process === "laser_cutting")?.process ?? pedal.analysis!.paths[0].process);
  });

  test("a low retail price caps the walk-away at what keeps a healthy margin", () => {
    const est = unitCostAt(pedal.analysis!.paths[0], pedal.targetQuantity);
    const bc = { retailPriceUsd: est.high * 2.2, priceSource: "user" as const, quantityTiers: [100], revenueShare: 0.5 };
    const t = negotiationTargets({ ...pedal, businessCase: bc })!;
    expect(t.walkAwayReason).toBe("margin");
    expect(t.walkAway!).toBeLessThan(est.high);
    expect(t.target).toBeLessThanOrEqual(t.walkAway!);
  });

  test("when no price leaves a margin there is no walk-away", () => {
    const bc = { retailPriceUsd: 0.5, priceSource: "user" as const, quantityTiers: [100], revenueShare: 0.5 };
    const t = negotiationTargets({ ...pedal, businessCase: bc })!;
    expect(t.walkAway).toBeNull();
    expect(t.walkAwayReason).toBe("no-margin");
  });
});

describe("quoteStanding", () => {
  const t = negotiationTargets({ ...pedal, businessCase: undefined })!;
  test("classifies a quote against target and walk-away", () => {
    expect(quoteStanding(t.target, t)).toBe("at-target");
    expect(quoteStanding((t.target + t.walkAway!) / 2, t)).toBe("negotiable");
    expect(quoteStanding(t.walkAway! + 1, t)).toBe("over-walk-away");
  });
});

test("alibabaSearchUrl encodes the phrase for Alibaba's search page", () => {
  expect(alibabaSearchUrl(" custom sheet metal enclosure & lid ")).toBe(
    "https://www.alibaba.com/trade/search?SearchText=custom%20sheet%20metal%20enclosure%20%26%20lid",
  );
});
