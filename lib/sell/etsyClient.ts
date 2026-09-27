import { etsyApiKeyHeader, ETSY_API, ETSY_TOKEN_URL, etsyUserIdFromToken, flattenTaxonomy, type EtsyCategory, type EtsyConfig, type EtsyTaxonomyNode } from "./etsy";
import { readEtsyTokens, saveEtsyConnection, type EtsyConnection, type EtsyTokens } from "./etsyStore";

// Server-only calls to Etsy's Open API v3. Error messages are fixed and safe
// to show; Etsy's own error text is logged by status only, never a token.

/** An Etsy call failed. `message` is written for the creator. */
export class EtsyError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly needsReconnect = false,
  ) {
    super(message);
    this.name = "EtsyError";
  }
}

const REFRESH_MARGIN_MS = 60_000;

async function tokenRequest(config: EtsyConfig, form: Record<string, string>): Promise<EtsyTokens> {
  const res = await fetch(ETSY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.keystring, ...form }),
  });
  if (!res.ok) {
    console.warn(`[etsy] token request failed: ${res.status}`);
    throw new EtsyError("Etsy didn't accept the connection. Connect your shop again.", 401, true);
  }
  const json = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
  return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresAt: Date.now() + json.expires_in * 1000 };
}

export const exchangeEtsyCode = (config: EtsyConfig, code: string, verifier: string, redirectUri: string) =>
  tokenRequest(config, { grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: redirectUri });

async function etsyFetch<T>(config: EtsyConfig, accessToken: string | null, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("x-api-key", etsyApiKeyHeader(config));
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  let res: Response;
  try {
    res = await fetch(`${ETSY_API}${path}`, { ...init, headers });
  } catch {
    throw new EtsyError("Couldn't reach Etsy. Try again in a minute.", 503);
  }
  if (res.ok) return (await res.json()) as T;
  console.warn(`[etsy] ${init.method ?? "GET"} ${path.replace(/\d+/g, ":id")} failed: ${res.status}`);
  if (res.status === 401) throw new EtsyError("Etsy signed this shop out. Connect it again.", 401, true);
  if (res.status === 403) throw new EtsyError("Etsy didn't allow that. The app may need listing permissions, or Etsy's commercial access for shops other than the developer's own.", 403);
  if (res.status === 429) throw new EtsyError("Etsy is rate-limiting requests. Try again in a minute.", 429);
  if (res.status === 400) {
    // Etsy's validation messages name the field (price, taxonomy, shipping profile) and carry no secrets.
    const detail = await res.json().then((j: { error?: unknown }) => (typeof j.error === "string" ? j.error : ""), () => "");
    throw new EtsyError(`Etsy rejected the listing${detail ? `: ${detail.slice(0, 300)}` : "."}`, 400);
  }
  throw new EtsyError("Etsy had a problem. Try again in a minute.", 502);
}

/** After OAuth: who connected and which shop is theirs. */
export async function lookUpEtsyShop(config: EtsyConfig, tokens: EtsyTokens): Promise<Omit<EtsyConnection, "connectedAt">> {
  const me = await etsyFetch<{ user_id: number; shop_id?: number | null }>(config, tokens.accessToken, "/application/users/me");
  if (!me.shop_id) throw new EtsyError("This Etsy account doesn't have a shop yet. Open one on Etsy, then connect again.", 422);
  const shop = await etsyFetch<{ shop_name: string }>(config, tokens.accessToken, `/application/shops/${me.shop_id}`);
  return { userId: etsyUserIdFromToken(tokens.accessToken) ?? String(me.user_id), shopId: me.shop_id, shopName: shop.shop_name };
}

/** The workspace's connection with a fresh access token (refreshed and re-saved when it's about to expire). */
export async function etsySession(config: EtsyConfig, workspaceId: string): Promise<{ connection: EtsyConnection; accessToken: string }> {
  const stored = await readEtsyTokens(workspaceId);
  if (!stored) throw new EtsyError("Connect your Etsy shop first.", 409, true);
  const { tokens, ...connection } = stored;
  if (tokens.expiresAt - REFRESH_MARGIN_MS > Date.now()) return { connection, accessToken: tokens.accessToken };
  const fresh = await tokenRequest(config, { grant_type: "refresh_token", refresh_token: tokens.refreshToken });
  await saveEtsyConnection(workspaceId, connection, fresh);
  return { connection, accessToken: fresh.accessToken };
}

export type EtsyShippingProfile = { id: number; title: string };

export async function listShippingProfiles(config: EtsyConfig, accessToken: string, shopId: number): Promise<EtsyShippingProfile[]> {
  const json = await etsyFetch<{ results: { shipping_profile_id: number; title: string }[] }>(config, accessToken, `/application/shops/${shopId}/shipping_profiles`);
  return json.results.map((p) => ({ id: p.shipping_profile_id, title: p.title }));
}

// The seller taxonomy is the same for everyone and changes rarely.
let taxonomyCache: { at: number; categories: EtsyCategory[] } | null = null;
const TAXONOMY_TTL_MS = 24 * 60 * 60 * 1000;

export async function sellerCategories(config: EtsyConfig): Promise<EtsyCategory[]> {
  if (taxonomyCache && Date.now() - taxonomyCache.at < TAXONOMY_TTL_MS) return taxonomyCache.categories;
  const json = await etsyFetch<{ results: EtsyTaxonomyNode[] }>(config, null, "/application/seller-taxonomy/nodes");
  taxonomyCache = { at: Date.now(), categories: flattenTaxonomy(json.results) };
  return taxonomyCache.categories;
}

/** Creates a draft listing in the seller's shop. Etsy never shows a draft to buyers. */
export async function createEtsyDraft(config: EtsyConfig, accessToken: string, shopId: number, form: URLSearchParams): Promise<{ listingId: string }> {
  const json = await etsyFetch<{ listing_id: number }>(config, accessToken, `/application/shops/${shopId}/listings`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  return { listingId: String(json.listing_id) };
}

export async function uploadEtsyImage(config: EtsyConfig, accessToken: string, shopId: number, listingId: string, png: Uint8Array, name: string, rank: number): Promise<void> {
  const body = new FormData();
  body.set("image", new Blob([png as BlobPart], { type: "image/png" }), name);
  body.set("rank", String(rank));
  await etsyFetch(config, accessToken, `/application/shops/${shopId}/listings/${listingId}/images`, { method: "POST", body });
}
