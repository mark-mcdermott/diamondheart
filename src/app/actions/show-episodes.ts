"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import * as entertainment from "@/server/api/entertainment";
import { asResult, type ActionResult } from "./api-result";

/** Thin wrappers over the episode half of `src/server/api/entertainment.ts`, kept until Phase 3. */

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function getWatchedEpisodes(seriesImdbId: string) {
  const session = await getCurrentUser();
  if (!session) return [];
  return entertainment.listWatched(session.userId, seriesImdbId);
}

export async function setEpisodeWatched(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const seriesImdbId = text(formData, "seriesImdbId");
  const episodeImdbId = text(formData, "episodeImdbId");
  if (!seriesImdbId || !episodeImdbId) return { success: false, error: "Missing identifiers" };
  const watched = text(formData, "watched") === "true";
  const season = Number.parseInt(text(formData, "season"), 10);
  const episode = Number.parseInt(text(formData, "episode"), 10);
  if (watched && (!Number.isInteger(season) || !Number.isInteger(episode))) return { success: false, error: "Invalid season/episode" };

  const result = await asResult(() =>
    entertainment.setWatched(session.userId, {
      seriesImdbId,
      episodeImdbId,
      watched,
      ...(watched ? { season, episode, title: text(formData, "title") || null, airDate: text(formData, "airDate") || null } : {}),
    })
  );
  revalidatePath("/entertainment");
  return result;
}
