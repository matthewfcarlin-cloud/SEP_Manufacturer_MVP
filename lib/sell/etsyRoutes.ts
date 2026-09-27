import { fail } from "../api";
import { currentOwnerHash } from "../access";
import { EtsyError } from "./etsyClient";

// Shared by the /api/stores/etsy routes.

export const ETSY_OAUTH_COOKIE = "moko_etsy_oauth";
export const ETSY_OAUTH_COOKIE_PATH = "/api/stores/etsy";
export const ETSY_OAUTH_MAX_AGE_S = 10 * 60;

export type EtsyOAuthPending = { state: string; verifier: string; returnTo: string };

export const encodePending = (p: EtsyOAuthPending) => Buffer.from(JSON.stringify(p)).toString("base64url");

export function decodePending(value: string | undefined): EtsyOAuthPending | null {
  if (!value) return null;
  try {
    const p = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<EtsyOAuthPending>;
    return typeof p.state === "string" && typeof p.verifier === "string" && typeof p.returnTo === "string" ? (p as EtsyOAuthPending) : null;
  } catch {
    return null;
  }
}

/** This site's public origin, honoring the host's proxy headers (Railway terminates TLS in front of the app). */
export function requestOrigin(request: Request): string {
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const host = request.headers.get("x-forwarded-host")?.split(",")[0].trim() ?? request.headers.get("host");
  return proto && host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function storeWorkspaceOrFail(): Promise<string | Response> {
  return (await currentOwnerHash()) ?? fail("Enable cookies for this site to connect a store.", 400);
}

export const etsyNotConfigured = () =>
  fail("Etsy isn't set up on this server yet: it needs ETSY_API_KEYSTRING and ETSY_SHARED_SECRET from a registered Etsy app.", 503);

/** An Etsy failure as an API response; anything else is logged by name only. */
export function etsyFailure(err: unknown, where: string): Response {
  if (err instanceof EtsyError) return fail(err.message, err.status);
  console.error(`[${where}] unexpected error`, err instanceof Error ? err.name : typeof err);
  return fail("Something went wrong talking to Etsy. Please try again.", 500);
}
