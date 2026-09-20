import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { meditationReactions, meditationSessions, userPreferences, users } from "@/db/schema";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { HttpError, handler, json, notFound, readJson } from "./_lib/http";
import { reactionSchema } from "./_lib/schemas";

const FEED_LIMIT = 30;

export interface FeedItem {
  sessionId: string;
  userId: string;
  userName: string | null;
  userAvatarUrl: string | null;
  duration: number;
  date: Date;
  reactionCount: number;
  reactedByMe: boolean;
}

/** Other members' recent meditations, except those who opted out of the feed. */
export async function communityFeed(userId: string): Promise<FeedItem[]> {
  const rows = await db
    .select({
      sessionId: meditationSessions.id,
      userId: meditationSessions.userId,
      duration: meditationSessions.duration,
      date: meditationSessions.date,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
    })
    .from(meditationSessions)
    .innerJoin(users, eq(users.id, meditationSessions.userId))
    .leftJoin(userPreferences, eq(userPreferences.userId, meditationSessions.userId))
    .where(and(ne(meditationSessions.userId, userId), sql`(${userPreferences.showMeditationInFeed} IS NULL OR ${userPreferences.showMeditationInFeed} = true)`))
    .orderBy(desc(meditationSessions.date))
    .limit(FEED_LIMIT);
  if (rows.length === 0) return [];

  const sessionIds = rows.map((r) => r.sessionId);
  const [counts, mine] = await Promise.all([
    db.select({ sessionId: meditationReactions.sessionId, count: sql<number>`count(*)::int` }).from(meditationReactions).where(inArray(meditationReactions.sessionId, sessionIds)).groupBy(meditationReactions.sessionId),
    db.select({ sessionId: meditationReactions.sessionId }).from(meditationReactions).where(and(inArray(meditationReactions.sessionId, sessionIds), eq(meditationReactions.userId, userId))),
  ]);
  const countBySession = new Map(counts.map((c) => [c.sessionId, Number(c.count)]));
  const mineSet = new Set(mine.map((m) => m.sessionId));
  return rows.map((r) => ({ ...r, reactionCount: countBySession.get(r.sessionId) ?? 0, reactedByMe: mineSet.has(r.sessionId) }));
}

/** Sets whether the caller has reacted to a session; explicit rather than a toggle so a retry cannot flip it twice. */
export async function setReaction(userId: string, sessionId: string, reacted: boolean): Promise<{ reacted: boolean; reactionCount: number }> {
  const [target] = await db.select({ id: meditationSessions.id }).from(meditationSessions).where(eq(meditationSessions.id, sessionId)).limit(1);
  if (!target) throw new HttpError(notFound("Session not found"));

  if (reacted) {
    await db.insert(meditationReactions).values({ id: crypto.randomUUID(), sessionId, userId }).onConflictDoNothing();
  } else {
    await db.delete(meditationReactions).where(and(eq(meditationReactions.sessionId, sessionId), eq(meditationReactions.userId, userId)));
  }
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(meditationReactions).where(eq(meditationReactions.sessionId, sessionId));
  return { reacted, reactionCount: Number(count?.count ?? 0) };
}

export const GET: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    return json({ items: await communityFeed(userId) });
  });

export const reaction = {
  PUT: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const { reacted } = await readJson(request, reactionSchema);
      return json(await setReaction(userId, params.sessionId, reacted));
    })) satisfies ApiHandler,
};
