import { SignJWT, jwtVerify } from "jose";

/**
 * The session token, independent of any framework.
 *
 * `src/lib/auth.ts` wraps these for Next (cookie jar via `next/headers`) and
 * `src/server/api/_lib/session.ts` reads the same token off a raw `Request`, so
 * a server action and an API handler agree on what a session is. Better Auth
 * replaces this module in Phase 2 of `docs/PORT-PLAN.md`; the callers keep their
 * signatures.
 */

export const SESSION_COOKIE = "session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

/** Read lazily so a test can set `AUTH_SECRET` before the first token is minted. */
function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

/** The session cookie's value from a raw request, or null when absent. */
export function readSessionCookie(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== SESSION_COOKIE) continue;
    const value = part.slice(eq + 1).trim();
    return value === "" ? null : value;
  }
  return null;
}
