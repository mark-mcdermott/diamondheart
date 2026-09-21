/**
 * The origins a bundled native build calls the API from (docs/PORT-PLAN.md,
 * Decision 9): Capacitor's webview on iOS and Android, and Tauri's on desktop.
 * Better Auth trusts them for sign-in and `src/middleware.ts` answers their
 * CORS preflights; nothing else is cross-origin by design.
 */
export const NATIVE_ORIGINS = ["capacitor://localhost", "http://localhost", "tauri://localhost", "http://tauri.localhost"] as const;

export function isNativeOrigin(origin: string | null): origin is (typeof NATIVE_ORIGINS)[number] {
  return origin !== null && (NATIVE_ORIGINS as readonly string[]).includes(origin);
}
