import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * A convenience redirect for the web only: no session cookie on an app path
 * sends you to sign in, and a cookie on an auth page sends you to the
 * dashboard. It checks presence, not validity — every page and endpoint
 * resolves the real session itself. Phase 4 of docs/PORT-PLAN.md deletes this.
 */

const PUBLIC_ROUTES = ["/", "/about", "/contact", "/services", "/team", "/terms", "/privacy", "/login", "/signup", "/merch", "/u"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

function isAuthRoute(pathname: string): boolean {
  return pathname === "/login" || pathname === "/signup";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  // Installed as a PWA: the marketing homepage is skipped in favour of the app.
  const standalone =
    request.headers.get("x-pwa-mode") === "standalone" ||
    request.nextUrl.searchParams.has("pwa") ||
    request.cookies.get("pwa-mode")?.value === "standalone";

  const signedIn = Boolean(getSessionCookie(request));

  if (signedIn) {
    if (isAuthRoute(pathname) || (pathname === "/" && standalone)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/" && standalone) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isPublicRoute(pathname)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
