"use server";

import { db } from "@/db";
import { showEpisodes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { success: boolean; error?: string };

export async function getWatchedEpisodes(seriesImdbId: string) {
  const session = await getCurrentUser();
  if (!session) return [];

  return db
    .select()
    .from(showEpisodes)
    .where(
      and(
        eq(showEpisodes.userId, session.userId),
        eq(showEpisodes.seriesImdbId, seriesImdbId),
      ),
    );
}

export async function setEpisodeWatched(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const seriesImdbId = formData.get("seriesImdbId") as string;
  const episodeImdbId = formData.get("episodeImdbId") as string;
  const watched = formData.get("watched") === "true";

  if (!seriesImdbId || !episodeImdbId) {
    return { success: false, error: "Missing identifiers" };
  }

  if (!watched) {
    await db
      .delete(showEpisodes)
      .where(
        and(
          eq(showEpisodes.userId, session.userId),
          eq(showEpisodes.episodeImdbId, episodeImdbId),
        ),
      );
    revalidatePath("/entertainment");
    return { success: true };
  }

  const season = parseInt(formData.get("season") as string, 10);
  const episode = parseInt(formData.get("episode") as string, 10);
  if (!Number.isInteger(season) || !Number.isInteger(episode)) {
    return { success: false, error: "Invalid season/episode" };
  }

  const title = (formData.get("title") as string) || null;
  const airDate = (formData.get("airDate") as string) || null;

  await db
    .insert(showEpisodes)
    .values({
      id: crypto.randomUUID(),
      userId: session.userId,
      seriesImdbId,
      episodeImdbId,
      season,
      episode,
      title,
      airDate,
    })
    .onConflictDoNothing();

  revalidatePath("/entertainment");
  return { success: true };
}
