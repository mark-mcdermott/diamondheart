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
/**
 * One shape for the auth forms: better-fetch reports a refused sign-in as
 * `error` but throws when the request never got an answer, and a thrown
 * promise from a form action unmounts the React tree. Returns the message to
 * show, or nothing on success.
 */
export type AuthFailure = {
  message: string;
  /** Better Auth's own code, where it gave one — `EMAIL_NOT_VERIFIED` is the one acted on. */
  code?: string;
};

/**
 * As `attempt`, but keeps the error code.
 *
 * Sign-in has to tell "wrong password" apart from "verify your address first", and those
 * differ only by code — the messages are both prose the user should not be asked to parse.
 */
export async function attemptDetailed(
  call: () => Promise<{ error: { message?: string; code?: string } | null }>,
  fallback: string,
): Promise<AuthFailure | undefined> {
  try {
    const { error } = await call();
    return error ? { message: error.message || fallback, code: error.code } : undefined;
  } catch {
    return { message: "Could not reach the server. Check your connection and try again." };
  }
}

export async function attempt(
  call: () => Promise<{ error: { message?: string } | null }>,
  fallback: string,
): Promise<string | undefined> {
  return (await attemptDetailed(call, fallback))?.message;
}

/** Better Auth's code for a sign-in refused because the address is unverified. */
export const EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED";

export function safeRedirect(target: string | null | undefined, fallback = "/dashboard"): string {
  return target && target.startsWith("/") && !target.startsWith("//") ? target : fallback;
}
