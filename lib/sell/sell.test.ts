import { describe, expect, test } from "vitest";
import { listingDraftSchema } from "../schemas";
import { etsySale } from "./fees";

const tags = ["pedal enclosure", "125b enclosure", "guitar pedal", "fuzz pedal", "diy pedal kit", "aluminum enclosure", "stompbox", "pedal builder", "guitar gear", "effects pedal", "boutique pedal", "powder coated", "pedal parts"];
const description = "A pre-drilled 125B aluminum enclosure for boutique fuzz pedals. ".repeat(8);

describe("listingDraftSchema", () => {
  test("accepts a listing within Etsy's limits", () => {
    expect(listingDraftSchema.safeParse({ title: "Pre-drilled 125B pedal enclosure", description, tags }).success).toBe(true);
  });

  test("rejects a title over 140 characters, the wrong tag count, long or repeated tags", () => {
    expect(listingDraftSchema.safeParse({ title: "x".repeat(141), description, tags }).success).toBe(false);
    expect(listingDraftSchema.safeParse({ title: "t", description, tags: tags.slice(0, 12) }).success).toBe(false);
    expect(listingDraftSchema.safeParse({ title: "t", description, tags: [...tags.slice(0, 12), "a tag that is far too long"] }).success).toBe(false);
    expect(listingDraftSchema.safeParse({ title: "t", description, tags: [...tags.slice(0, 12), "Stompbox"] }).success).toBe(false);
  });
});

describe("etsySale", () => {
  test("takes Etsy's listing, transaction and payment fees off the price", () => {
    // $0.20 + $32 × 9.5% + $0.25 = $3.49
    expect(etsySale(32)).toEqual({ feesUsd: 3.49, afterFeesUsd: 28.51 });
  });

  test("gives profit per sale as a range after the estimated unit cost", () => {
    expect(etsySale(32, { low: 20, high: 25 }).profitUsd).toEqual({ low: 3.51, high: 8.51 });
  });
});
