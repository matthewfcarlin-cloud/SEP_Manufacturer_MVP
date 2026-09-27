import { describe, expect, test } from "vitest";
import { isActive, NAV_ITEMS, titleFor } from "./nav";

const item = (href: string) => NAV_ITEMS.find((i) => i.href === href)!;

describe("app shell nav", () => {
  test("product pages and the new-product form count as My products", () => {
    expect(isActive(item("/studio"), "/project/abc123defg/make")).toBe(true);
    expect(isActive(item("/studio"), "/new")).toBe(true);
    expect(isActive(item("/"), "/studio")).toBe(false);
    expect(isActive(item("/shops"), "/shops")).toBe(true);
  });

  test("titles name the product and tab, and fall back when the name isn't known", () => {
    const names = { abc123defg: "Pedal enclosure" };
    expect(titleFor("/project/abc123defg", names)).toBe("Pedal enclosure");
    expect(titleFor("/project/abc123defg/sell", names)).toBe("Pedal enclosure · Sell");
    expect(titleFor("/project/zzzzzzzzzz", names)).toBe("Product");
    expect(titleFor("/studio", names)).toBe("My products");
    expect(titleFor("/new", names)).toBe("New product");
    expect(titleFor("/settings", names)).toBe("Settings");
  });
});
