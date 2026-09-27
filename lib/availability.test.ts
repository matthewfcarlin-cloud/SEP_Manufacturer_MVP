import { expect, test } from "vitest";
import { shopStartWindow, START_LABELS, startWindow } from "./availability";

test("available now reads 'this week', otherwise '2–3 weeks', and never says idle", () => {
  expect(START_LABELS[startWindow(true)]).toBe("Can start this week");
  expect(START_LABELS[startWindow(false)]).toBe("Can start in 2–3 weeks");
  expect(shopStartWindow([{ idleThisMonth: false }, { idleThisMonth: true }])).toBe("this_week");
  expect(shopStartWindow([{ idleThisMonth: false }])).toBe("two_three_weeks");
  expect(Object.values(START_LABELS).join(" ")).not.toMatch(/idle/i);
});
