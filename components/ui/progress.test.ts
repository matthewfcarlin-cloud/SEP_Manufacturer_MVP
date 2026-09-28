import { describe, expect, test } from "vitest";
import { progressPercent, stepLabel } from "./progress";

describe("progress bar math", () => {
  test("labels the step in plain words", () => {
    expect(stepLabel(3, 6)).toBe("Step 3 of 6");
  });

  test("percent is clamped to 0-100 and safe for a zero total", () => {
    expect(progressPercent(3, 6)).toBe(50);
    expect(progressPercent(9, 6)).toBe(100);
    expect(progressPercent(-1, 6)).toBe(0);
    expect(progressPercent(1, 0)).toBe(0);
  });
});
