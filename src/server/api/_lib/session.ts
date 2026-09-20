import { readSessionCookie, verifySessionToken } from "@/lib/session-token";

export interface ResolvedSession {
  userId: string;
}

/**
 * Who is asking, from the raw request. There is no per-request `locals` and no
 * middleware equivalent by design: every handler resolves the session itself,
 * so each endpoint is independently safe when reached directly.
 *
 * The same token is accepted as `Authorization: Bearer`, which is what a
 * bundled native build sends (it never receives the cookie) and what makes an
 * endpoint checkable with curl. Better Auth takes this function over in
 * Phase 2; `ResolvedSession` stays as it is so nothing above it changes.
 */
export async function resolveSession(request: Request): Promise<ResolvedSession | null> {
  const token = readSessionCookie(request) ?? bearerToken(request);
  if (!token) return null;
  return verifySessionToken(token);
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, value] = header.split(" ", 2);
  if (scheme?.toLowerCase() !== "bearer" || !value) return null;
  return value.trim() || null;
}
