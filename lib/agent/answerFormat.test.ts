import { describe, expect, test } from "vitest";
import { answerActions, emphasize } from "./answerFormat";

const bold = (text: string) => emphasize(text).filter((s) => s.isBold).map((s) => s.text);

describe("emphasize", () => {
  test("bolds the key numbers: prices, ranges, percentages and quantities", () => {
    expect(bold("At $32 you'd lose about $6 on each one, 18% less than 1,000 units would.")).toEqual(["$32", "$6", "18%", "1,000 units"]);
    expect(bold("CNC costs $28–$48 each and takes 12 days.")).toEqual(["$28–$48", "12 days"]);
  });

  test("honors **bold** from the model and drops the stars", () => {
    expect(emphasize("Pick **Ironbark CNC** first.")).toEqual([
      { text: "Pick ", isBold: false },
      { text: "Ironbark CNC", isBold: true },
      { text: " first.", isBold: false },
    ]);
  });

  test("leaves plain text alone", () => {
    expect(emphasize("Start with a sketch.")).toEqual([{ text: "Start with a sketch.", isBold: false }]);
  });
});

describe("answerActions", () => {
  const ctx = { projectId: "abc", version: 2, hasTweaks: true, hasQuotes: true, hasAnalysis: true };

  test("offers the matching screen for what the answer talks about, at most two", () => {
    expect(answerActions("Try the sheet-metal tweak; then compare the quotes again.", ctx)).toEqual([
      { label: "Apply this tweak", href: "/project/abc/versions/new?from=2&tweak=0.0" },
      { label: "Open quotes", href: "/project/abc/make#quotes-heading" },
    ]);
    expect(answerActions("Charge about $40 to keep a healthy margin.", ctx)).toEqual([{ label: "Open the numbers", href: "/project/abc/money?v=2#business-case-heading" }]);
  });

  test("never offers what the product doesn't have yet", () => {
    expect(answerActions("A tweak and some quotes would help.", { ...ctx, hasTweaks: false, hasQuotes: false })).toEqual([]);
  });
});
