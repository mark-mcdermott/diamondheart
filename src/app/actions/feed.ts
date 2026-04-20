"use server";

import { db } from "@/db";
import {
  meditationSessions,
  meditationReactions,
  userPreferences,
  users,
} from "@/db/schema";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type Result = { success: boolean; error?: string };

const FEED_LIMIT = 30;

export type FeedItem = {
  sessionId: string;
  userId: string;
  userName: string | null;
  userAvatarUrl: string | null;
  duration: number;
  date: Date;
  reactionCount: number;
  reactedByMe: boolean;
};

export async function getCommunityFeed(currentUserId: string): Promise<FeedItem[]> {
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
    .where(
      and(
        ne(meditationSessions.userId, currentUserId),
        // Include users without a prefs row (default = show) OR users who haven't opted out.
        sql`(${userPreferences.showMeditationInFeed} IS NULL OR ${userPreferences.showMeditationInFeed} = true)`,
      ),
    )
    .orderBy(desc(meditationSessions.date))
    .limit(FEED_LIMIT);

  if (rows.length === 0) return [];

  const sessionIds = rows.map((r) => r.sessionId);

  const counts = await db
    .select({
      sessionId: meditationReactions.sessionId,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(meditationReactions)
    .where(inArray(meditationReactions.sessionId, sessionIds))
    .groupBy(meditationReactions.sessionId);

  const mine = await db
    .select({ sessionId: meditationReactions.sessionId })
    .from(meditationReactions)
    .where(
      and(
        inArray(meditationReactions.sessionId, sessionIds),
        eq(meditationReactions.userId, currentUserId),
      ),
    );

  const countBySession = new Map(counts.map((c) => [c.sessionId, c.count]));
  const mineSet = new Set(mine.map((m) => m.sessionId));

  return rows.map((r) => ({
    sessionId: r.sessionId,
    userId: r.userId,
    userName: r.userName,
    userAvatarUrl: r.userAvatarUrl,
    duration: r.duration,
    date: r.date,
    reactionCount: countBySession.get(r.sessionId) ?? 0,
    reactedByMe: mineSet.has(r.sessionId),
  }));
}

const toggleSchema = z.object({
  sessionId: z.string().min(1).max(64),
});

export async function toggleReaction(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const parsed = toggleSchema.safeParse({
    sessionId: formData.get("sessionId"),
  });
  if (!parsed.success) return { success: false, error: "Invalid session ID" };

  const { sessionId } = parsed.data;

  const [target] = await db
    .select({ id: meditationSessions.id })
    .from(meditationSessions)
    .where(eq(meditationSessions.id, sessionId))
    .limit(1);
  if (!target) return { success: false, error: "Session not found" };

  const [existing] = await db
    .select({ id: meditationReactions.id })
    .from(meditationReactions)
    .where(
      and(
        eq(meditationReactions.sessionId, sessionId),
        eq(meditationReactions.userId, session.userId),
      ),
    )
    .limit(1);

  if (existing) {
    await db.delete(meditationReactions).where(eq(meditationReactions.id, existing.id));
  } else {
    await db.insert(meditationReactions).values({
      id: crypto.randomUUID(),
      sessionId,
      userId: session.userId,
    });
  }

  revalidatePath("/feed");
  return { success: true };
}

export async function toggleMeditationFeedVisibility(formData: FormData): Promise<Result> {
  void formData;
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const [existing] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.userId))
    .limit(1);

  if (existing) {
    await db
      .update(userPreferences)
      .set({ showMeditationInFeed: !existing.showMeditationInFeed, updatedAt: new Date() })
      .where(eq(userPreferences.id, existing.id));
  } else {
    await db.insert(userPreferences).values({
      id: crypto.randomUUID(),
      userId: session.userId,
      showMeditationInFeed: false,
    });
  }

  revalidatePath("/feed");
  revalidatePath("/settings");
  return { success: true };
}
