import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { entertainmentItems, showEpisodes } from "@/db/schema";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { HttpError, fail, handler, json, noContent, notFound, readJson } from "./_lib/http";
import { createEntertainmentSchema, episodeWatchedSchema, updateEntertainmentSchema, type CreateEntertainment, type EpisodeWatched, type UpdateEntertainment } from "./_lib/schemas";

export type EntertainmentItem = typeof entertainmentItems.$inferSelect;
export type ShowEpisode = typeof showEpisodes.$inferSelect;

export function listItems(userId: string): Promise<EntertainmentItem[]> {
  return db.select().from(entertainmentItems).where(eq(entertainmentItems.userId, userId)).orderBy(desc(entertainmentItems.updatedAt));
}

const COLUMNS = [
  "type", "title", "creator", "status", "rating", "notes", "startDate", "endDate", "imdbId", "posterUrl", "overview", "releaseDate", "genres", "seasonCount", "episodeCount", "runtime", "voteAverage",
] as const;

function columnsOf(input: Partial<UpdateEntertainment>): Partial<typeof entertainmentItems.$inferInsert> {
  const columns: Record<string, unknown> = {};
  for (const key of COLUMNS) if (input[key] !== undefined) columns[key] = input[key];
  return columns as Partial<typeof entertainmentItems.$inferInsert>;
}

export async function createItem(userId: string, input: CreateEntertainment): Promise<EntertainmentItem> {
  const [row] = await db
    .insert(entertainmentItems)
    .values({ id: crypto.randomUUID(), userId, status: "completed", ...columnsOf(input), type: input.type, title: input.title })
    .returning();
  return row;
}

export async function updateItem(userId: string, id: string, patch: UpdateEntertainment): Promise<EntertainmentItem> {
  const columns = columnsOf(patch);
  const [row] =
    Object.keys(columns).length === 0
      ? await db.select().from(entertainmentItems).where(and(eq(entertainmentItems.id, id), eq(entertainmentItems.userId, userId))).limit(1)
      : await db.update(entertainmentItems).set({ ...columns, updatedAt: new Date() }).where(and(eq(entertainmentItems.id, id), eq(entertainmentItems.userId, userId))).returning();
  if (!row) throw new HttpError(notFound("Item not found"));
  return row;
}

export async function deleteItem(userId: string, id: string): Promise<void> {
  const deleted = await db.delete(entertainmentItems).where(and(eq(entertainmentItems.id, id), eq(entertainmentItems.userId, userId))).returning({ id: entertainmentItems.id });
  if (deleted.length === 0) throw new HttpError(notFound("Item not found"));
}

export interface EntertainmentTotals {
  byType: { type: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

export async function totals(userId: string): Promise<EntertainmentTotals> {
  const [byType, byStatus] = await Promise.all([
    db.select({ type: entertainmentItems.type, count: sql<number>`COUNT(*)` }).from(entertainmentItems).where(eq(entertainmentItems.userId, userId)).groupBy(entertainmentItems.type).orderBy(sql`COUNT(*) DESC`),
    db.select({ status: entertainmentItems.status, count: sql<number>`COUNT(*)` }).from(entertainmentItems).where(eq(entertainmentItems.userId, userId)).groupBy(entertainmentItems.status).orderBy(sql`COUNT(*) DESC`),
  ]);
  return { byType: byType.map((r) => ({ type: r.type, count: Number(r.count) })), byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })) };
}

export function listWatched(userId: string, seriesImdbId: string): Promise<ShowEpisode[]> {
  return db.select().from(showEpisodes).where(and(eq(showEpisodes.userId, userId), eq(showEpisodes.seriesImdbId, seriesImdbId)));
}

/** Marks an episode watched (idempotent) or clears it. */
export async function setWatched(userId: string, input: EpisodeWatched): Promise<ShowEpisode | null> {
  if (!input.watched) {
    await db.delete(showEpisodes).where(and(eq(showEpisodes.userId, userId), eq(showEpisodes.episodeImdbId, input.episodeImdbId)));
    return null;
  }
  const [inserted] = await db
    .insert(showEpisodes)
    .values({
      id: crypto.randomUUID(),
      userId,
      seriesImdbId: input.seriesImdbId,
      episodeImdbId: input.episodeImdbId,
      season: input.season!,
      episode: input.episode!,
      title: input.title ?? null,
      airDate: input.airDate ?? null,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted) return inserted;
  const [existing] = await db.select().from(showEpisodes).where(and(eq(showEpisodes.userId, userId), eq(showEpisodes.episodeImdbId, input.episodeImdbId))).limit(1);
  return existing ?? null;
}

export const GET: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    return json({ items: await listItems(userId) });
  });

export const POST: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    return json({ item: await createItem(userId, await readJson(request, createEntertainmentSchema)) }, 201);
  });

export const item = {
  PATCH: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json({ item: await updateItem(userId, params.id, await readJson(request, updateEntertainmentSchema)) });
    })) satisfies ApiHandler,
  DELETE: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await deleteItem(userId, params.id);
      return noContent();
    })) satisfies ApiHandler,
};

export const totalsRoute = {
  GET: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json(await totals(userId));
    })) satisfies ApiHandler,
};

export const episodes = {
  GET: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const series = new URL(request.url).searchParams.get("series")?.trim();
      if (!series) throw new HttpError(fail(422, "Validation failed", { series: ["Required"] }));
      return json({ episodes: await listWatched(userId, series) });
    })) satisfies ApiHandler,
  PUT: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json({ episode: await setWatched(userId, await readJson(request, episodeWatchedSchema)) });
    })) satisfies ApiHandler,
};
