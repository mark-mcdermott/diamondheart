"use server";

import { db } from "@/db";
import { entertainmentItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { success: boolean; error?: string };

export async function addEntertainment(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const title = formData.get("title") as string;
  const type = formData.get("type") as string;
  if (!title || !type) return { success: false, error: "Title and type are required" };

  await db.insert(entertainmentItems).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    type,
    title,
    creator: (formData.get("creator") as string) || null,
    status: (formData.get("status") as string) || "completed",
    rating: formData.get("rating") ? parseInt(formData.get("rating") as string) : null,
    notes: (formData.get("notes") as string) || null,
    startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : null,
    endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : null,
    tmdbId: formData.get("tmdbId") ? parseInt(formData.get("tmdbId") as string) : null,
    posterPath: (formData.get("posterPath") as string) || null,
    backdropPath: (formData.get("backdropPath") as string) || null,
    overview: (formData.get("overview") as string) || null,
    releaseDate: (formData.get("releaseDate") as string) || null,
    genres: (formData.get("genres") as string) || null,
    seasonCount: formData.get("seasonCount") ? parseInt(formData.get("seasonCount") as string) : null,
    episodeCount: formData.get("episodeCount") ? parseInt(formData.get("episodeCount") as string) : null,
    runtime: formData.get("runtime") ? parseInt(formData.get("runtime") as string) : null,
    voteAverage: (formData.get("voteAverage") as string) || null,
  });

  revalidatePath("/entertainment");
  return { success: true };
}

export async function updateEntertainment(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const itemId = formData.get("itemId") as string;
  if (!itemId) return { success: false, error: "Item ID required" };

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  const title = formData.get("title") as string;
  if (title) updates.title = title;

  const status = formData.get("status") as string;
  if (status) updates.status = status;

  const ratingStr = formData.get("rating") as string;
  updates.rating = ratingStr ? parseInt(ratingStr) : null;

  updates.notes = (formData.get("notes") as string) || null;

  // TMDB fields
  const tmdbId = formData.get("tmdbId") as string;
  if (tmdbId) updates.tmdbId = parseInt(tmdbId);

  const posterPath = formData.get("posterPath") as string;
  if (posterPath) updates.posterPath = posterPath;

  const backdropPath = formData.get("backdropPath") as string;
  if (backdropPath) updates.backdropPath = backdropPath;

  const overview = formData.get("overview") as string;
  if (overview) updates.overview = overview;

  const releaseDate = formData.get("releaseDate") as string;
  if (releaseDate) updates.releaseDate = releaseDate;

  const genres = formData.get("genres") as string;
  if (genres) updates.genres = genres;

  const seasonCount = formData.get("seasonCount") as string;
  if (seasonCount) updates.seasonCount = parseInt(seasonCount);

  const episodeCount = formData.get("episodeCount") as string;
  if (episodeCount) updates.episodeCount = parseInt(episodeCount);

  const runtime = formData.get("runtime") as string;
  if (runtime) updates.runtime = parseInt(runtime);

  const voteAverage = formData.get("voteAverage") as string;
  if (voteAverage) updates.voteAverage = voteAverage;

  await db.update(entertainmentItems)
    .set(updates)
    .where(and(eq(entertainmentItems.id, itemId), eq(entertainmentItems.userId, session.userId)));

  revalidatePath("/entertainment");
  return { success: true };
}

export async function deleteEntertainment(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const itemId = formData.get("itemId") as string;
  await db.delete(entertainmentItems)
    .where(and(eq(entertainmentItems.id, itemId), eq(entertainmentItems.userId, session.userId)));

  revalidatePath("/entertainment");
  return { success: true };
}

export async function getEntertainmentByStatus(
  userId: string,
  type?: string,
  status?: string,
) {
  const conditions = [eq(entertainmentItems.userId, userId)];
  if (type) conditions.push(eq(entertainmentItems.type, type));
  if (status) conditions.push(eq(entertainmentItems.status, status));

  return db
    .select()
    .from(entertainmentItems)
    .where(and(...conditions))
    .orderBy(entertainmentItems.updatedAt);
}
