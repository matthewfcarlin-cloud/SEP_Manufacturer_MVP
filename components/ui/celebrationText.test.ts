import { describe, expect, test } from "vitest";
import { celebrationMessage, newlyDone } from "./celebrationText";

describe("celebrationMessage", () => {
  test("names the finished stage and what comes next", () => {
    expect(celebrationMessage("make")).toBe("Nice, Make is done. Next: set a price that makes money.");
    expect(celebrationMessage("money")).toBe("Nice, Money is done. Next: plan your launch.");
  });

  test("the last stage has no next step", () => {
    expect(celebrationMessage("sell")).toBe("Nice, Sell is done. Your product is ready to sell.");
  });

  test("skips stages that are already done: Make done with a price set means launch is next", () => {
    const statuses = { idea: "done", design: "done", make: "done", money: "done", launch: "current", sell: "todo" } as const;
    expect(celebrationMessage("make", statuses)).toBe("Nice, Make is done. Next: plan your launch.");
    const allDone = { idea: "done", design: "done", make: "done", money: "done", launch: "done", sell: "done" } as const;
    expect(celebrationMessage("make", allDone)).toBe("Nice, Make is done. Your product is ready to sell.");
  });
});

describe("newlyDone", () => {
  test("returns the stages that were not done before and are done now", () => {
    // Arrange
    const before = { idea: "done", design: "done", make: "current", money: "todo", launch: "todo", sell: "todo" } as const;
    const after = { idea: "done", design: "done", make: "done", money: "current", launch: "todo", sell: "todo" } as const;
    // Act / Assert
    expect(newlyDone(before, after)).toEqual(["make"]);
  });

  test("nothing is new on first render or when nothing changed", () => {
    const same = { idea: "done", design: "current", make: "todo", money: "todo", launch: "todo", sell: "todo" } as const;
    expect(newlyDone(undefined, same)).toEqual([]);
    expect(newlyDone(same, same)).toEqual([]);
  });
});
