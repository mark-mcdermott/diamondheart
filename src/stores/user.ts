import { atom, computed } from "nanostores";
import { api, type SessionUser } from "@/app/api";

/**
 * Who is signed in, shared across islands (docs/PORT-PLAN.md, "Island rule").
 *
 * A nanostore rather than React context because each island is its own React
 * root: the public nav's avatar and the sign-in form below it cannot see each
 * other's providers, but both can read this.
 */

export const $user = atom<SessionUser | null>(null);
export const $userStatus = atom<"loading" | "ready">("loading");
export const $signedIn = computed([$user, $userStatus], (user, status) => status === "ready" && user !== null);

let inFlight: Promise<void> | null = null;

/** Reads `/api/auth/me` once per page load, however many islands ask. Signed-out is `null`, not an error. */
export function loadUser(): Promise<void> {
  inFlight ??= api.auth
    .me()
    .then((user) => $user.set(user))
    .catch(() => $user.set(null))
    .finally(() => $userStatus.set("ready"));
  return inFlight;
}
