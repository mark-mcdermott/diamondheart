import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { ApiHandler } from "./_lib/context";
import { handler, json } from "./_lib/http";
import { resolveSession } from "./_lib/session";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

/**
 * `GET /api/auth/me` answers 200 whether or not anyone is signed in. The nav
 * island reads it on every page, and signed-out is a state, not an error.
 */
export const GET: ApiHandler = ({ request }) =>
  handler(async () => {
    const session = await resolveSession(request);
    if (!session) return json({ user: null });

    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    // A valid token for a deleted account reads as signed out, not as a 500.
    return json({ user: (user as SessionUser | undefined) ?? null });
  });
