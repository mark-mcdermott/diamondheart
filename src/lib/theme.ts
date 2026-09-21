import { atom } from "nanostores";

/**
 * The colour scheme, without a framework. The choice lives in localStorage under
 * `theme` as light, dark or system and is applied as a class on `<html>`; both
 * predate the port and are kept so nobody's preference resets.
 */

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_KEY = "theme";

/** Inlined in `<head>` so the first paint already has the right ground. */
export const THEME_BOOT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_KEY)});var d=s==="dark"||((s!=="light")&&matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;c.toggle("dark",d);c.toggle("light",!d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export const $theme = atom<Theme>("system");

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): ResolvedTheme {
  const resolved = resolveTheme(theme);
  const classes = document.documentElement.classList;
  classes.toggle("dark", resolved === "dark");
  classes.toggle("light", resolved === "light");
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private browsing or blocked storage: the theme still applies for this page.
  }
  $theme.set(theme);
  applyTheme(theme);
}
