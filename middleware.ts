import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, SignJWT } from "jose";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET);
const SESSION_COOKIE = "session";
const SESSION_DURATION = 60 * 60 * 24 * 30;

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/contact",
  "/services",
  "/team",
  "/terms",
  "/privacy",
  "/login",
  "/signup",
  "/merch",
  "/u",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function isAuthRoute(pathname: string): boolean {
  return ["/login", "/signup"].some((route) => pathname === route);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files, images, favicon, API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let session: { sub?: string } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      session = payload;
    } catch {
      session = null;
    }
  }

  // Refresh session if valid
  if (session?.sub) {
    const response = NextResponse.next();
    try {
      const newToken = await new SignJWT({ sub: session.sub })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${SESSION_DURATION}s`)
        .sign(SECRET);
      response.cookies.set(SESSION_COOKIE, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_DURATION,
        path: "/",
      });

      // Redirect authenticated users away from auth pages
      if (isAuthRoute(pathname)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      return response;
    } catch {
      // Token refresh failed, treat as unauthenticated
    }
  }

  // Unauthenticated — allow public routes, block everything else
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Redirect to login
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
