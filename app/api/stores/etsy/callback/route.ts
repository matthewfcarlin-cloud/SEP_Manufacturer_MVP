import { NextResponse } from "next/server";
import { etsyConfig, etsyRedirectUri } from "@/lib/sell/etsy";
import { EtsyError, exchangeEtsyCode, lookUpEtsyShop } from "@/lib/sell/etsyClient";
import { decodePending, ETSY_OAUTH_COOKIE, ETSY_OAUTH_COOKIE_PATH, requestOrigin, storeWorkspaceOrFail } from "@/lib/sell/etsyRoutes";
import { saveEtsyConnection } from "@/lib/sell/etsyStore";

/** Etsy sends the seller back here after the consent screen. Saves the connection, then returns to the Sell screen. */
export async function GET(request: Request): Promise<Response> {
  const origin = requestOrigin(request);
  const url = new URL(request.url);
  const cookieValue = request.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${ETSY_OAUTH_COOKIE}=`))
    ?.slice(ETSY_OAUTH_COOKIE.length + 1);
  const pending = decodePending(cookieValue);
  const back = (result: string) => {
    const response = NextResponse.redirect(new URL(`${pending?.returnTo ?? "/studio"}?etsy=${result}`, origin));
    response.cookies.set({ name: ETSY_OAUTH_COOKIE, value: "", path: ETSY_OAUTH_COOKIE_PATH, maxAge: 0 });
    return response;
  };

  const config = etsyConfig();
  if (!config) return back("not_configured");
  if (!pending || url.searchParams.get("state") !== pending.state) return back("expired");
  if (url.searchParams.get("error")) return back("declined");
  const code = url.searchParams.get("code");
  if (!code) return back("expired");
  const workspaceId = await storeWorkspaceOrFail();
  if (workspaceId instanceof Response) return back("error");

  try {
    const tokens = await exchangeEtsyCode(config, code, pending.verifier, etsyRedirectUri(config, origin));
    const shop = await lookUpEtsyShop(config, tokens);
    await saveEtsyConnection(workspaceId, { ...shop, connectedAt: new Date().toISOString() }, tokens);
    return back("connected");
  } catch (err) {
    if (err instanceof EtsyError && err.status === 422) return back("no_shop");
    console.error("[api/stores/etsy/callback] connection failed", err instanceof Error ? err.name : typeof err);
    return back("error");
  }
}
