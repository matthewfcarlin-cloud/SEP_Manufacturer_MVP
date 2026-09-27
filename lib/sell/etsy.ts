import type { EtsyListing } from "../types";

// Etsy Open API v3, the pure half: config, OAuth (PKCE) URLs and the draft
// listing request. lib/sell/etsyClient.ts makes the calls.
//
// Etsy's rules this follows (developers.etsy.com, checked 2026-09-27):
// - Every call sends `x-api-key: <keystring>:<shared secret>`.
// - OAuth 2.0 authorization code + PKCE (S256). Access tokens last an hour,
//   refresh tokens 90 days. The access token starts with the user's id.
// - createDraftListing (POST /v3/application/shops/{shop_id}/listings,
//   form-encoded) makes a *draft*: nothing is live until the seller
//   publishes it on Etsy. Physical listings need a shipping profile.
// - An app with personal access works for its developer's own shop. Using
//   it for other sellers' shops needs Etsy's commercial access review.

export const ETSY_API = "https://api.etsy.com/v3";
export const ETSY_AUTHORIZE_URL = "https://www.etsy.com/oauth/connect";
export const ETSY_TOKEN_URL = `${ETSY_API}/public/oauth/token`;
export const ETSY_SCOPES = ["listings_r", "listings_w", "shops_r"] as const;
export const ETSY_MAX_QUANTITY = 999;
export const ETSY_MAX_PHOTOS = 10;

export const WHO_MADE = ["i_did", "collective", "someone_else"] as const;
export type WhoMade = (typeof WHO_MADE)[number];
export const WHO_MADE_LABELS: Record<WhoMade, string> = {
  i_did: "I did",
  collective: "A member of my shop",
  someone_else: "Another company or person",
};

// Etsy's current "when was it made" buckets for new items. Etsy renames the
// decade bucket as years pass; update it when its API does.
export const WHEN_MADE = ["made_to_order", "2020_2026"] as const;
export type WhenMade = (typeof WHEN_MADE)[number];
export const WHEN_MADE_LABELS: Record<WhenMade, string> = {
  made_to_order: "Made to order",
  "2020_2026": "Made recently (2020 to 2026)",
};

export type EtsyConfig = { keystring: string; sharedSecret: string; redirectUri?: string };

/** The app's Etsy credentials from the environment, or null until they're set up. */
export function etsyConfig(env: Record<string, string | undefined> = process.env): EtsyConfig | null {
  const keystring = env.ETSY_API_KEYSTRING?.trim();
  const sharedSecret = env.ETSY_SHARED_SECRET?.trim();
  if (!keystring || !sharedSecret) return null;
  const redirectUri = env.ETSY_REDIRECT_URI?.trim();
  return { keystring, sharedSecret, ...(redirectUri && { redirectUri }) };
}

export const etsyApiKeyHeader = (config: EtsyConfig) => `${config.keystring}:${config.sharedSecret}`;

/** Where Etsy sends the seller back: ETSY_REDIRECT_URI if set, else this site's callback route. Must match the app's registered URL exactly. */
export function etsyRedirectUri(config: EtsyConfig, origin: string): string {
  return config.redirectUri ?? `${origin.replace(/\/+$/, "")}/api/stores/etsy/callback`;
}

const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** PKCE S256 challenge for a verifier. */
export async function pkceChallenge(verifier: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}

export function etsyAuthorizeUrl(config: EtsyConfig, redirectUri: string, state: string, challenge: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.keystring,
    redirect_uri: redirectUri,
    scope: ETSY_SCOPES.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  // Spaces as %20, as Etsy's docs show, rather than URLSearchParams' "+".
  return `${ETSY_AUTHORIZE_URL}?${params.toString().replaceAll("+", "%20")}`;
}

/** Etsy access tokens start with the user's numeric id and a dot. */
export function etsyUserIdFromToken(accessToken: string): string | null {
  const id = accessToken.split(".")[0];
  return /^\d+$/.test(id) ? id : null;
}

/** Only same-site product screens are allowed as the place to come back to after connecting. */
export function safeReturnTo(value: string | null | undefined): string {
  return value && /^\/project\/[A-Za-z0-9_-]+\/sell$/.test(value) ? value : "/studio";
}

export type EtsyDraftChoices = {
  taxonomyId: number;
  shippingProfileId: number;
  whoMade: WhoMade;
  whenMade: WhenMade;
  quantity: number;
};

/** The createDraftListing body: the listing's copy and price, plus the seller's choices. A draft, never live. */
export function etsyDraftForm(listing: EtsyListing, choices: EtsyDraftChoices): URLSearchParams {
  const quantity = Math.min(ETSY_MAX_QUANTITY, Math.max(1, Math.round(choices.quantity)));
  return new URLSearchParams({
    quantity: String(quantity),
    title: listing.title,
    description: listing.description,
    price: listing.priceUsd.toFixed(2),
    who_made: choices.whoMade,
    when_made: choices.whenMade,
    taxonomy_id: String(choices.taxonomyId),
    shipping_profile_id: String(choices.shippingProfileId),
    type: "physical",
    is_supply: "false",
    should_auto_renew: "false",
    // Array fields go form-encoded as a comma-separated list.
    tags: listing.tags.join(","),
  });
}

/** Opens the draft in Etsy's own listing editor, where the seller reviews and publishes it. */
export const etsyEditorUrl = (listingId: string) => `https://www.etsy.com/your/shops/me/listing-editor/edit/${encodeURIComponent(listingId)}`;

export type EtsyTaxonomyNode = { id: number; name: string; children?: EtsyTaxonomyNode[] };
export type EtsyCategory = { id: number; path: string };

/** Etsy's seller taxonomy as leaf categories with their full path ("Home & Living > Office > Desk Organizers"), sorted. */
export function flattenTaxonomy(nodes: readonly EtsyTaxonomyNode[], prefix = ""): EtsyCategory[] {
  const out: EtsyCategory[] = [];
  for (const node of nodes) {
    const path = prefix ? `${prefix} > ${node.name}` : node.name;
    if (node.children?.length) out.push(...flattenTaxonomy(node.children, path));
    else out.push({ id: node.id, path });
  }
  return prefix ? out : out.sort((a, b) => a.path.localeCompare(b.path));
}
