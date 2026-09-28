import { describe, expect, test } from "vitest";
import sample from "@/demo/sample-project.json";
import type { EtsyListing, LaunchPlan, Project } from "../types";
import { avatarTone, listingCopyText, timelineRows, tweakSaving } from "./stageDisplay";

describe("tweakSaving", () => {
  test("reads a before/after cost straight from the impact", () => {
    expect(tweakSaving("Drops landed cost from ~$35 to ~$14/unit, bringing 250 units inside budget.", 38)).toBe(21);
  });

  test("turns a stated cost percentage into dollars each, using the middle of a range", () => {
    expect(tweakSaving("Removes two setups; roughly 20-25% lower unit cost.", 40)).toBeCloseTo(9);
    expect(tweakSaving("Cuts the unit price by 10%.", 30)).toBeCloseTo(3);
  });

  test("never invents a saving from a percentage that isn't about cost", () => {
    expect(tweakSaving("Cuts cycle time 25-35% and eliminates fragile bosses.", 40)).toBeNull();
    expect(tweakSaving("Better pedalboard packing.", 40)).toBeNull();
  });
});

describe("timelineRows", () => {
  const plan = (sample as Project).versions[0].plan as LaunchPlan;

  test("one row per milestone with its date and cost, and today's marker in date order", () => {
    const { rows, todayIndex } = timelineRows(plan, "2026-10-20");
    expect(rows).toHaveLength(plan.milestones.length);
    expect(rows[0]).toMatchObject({ date: "Oct 3", title: plan.milestones[0].title });
    expect(rows[0].cost).toMatch(/^\$[\d,]+(–\$[\d,]+)?$|^No cost$/);
    expect(todayIndex).toBe(rows.findIndex((r) => r.endDate >= "2026-10-20"));
  });

  test("today before everything sits at the top; after everything, at the bottom", () => {
    expect(timelineRows(plan, "2020-01-01").todayIndex).toBe(0);
    expect(timelineRows(plan, "2030-01-01").todayIndex).toBe(plan.milestones.length);
  });
});

describe("avatarTone", () => {
  test("gives each shop the same soft color every time", () => {
    expect(avatarTone("Bitterroot Sheetworks")).toBe(avatarTone("Bitterroot Sheetworks"));
    expect(["green", "amber", "blue", "accent"]).toContain(avatarTone("Ironbark CNC"));
  });
});

describe("listingCopyText", () => {
  test("puts the whole listing in the order Etsy asks for it", () => {
    const listing: EtsyListing = { title: "Clip", description: "Holds a light.", tags: ["bike", "light"], priceUsd: 19, photos: [], generatedAt: "x" } as EtsyListing;
    expect(listingCopyText(listing)).toBe("Clip\n\nPrice: $19.00\n\nHolds a light.\n\nTags: bike, light");
  });
});
