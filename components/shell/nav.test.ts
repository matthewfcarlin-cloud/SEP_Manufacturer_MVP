import { describe, expect, test } from "vitest";
import { isActive, isMoreActive, NAV_ITEMS, PHONE_TABS } from "./nav";

const item = (href: string) => NAV_ITEMS.find((i) => i.href === href)!;

describe("app shell nav", () => {
  test("lists Home, My products, Ask Moko, Manufacturers and Settings, in that order", () => {
    expect(NAV_ITEMS.map((i) => i.label)).toEqual(["Home", "My products", "Ask Moko", "Manufacturers", "Settings"]);
  });

  test("Home is the dashboard; product pages belong to My products", () => {
    expect(isActive(item("/studio"), "/studio")).toBe(true);
    expect(isActive(item("/studio"), "/project/abc123defg")).toBe(false);
    expect(isActive(item("/projects"), "/projects")).toBe(true);
    expect(isActive(item("/projects"), "/project/abc123defg/make")).toBe(true);
    expect(isActive(item("/shops"), "/shops")).toBe(true);
  });

  test("phones get Home, Products, Ask and More; More covers the rest", () => {
    expect(PHONE_TABS.map((t) => t.label)).toEqual(["Home", "Products", "Ask"]);
    expect(isMoreActive("/settings")).toBe(true);
    expect(isMoreActive("/shops")).toBe(true);
    expect(isMoreActive("/studio")).toBe(false);
  });
});
