import { describe, expect, test } from "vitest";
import { stageForPath, stageHref } from "./stageRoutes";

describe("stage routes", () => {
  test("each of the six stages has its own screen", () => {
    expect(stageHref("abc", "idea")).toBe("/project/abc/idea");
    expect(stageHref("abc", "design")).toBe("/project/abc");
    expect(stageHref("abc", "make")).toBe("/project/abc/make");
    expect(stageHref("abc", "money")).toBe("/project/abc/money");
    expect(stageHref("abc", "launch")).toBe("/project/abc/plan");
    expect(stageHref("abc", "sell")).toBe("/project/abc/sell");
  });

  test("version-aware screens can point at one version", () => {
    expect(stageHref("abc", "design", 2)).toBe("/project/abc?v=2");
    expect(stageHref("abc", "money", 2)).toBe("/project/abc/money?v=2");
    expect(stageHref("abc", "make", 2)).toBe("/project/abc/make");
  });

  test("every product screen belongs to a stage", () => {
    expect(stageForPath("/project/abc")).toBe("design");
    expect(stageForPath("/project/abc/idea")).toBe("idea");
    expect(stageForPath("/project/abc/versions/new")).toBe("idea");
    expect(stageForPath("/project/abc/compare")).toBe("idea");
    expect(stageForPath("/project/abc/money")).toBe("money");
    expect(stageForPath("/project/abc/make")).toBe("make");
    expect(stageForPath("/project/abc/plan")).toBe("launch");
    expect(stageForPath("/project/abc/pitch")).toBe("launch");
    expect(stageForPath("/project/abc/sell")).toBe("sell");
  });
});
