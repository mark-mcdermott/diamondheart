import { createAuthClient } from "better-auth/react";
import { API_BASE } from "@/app/api";
import { NATIVE } from "@/app/platform";
import { getToken, setToken } from "@/lib/session-token";

/**
 * Better Auth's browser client (docs/PORT-PLAN.md, Phase 3). On the web it
 * talks to the same origin and the cookie carries the session. The native
 * bundle points it at `API_BASE` and authenticates with the bearer token the
 * `bearer` plugin hands back in `set-auth-token` on sign-in and sign-up
 * (Decision 9); the web build ignores that header and keeps to its cookie.
 */
export const authClient = createAuthClient({
  baseURL: API_BASE || undefined,
  fetchOptions: {
    auth: { type: "Bearer", token: () => getToken() ?? "" },
    onSuccess: (context) => {
      const token = context.response.headers.get("set-auth-token");
      if (token && NATIVE) void setToken(token);
    },
  },
});

/** Only a path on this site may follow a sign-in, so a crafted link cannot bounce someone elsewhere. */
export function safeRedirect(target: string | null | undefined, fallback = "/dashboard"): string {
  return target && target.startsWith("/") && !target.startsWith("//") ? target : fallback;
}
