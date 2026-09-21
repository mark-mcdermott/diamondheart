/**
 * Which build this is. The web build serves the applet from the same origin
 * as the API, with a cookie session. The native bundle (Capacitor, Tauri) is
 * static files on a local origin talking to `API_BASE` with a bearer token
 * (docs/PORT-PLAN.md, Decision 9); it has no public pages of its own.
 */
export const NATIVE = import.meta.env.NEXT_PUBLIC_NATIVE === "1";

/** A path on the site, made absolute for the bundle, left alone on the web. */
export function siteUrl(path: string, apiBase: string): string {
  return NATIVE ? `${apiBase}${path}` : path;
}
