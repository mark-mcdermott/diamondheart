import { HttpError, unauthorized } from "./http";
import { resolveSession, type ResolvedSession } from "./session";

/**
 * The first thing every handler does. Ownership of a specific row is not a
 * separate step: resources put `userId` in the query's `WHERE` clause so that a
 * row belonging to someone else is indistinguishable from one that does not
 * exist. No existence oracle, one query.
 */
export async function requireSession(request: Request): Promise<ResolvedSession> {
  const session = await resolveSession(request);
  if (!session) throw new HttpError(unauthorized());
  return session;
}
