import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * RF-01. Optimistic redirect only: no session cookie means no access, so send the
 * user to /login and remember where they were going. The cookie is not validated
 * here. Real checks happen in the data layer and server actions (src/lib/session.ts).
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const login = new URL("/login", request.url);
  if (pathname !== "/" && pathname !== "/panel") {
    login.searchParams.set("next", `${pathname}${search}`);
  }
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except the login screen, the auth API, Next internals and static files
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
