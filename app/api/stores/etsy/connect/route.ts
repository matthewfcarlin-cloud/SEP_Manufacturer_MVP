import { NextResponse } from "next/server";
import { etsyAuthorizeUrl, etsyConfig, etsyRedirectUri, pkceChallenge, randomToken, safeReturnTo } from "@/lib/sell/etsy";
import { encodePending, ETSY_OAUTH_COOKIE, ETSY_OAUTH_COOKIE_PATH, ETSY_OAUTH_MAX_AGE_S, requestOrigin, storeWorkspaceOrFail } from "@/lib/sell/etsyRoutes";

/** Starts "Connect Etsy shop": sends the browser to Etsy's consent screen (OAuth 2.0 with PKCE). */
export async function GET(request: Request): Promise<Response> {
  const workspace = await storeWorkspaceOrFail();
  if (workspace instanceof Response) return workspace;
  const origin = requestOrigin(request);
  const returnTo = safeReturnTo(new URL(request.url).searchParams.get("returnTo"));
  const config = etsyConfig();
  if (!config) return NextResponse.redirect(new URL(`${returnTo}?etsy=not_configured`, origin));

  const state = randomToken(24);
  const verifier = randomToken(48);
  const response = NextResponse.redirect(etsyAuthorizeUrl(config, etsyRedirectUri(config, origin), state, await pkceChallenge(verifier)));
  response.cookies.set({
    name: ETSY_OAUTH_COOKIE,
    value: encodePending({ state, verifier, returnTo }),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: ETSY_OAUTH_COOKIE_PATH,
    maxAge: ETSY_OAUTH_MAX_AGE_S,
  });
  return response;
}
