import { auth } from "@/lib/server/auth";

export interface ResolvedSession {
  userId: string;
}

/**
 * Who is asking, from the raw request. There is no per-request `locals` and no
 * middleware equivalent by design: every handler resolves the session itself,
 * so each endpoint is independently safe when reached directly.
 *
 * Better Auth reads either its cookie or an `Authorization: Bearer` header —
 * the latter is what a bundled native build sends, since it never receives
 * the cookie. `ResolvedSession` kept its shape through the swap, so nothing
 * above this function changed.
 */
export async function resolveSession(request: Request): Promise<ResolvedSession | null> {
  const result = await auth.api.getSession({ headers: request.headers });
  if (!result) return null;
  return { userId: result.user.id };
}
