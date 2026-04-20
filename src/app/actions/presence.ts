"use server";

import { db } from "@/db";
import { meditationPresence, userPreferences, users } from "@/db/schema";
import { and, eq, gt, ne, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import {
  PRESENCE_ACTIVE_CUTOFF_MS,
  redactMeditator,
  type PresenceMeditator,
} from "@/lib/presence";

type Result = { success: boolean; error?: string };

export type MeditatingNow = {
  count: number;
  meditators: PresenceMeditator[];
};

const PREVIEW_LIMIT = 8;

export async function pingMeditatingNow(): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const now = new Date();
  await db
    .insert(meditationPresence)
    .values({ userId: session.userId, startedAt: now, lastPingAt: now })
    .onConflictDoUpdate({
      target: meditationPresence.userId,
      set: { lastPingAt: now },
    });

  return { success: true };
}

export async function stopMeditatingNow(): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  await db
    .delete(meditationPresence)
    .where(eq(meditationPresence.userId, session.userId));

  return { success: true };
}

export async function getMeditatingNow(): Promise<MeditatingNow> {
  const session = await getCurrentUser();
  if (!session) return { count: 0, meditators: [] };

  const cutoff = new Date(Date.now() - PRESENCE_ACTIVE_CUTOFF_MS);
  const whereClause = and(
    ne(meditationPresence.userId, session.userId),
    gt(meditationPresence.lastPingAt, cutoff),
  );

  const rows = await db
    .select({
      userId: meditationPresence.userId,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
      showName: sql<boolean | null>`${userPreferences.showNameWhenMeditating}`.as("show_name"),
    })
    .from(meditationPresence)
    .innerJoin(users, eq(users.id, meditationPresence.userId))
    .leftJoin(userPreferences, eq(userPreferences.userId, meditationPresence.userId))
    .where(whereClause)
    .orderBy(meditationPresence.startedAt)
    .limit(PREVIEW_LIMIT);

  const meditators: PresenceMeditator[] = rows.map((r) =>
    redactMeditator(
      {
        userId: r.userId,
        name: r.userName,
        avatarUrl: r.userAvatarUrl,
        isAnonymous: false,
      },
      r.showName ?? true,
    ),
  );

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int`.as("count") })
    .from(meditationPresence)
    .where(whereClause);

  return { count: countRow?.count ?? 0, meditators };
}

export async function toggleShowNameWhenMeditating(formData: FormData): Promise<Result> {
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
      .set({
        showNameWhenMeditating: !existing.showNameWhenMeditating,
        updatedAt: new Date(),
      })
      .where(eq(userPreferences.id, existing.id));
  } else {
    await db.insert(userPreferences).values({
      id: crypto.randomUUID(),
      userId: session.userId,
      showNameWhenMeditating: false,
    });
  }

  return { success: true };
}
