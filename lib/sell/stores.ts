import { orderLinesFor } from "../orders/lines";
import { planOrder } from "../orders/plan";
import type { EtsyListing, ProjectVersion } from "../types";

// Putting a finished product in a store. Pure: what's unlocked, and the
// store-shaped exports. Nothing here talks to a store.

/**
 * Stores open up once the product is confirmed: the order plan is signed off
 * (and still matches what was signed) and there's a listing to send.
 */
export type StoreReadiness =
  | { ready: true; runQuantity: number }
  | { ready: false; reason: "no_listing" | "not_signed_off" | "sign_off_stale"; message: string; cta: { label: string; href: string } };

export function storeReadiness(projectId: string, version: ProjectVersion): StoreReadiness {
  const base = `/project/${projectId}`;
  const plan = version.analysis ? planOrder(version, orderLinesFor(version)) : null;
  if (!plan?.signedOff) {
    const stale = Boolean(plan?.signOffStale);
    return {
      ready: false,
      reason: stale ? "sign_off_stale" : "not_signed_off",
      message: stale
        ? "The order plan changed after you approved it. Approve it again to put this product in a store."
        : "Approve the order plan first. Stores open up once the product is confirmed: its parts, suppliers and assembly are signed off.",
      cta: { label: stale ? "Review the order plan" : "Open the order plan", href: `${base}/make#order-heading` },
    };
  }
  if (!version.listing) {
    return { ready: false, reason: "no_listing", message: "Write the listing first: every store gets its title, description, tags, price and photos.", cta: { label: "Write the listing", href: `${base}/sell` } };
  }
  return { ready: true, runQuantity: plan.runQuantity };
}

/** A URL-safe product handle, as Shopify builds them. */
export function productHandle(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/, "") || "product"
  );
}

const escapeHtml = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Plain listing text as simple HTML paragraphs (Shopify's description field is HTML). */
export function descriptionHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

/** Quotes a cell, and defuses anything a spreadsheet would read as a formula. */
function csvCell(value: string | number | undefined): string {
  if (value === undefined) return "";
  let s = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

// Shopify's product CSV (Products > Import). These are its long-standing
// column names, which the importer still accepts; photos aren't included
// because Shopify fetches them from public URLs and these renders are
// private, so the creator adds them in the product editor.
export const SHOPIFY_CSV_HEADER = [
  "Handle",
  "Title",
  "Body (HTML)",
  "Vendor",
  "Type",
  "Tags",
  "Published",
  "Option1 Name",
  "Option1 Value",
  "Variant Inventory Qty",
  "Variant Price",
  "Variant Requires Shipping",
  "Variant Taxable",
  "Cost per item",
  "Status",
] as const;

export type ShopifyCsvOptions = { vendor: string; inventory?: number; unitCostUsd?: number };

/** One Shopify product, as a draft (Published FALSE, Status draft), ready for Products > Import. */
export function shopifyProductCsv(listing: EtsyListing, { vendor, inventory, unitCostUsd }: ShopifyCsvOptions): string {
  const row: (string | number | undefined)[] = [
    productHandle(listing.title),
    listing.title,
    descriptionHtml(listing.description),
    vendor,
    "",
    listing.tags.join(", "),
    "FALSE",
    "Title",
    "Default Title",
    inventory,
    listing.priceUsd.toFixed(2),
    "TRUE",
    "TRUE",
    unitCostUsd === undefined ? undefined : unitCostUsd.toFixed(2),
    "draft",
  ];
  return "﻿" + [[...SHOPIFY_CSV_HEADER], row].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

// Amazon's own limits for the fields a creator pastes into "Add a product".
export const AMAZON_TITLE_MAX = 200;
export const AMAZON_SEARCH_TERMS_MAX_BYTES = 249;

/** The listing reshaped for Amazon's form: its title, description and backend search terms (space-separated, byte-limited). */
export function amazonFields(listing: EtsyListing): { title: string; description: string; searchTerms: string } {
  const titleWords = new Set(listing.title.toLowerCase().split(/\W+/));
  const words: string[] = [];
  for (const tag of listing.tags) {
    for (const w of tag.toLowerCase().split(/\s+/)) {
      if (w && !titleWords.has(w) && !words.includes(w)) words.push(w);
    }
  }
  let searchTerms = "";
  for (const w of words) {
    const next = searchTerms ? `${searchTerms} ${w}` : w;
    if (new TextEncoder().encode(next).length > AMAZON_SEARCH_TERMS_MAX_BYTES) break;
    searchTerms = next;
  }
  return { title: listing.title.slice(0, AMAZON_TITLE_MAX), description: listing.description, searchTerms };
}

/** The stored file name behind one of this project's render URLs (/api/files/<id>/<file>?v=…), or null. */
export function photoFileName(projectId: string, url: string): string | null {
  const m = /^\/api\/files\/([^/]+)\/([^/?#]+)/.exec(url);
  return m && m[1] === projectId ? decodeURIComponent(m[2]) : null;
}
