import { describe, expect, test } from "vitest";
import { buttonClasses, cx, TONES } from "./classes";

describe("buttonClasses", () => {
  test("primary is the accent button at 44px with a 10px radius", () => {
    // Arrange / Act
    const classes = buttonClasses();
    // Assert
    expect(classes).toContain("bg-accent-button"); // a deeper orange so white text reaches 4.5:1
    expect(classes).toContain("hover:bg-accent-button-hover");
    expect(classes).toContain("text-white");
    expect(classes).toContain("h-11");
    expect(classes).toContain("rounded-control");
    expect(classes).toContain("font-semibold");
  });

  test("secondary has a border and the warm hover; ghost has neither bg nor border", () => {
    const secondary = buttonClasses({ variant: "secondary" });
    const ghost = buttonClasses({ variant: "ghost" });
    expect(secondary).toContain("border-border");
    expect(secondary).toContain("bg-surface");
    expect(secondary).toContain("hover:bg-hover");
    expect(ghost).toContain("text-ink-2");
    expect(ghost).toContain("hover:bg-hover");
    expect(ghost).not.toContain("bg-surface");
    expect(ghost).not.toContain("border-border");
  });

  test("danger is a red confirm button", () => {
    const danger = buttonClasses({ variant: "danger" });
    expect(danger).toContain("bg-red");
    expect(danger).not.toContain("bg-accent-button");
  });

  test("small is 36px tall with 14px text", () => {
    const small = buttonClasses({ size: "sm" });
    expect(small).toContain("h-9");
    expect(small).toContain("text-[14px]");
    expect(small).not.toContain("h-11");
  });

  test("large is the 52px finishing button", () => {
    expect(buttonClasses({ size: "lg" })).toContain("h-[52px]");
    expect(buttonClasses({ size: "lg" })).not.toContain("h-11");
  });

  test("extra classes are appended", () => {
    expect(buttonClasses({ className: "w-full" }).endsWith("w-full")).toBe(true);
  });
});

describe("cx", () => {
  test("joins truthy class names only", () => {
    expect(cx("a", false, undefined, "b", null, "")).toBe("a b");
  });
});

describe("TONES", () => {
  test("every tone pairs a soft background with the same color's strong text and dot", () => {
    for (const [name, tone] of Object.entries(TONES)) {
      if (name === "neutral") continue;
      expect(tone.soft).toBe(`bg-${name}-soft`);
      expect(tone.text).toBe(`text-${name}-ink`); // the text-safe shade
      expect(tone.dot).toBe(`bg-${name}`);
    }
  });
});
