"use server";

import { db } from "@/db";
import { entertainmentItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { success: boolean; error?: string };

function parseIntOrNull(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function stringOrNull(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

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
    creator: stringOrNull(formData.get("creator")),
    status: (formData.get("status") as string) || "completed",
    rating: parseIntOrNull(formData.get("rating")),
    notes: stringOrNull(formData.get("notes")),
    startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : null,
    endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : null,
    imdbId: stringOrNull(formData.get("imdbId")),
    posterUrl: stringOrNull(formData.get("posterUrl")),
    overview: stringOrNull(formData.get("overview")),
    releaseDate: stringOrNull(formData.get("releaseDate")),
    genres: stringOrNull(formData.get("genres")),
    seasonCount: parseIntOrNull(formData.get("seasonCount")),
    episodeCount: parseIntOrNull(formData.get("episodeCount")),
    runtime: parseIntOrNull(formData.get("runtime")),
    voteAverage: stringOrNull(formData.get("voteAverage")),
  });

  revalidatePath("/entertainment");
  return { success: true };
}

export async function updateEntertainment(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const itemId = formData.get("itemId") as string;
  if (!itemId) return { success: false, error: "Item ID required" };

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  const title = formData.get("title") as string;
  if (title) updates.title = title;

  const status = formData.get("status") as string;
  if (status) updates.status = status;

  updates.rating = parseIntOrNull(formData.get("rating"));
  updates.notes = stringOrNull(formData.get("notes"));

  const imdbId = stringOrNull(formData.get("imdbId"));
  if (imdbId) updates.imdbId = imdbId;

  const posterUrl = stringOrNull(formData.get("posterUrl"));
  if (posterUrl) updates.posterUrl = posterUrl;

  const overview = stringOrNull(formData.get("overview"));
  if (overview) updates.overview = overview;

  const releaseDate = stringOrNull(formData.get("releaseDate"));
  if (releaseDate) updates.releaseDate = releaseDate;

  const genres = stringOrNull(formData.get("genres"));
  if (genres) updates.genres = genres;

  const seasonCount = parseIntOrNull(formData.get("seasonCount"));
  if (seasonCount !== null) updates.seasonCount = seasonCount;

  const episodeCount = parseIntOrNull(formData.get("episodeCount"));
  if (episodeCount !== null) updates.episodeCount = episodeCount;

  const runtime = parseIntOrNull(formData.get("runtime"));
  if (runtime !== null) updates.runtime = runtime;

  const voteAverage = stringOrNull(formData.get("voteAverage"));
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
