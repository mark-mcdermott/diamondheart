/**
 * The dashboard's top-level paths: everything the applet owns. One Astro page
 * per entry mounts the applet (`src/pages/<section>/[...slug].astro`), so a real
 * 404 stays a real 404 elsewhere, and the link shim uses the same list to tell a
 * client-side route change from a full navigation.
 */
export const APP_SECTIONS = [
  "dashboard",
  "metrics",
  "entry",
  "food",
  "settings",
  "account",
  "meditate",
  "tracking",
  "medical",
  "appointments",
  "entertainment",
  "workout",
  "records",
  "finances",
  "feed",
  "notifications",
] as const;

export function isAppletPath(href: string): boolean {
  const path = href.split(/[?#]/)[0];
  return APP_SECTIONS.some((section) => path === `/${section}` || path.startsWith(`/${section}/`));
}
