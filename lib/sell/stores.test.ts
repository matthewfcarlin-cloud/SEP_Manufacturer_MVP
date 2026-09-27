import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";
import bracketRaw from "@/demo/bracket-project.json";
import { orderLinesFor } from "../orders/lines";
import { applyOrderOp } from "../orders/ops";
import type { OrderOp } from "../orders/schemas";
import type { EtsyListing, Project, ProjectVersion } from "../types";
import {
  etsyAuthorizeUrl,
  etsyConfig,
  etsyDraftForm,
  etsyRedirectUri,
  etsyUserIdFromToken,
  flattenTaxonomy,
  pkceChallenge,
  safeReturnTo,
} from "./etsy";
import { AMAZON_SEARCH_TERMS_MAX_BYTES, amazonFields, descriptionHtml, photoFileName, productHandle, SHOPIFY_CSV_HEADER, shopifyProductCsv, storeReadiness } from "./stores";

const bracket = bracketRaw as Project;
/** The bracket's v2 as one part (seeded BOM removed), with its chosen demo quote. */
const v2: ProjectVersion = { ...bracket.versions[1], bom: undefined };

function withOps(version: ProjectVersion, ...ops: OrderOp[]): ProjectVersion {
  const lines = orderLinesFor(version);
  return ops.reduce((v, op) => {
    const r = applyOrderOp(v, op, { now: "2026-09-27T12:00:00.000Z", newId: () => "m1", lines });
    if (!r.ok) throw new Error(r.error);
    return { ...v, order: r.order };
  }, version);
}

const listing: EtsyListing = {
  title: "Sheet-metal phone charger bracket, under-desk mount",
  description: "Holds a charger under your desk.\n\nPowder-coated steel & <no> tools.",
  tags: ["charger mount", "desk bracket", "cable organizer", "under desk", "steel bracket", "phone charger", "desk setup", "office decor", "wfh", "cord holder", "minimalist", "gift for him", "tech gift"],
  priceUsd: 24,
  photos: ["/api/files/abc123/v2-render-0.png?v=1", "/api/files/other/render-1.png"],
  generatedAt: "2026-09-27T12:00:00.000Z",
};

describe("storeReadiness", () => {
  test("is locked until the order plan is signed off, and points at the plan", () => {
    const r = storeReadiness(bracket.id, { ...v2, listing });
    expect(r.ready).toBe(false);
    if (!r.ready) {
      expect(r.reason).toBe("not_signed_off");
      expect(r.cta.href).toBe(`/project/${bracket.id}/make#order-heading`);
    }
  });

  test("opens once signed off with a listing, carrying the run size", () => {
    const signed = withOps({ ...v2, listing }, { op: "signOff" });
    expect(storeReadiness(bracket.id, signed)).toEqual({ ready: true, runQuantity: signed.order!.runQuantity });
  });

  test("locks again when the plan changes after sign-off", () => {
    const changed = withOps({ ...v2, listing }, { op: "signOff" }, { op: "setRun", runQuantity: 777 });
    const r = storeReadiness(bracket.id, changed);
    expect(r.ready || r.reason).toBe("sign_off_stale");
  });

  test("needs a listing even after sign-off", () => {
    const r = storeReadiness(bracket.id, withOps({ ...v2, listing: undefined }, { op: "signOff" }));
    expect(r.ready || r.reason).toBe("no_listing");
  });
});

describe("Shopify CSV", () => {
  test("one draft product with price, tags, stock and cost, formula-safe", () => {
    const csv = shopifyProductCsv(listing, { vendor: "=Moko", inventory: 500, unitCostUsd: 7.5 });
    const [header, row] = csv.replace("﻿", "").trim().split("\r\n");
    expect(header).toBe(SHOPIFY_CSV_HEADER.join(","));
    expect(row.startsWith("sheet-metal-phone-charger-bracket-under-desk-mount,")).toBe(true);
    expect(row).toContain("'=Moko");
    expect(row).toContain(",FALSE,Title,Default Title,500,24.00,TRUE,TRUE,7.50,draft");
    expect(row).toContain('"charger mount, desk bracket,');
  });

  test("description becomes escaped HTML paragraphs; handles are URL-safe", () => {
    expect(descriptionHtml(listing.description)).toBe("<p>Holds a charger under your desk.</p><p>Powder-coated steel &amp; &lt;no&gt; tools.</p>");
    expect(productHandle("Café  Pedal — 125B!")).toBe("cafe-pedal-125b");
    expect(productHandle("!!!")).toBe("product");
  });
});

describe("Amazon fields", () => {
  test("search terms skip words already in the title and fit Amazon's byte limit", () => {
    const f = amazonFields(listing);
    expect(f.searchTerms.split(" ")).not.toContain("charger");
    expect(f.searchTerms).toContain("organizer");
    expect(new TextEncoder().encode(f.searchTerms).length).toBeLessThanOrEqual(AMAZON_SEARCH_TERMS_MAX_BYTES);
  });
});

describe("photoFileName", () => {
  test("only this project's render files", () => {
    expect(photoFileName("abc123", listing.photos[0])).toBe("v2-render-0.png");
    expect(photoFileName("abc123", listing.photos[1])).toBeNull();
    expect(photoFileName("abc123", "https://evil.example/api/files/abc123/render-0.png")).toBeNull();
  });
});

describe("Etsy", () => {
  const config = { keystring: "key123", sharedSecret: "shh" };

  test("config needs both the keystring and shared secret", () => {
    expect(etsyConfig({ ETSY_API_KEYSTRING: "k" })).toBeNull();
    expect(etsyConfig({ ETSY_API_KEYSTRING: " k ", ETSY_SHARED_SECRET: "s" })).toEqual({ keystring: "k", sharedSecret: "s" });
  });

  test("authorize URL uses PKCE S256, the listing scopes and the callback", async () => {
    const redirect = etsyRedirectUri(config, "https://moko.example/");
    expect(redirect).toBe("https://moko.example/api/stores/etsy/callback");
    const url = new URL(etsyAuthorizeUrl(config, redirect, "st", await pkceChallenge("verifier")));
    expect(url.origin + url.pathname).toBe("https://www.etsy.com/oauth/connect");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ client_id: "key123", redirect_uri: redirect, state: "st", code_challenge_method: "S256", scope: "listings_r listings_w shops_r" });
    // base64url(SHA-256(verifier)), no padding.
    expect(await pkceChallenge("verifier")).toBe(createHash("sha256").update("verifier").digest("base64url"));
  });

  test("the draft form carries the listing and the seller's picks, quantity clamped to Etsy's 999", () => {
    const form = etsyDraftForm(listing, { taxonomyId: 1234, shippingProfileId: 55, whoMade: "someone_else", whenMade: "made_to_order", quantity: 5000 });
    expect(Object.fromEntries(form)).toMatchObject({
      quantity: "999",
      title: listing.title,
      price: "24.00",
      taxonomy_id: "1234",
      shipping_profile_id: "55",
      who_made: "someone_else",
      when_made: "made_to_order",
      type: "physical",
      is_supply: "false",
    });
    expect(form.get("tags")!.split(",")).toHaveLength(13);
  });

  test("taxonomy flattens to sorted leaf paths", () => {
    const flat = flattenTaxonomy([
      { id: 1, name: "Home", children: [{ id: 3, name: "Office", children: [{ id: 4, name: "Desk Organizers" }] }, { id: 5, name: "Decor" }] },
      { id: 2, name: "Art" },
    ]);
    expect(flat).toEqual([
      { id: 2, path: "Art" },
      { id: 5, path: "Home > Decor" },
      { id: 4, path: "Home > Office > Desk Organizers" },
    ]);
  });

  test("user id comes from the token prefix; return paths are limited to Sell screens", () => {
    expect(etsyUserIdFromToken("12345678.abc")).toBe("12345678");
    expect(etsyUserIdFromToken("abc")).toBeNull();
    expect(safeReturnTo("/project/yAeM9-RDOE/sell")).toBe("/project/yAeM9-RDOE/sell");
    expect(safeReturnTo("https://evil.example/")).toBe("/studio");
    expect(safeReturnTo("//evil.example/project/x/sell")).toBe("/studio");
  });
});
