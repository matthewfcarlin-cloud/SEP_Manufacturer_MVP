import { NextResponse, type NextRequest } from "next/server";
import { isValidOwnerKey, newOwnerKey, OWNER_COOKIE, OWNER_COOKIE_MAX_AGE_S } from "./lib/ownerKey";

/**
 * Gives every browser an owner key on its first request, so the projects it
 * creates are private to it. The key is also forwarded on this request, so a
 * page rendered right now already sees it.
 */
export function proxy(request: NextRequest) {
  if (isValidOwnerKey(request.cookies.get(OWNER_COOKIE)?.value)) return NextResponse.next();

  const key = newOwnerKey();
  const headers = new Headers(request.headers);
  const existing = headers.get("cookie");
  headers.set("cookie", `${existing ? `${existing}; ` : ""}${OWNER_COOKIE}=${key}`);

  const response = NextResponse.next({ request: { headers } });
  response.cookies.set({
    name: OWNER_COOKIE,
    value: key,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OWNER_COOKIE_MAX_AGE_S,
  });
  return response;
}

export const config = {
  // Everything except static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|models/).*)"],
};
