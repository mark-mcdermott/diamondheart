import { defineMiddleware } from "astro:middleware";
import { isNativeOrigin } from "@/lib/server/origins";

/**
 * CORS for the bundled native builds, and nothing else.
 *
 * The applet inside Capacitor or Tauri is a different origin from the site, so
 * every API call it makes is cross-origin: the browser preflights the ones that
 * carry `Authorization` or a JSON body, and hides response headers it was not
 * told to expose — `set-auth-token`, which the bearer session depends on. Only
 * the origins in `NATIVE_ORIGINS` are answered. Credentials are allowed for
 * them because the auth client fetches with `credentials: "include"` and WebKit
 * fails a preflight that does not say so; the token, not a cookie, is still
 * what those builds authenticate with, Better Auth trusts the same origins, and
 * Astro's own origin check on form-encoded mutations stays on.
 */
const ALLOW_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const DEFAULT_ALLOW_HEADERS = "Authorization, Content-Type";
const EXPOSE_HEADERS = "set-auth-token";
const PREFLIGHT_MAX_AGE = "86400";

function corsHeaders(origin: string, into: Headers): Headers {
  into.set("Access-Control-Allow-Origin", origin);
  into.set("Access-Control-Allow-Credentials", "true");
  into.set("Access-Control-Expose-Headers", EXPOSE_HEADERS);
  into.append("Vary", "Origin");
  return into;
}

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
  const origin = request.headers.get("origin");
  if (!url.pathname.startsWith("/api/") || !isNativeOrigin(origin)) return next();

  if (request.method === "OPTIONS") {
    const headers = corsHeaders(origin, new Headers());
    headers.set("Access-Control-Allow-Methods", ALLOW_METHODS);
    headers.set("Access-Control-Allow-Headers", request.headers.get("access-control-request-headers") ?? DEFAULT_ALLOW_HEADERS);
    headers.set("Access-Control-Max-Age", PREFLIGHT_MAX_AGE);
    return new Response(null, { status: 204, headers });
  }

  const response = await next();
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: corsHeaders(origin, new Headers(response.headers)),
  });
});
