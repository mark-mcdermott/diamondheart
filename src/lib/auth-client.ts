import { createAuthClient } from "better-auth/react";
import { API_BASE } from "@/app/api";

/**
 * Better Auth's browser client (docs/PORT-PLAN.md, Phase 3). On the web it
 * talks to the same origin and the cookie carries the session; the bundled
 * native build points it at the deployed origin through `API_BASE` (Phase 5).
 */
export const authClient = createAuthClient({ baseURL: API_BASE || undefined });

/** Only a path on this site may follow a sign-in, so a crafted link cannot bounce someone elsewhere. */
export function safeRedirect(target: string | null | undefined, fallback = "/dashboard"): string {
  return target && target.startsWith("/") && !target.startsWith("//") ? target : fallback;
}
