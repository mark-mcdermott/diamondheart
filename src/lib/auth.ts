import { headers } from "next/headers";
import { auth } from "@/lib/server/auth";

/** Hashing lives in `src/lib/password.ts`; re-exported so existing imports keep working. */
export { hashPassword, verifyPassword } from "@/lib/password";

/**
 * The single source of identity on the server for pages and server actions.
 * Route handlers under `src/server/api/` resolve the same session off the raw
 * request instead; see `src/server/api/_lib/session.ts`.
 */
export async function getCurrentUser(): Promise<{ userId: string } | null> {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result) return null;
  return { userId: result.user.id };
}
