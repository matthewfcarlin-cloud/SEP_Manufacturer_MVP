import { describe, expect, test } from "vitest";
import { moveFocus } from "./menuFocus";

describe("menu keyboard focus", () => {
  test("arrow keys wrap around the items", () => {
    expect(moveFocus(0, 3, "ArrowDown")).toBe(1);
    expect(moveFocus(2, 3, "ArrowDown")).toBe(0);
    expect(moveFocus(0, 3, "ArrowUp")).toBe(2);
  });

  test("Home and End jump to the ends; other keys keep focus", () => {
    expect(moveFocus(1, 3, "Home")).toBe(0);
    expect(moveFocus(1, 3, "End")).toBe(2);
    expect(moveFocus(1, 3, "a")).toBe(1);
  });

  test("an empty menu has nothing to focus", () => {
    expect(moveFocus(0, 0, "ArrowDown")).toBe(-1);
  });
});
