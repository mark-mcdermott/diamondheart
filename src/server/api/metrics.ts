import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  entertainmentItems,
  financialAccounts,
  foodLog,
  foodLogItems,
  medicalLogs,
  meditationSessions,
  trackerCategories,
  trackerEntries,
  trackerMetrics,
  trackingItems,
  workouts,
  type TrackerCategory,
  type TrackerEntry,
  type TrackerMetric,
} from "@/db/schema";
import { dayBounds, daysAgo, todayStart } from "@/lib/dates";
import { slugify } from "@/lib/slug";
import { toStoredValue, type MassUnit } from "@/lib/units";
import { ensureDefaultCategory, listCategories } from "./categories";
import { categoryNavStatus, trackingSectionStatus } from "./nav";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { HttpError, fail, handler, json, noContent, notFound, readJson } from "./_lib/http";
import {
  createEntrySchema,
  createMetricSchema,
  reorderSchema,
  updateEntrySchema,
  updateMetricSchema,
  type CreateEntry,
  type CreateMetric,
  type UpdateEntry,
  type UpdateMetric,
} from "./_lib/schemas";

/** Ordered as the pages order them. `sort_order` is text, so the order is lexical. */
export function listMetrics(userId: string): Promise<TrackerMetric[]> {
  return db
    .select()
    .from(trackerMetrics)
    .where(and(eq(trackerMetrics.userId, userId), eq(trackerMetrics.archived, false)))
    .orderBy(trackerMetrics.sortOrder);
}

async function ownedMetric(userId: string, metricId: string): Promise<TrackerMetric> {
  const [metric] = await db
    .select()
    .from(trackerMetrics)
    .where(and(eq(trackerMetrics.id, metricId), eq(trackerMetrics.userId, userId)))
    .limit(1);
  if (!metric) throw new HttpError(notFound("Metric not found"));
  return metric;
}

async function ownedCategoryId(userId: string, categoryId: string | null | undefined): Promise<string> {
  if (!categoryId) return (await ensureDefaultCategory(userId)).id;
  const [owned] = await db
    .select({ id: trackerCategories.id })
    .from(trackerCategories)
    .where(and(eq(trackerCategories.id, categoryId), eq(trackerCategories.userId, userId)))
    .limit(1);
  if (!owned) throw new HttpError(notFound("Category not found"));
  return owned.id;
}

export async function createMetric(userId: string, input: CreateMetric): Promise<TrackerMetric> {
  const categoryId = await ownedCategoryId(userId, input.categoryId);

  const [maxSort] = await db
    .select({ max: sql<string>`COALESCE(MAX(${trackerMetrics.sortOrder}), '-1')` })
    .from(trackerMetrics)
    .where(eq(trackerMetrics.userId, userId));
  const nextSort = String(parseInt(maxSort?.max ?? "-1", 10) + 1);

  const singleValuePerDay = input.singleValuePerDay ?? false;
  const [metric] = await db
    .insert(trackerMetrics)
    .values({
      id: crypto.randomUUID(),
      userId,
      categoryId,
      name: input.name,
      slug: slugify(input.name),
      valueType: input.valueType,
      unit: input.unit ?? null,
      dailyGoal: input.dailyGoal === undefined ? 1 : input.dailyGoal,
      fields: input.fields ?? null,
      // A metric cannot both accumulate and hold a single daily reading.
      counter: (input.counter ?? false) && !singleValuePerDay,
      singleValuePerDay,
      sortOrder: nextSort,
    })
    .returning();
  return metric;
}

export async function getMetric(
  userId: string,
  metricId: string
): Promise<{ metric: TrackerMetric; entries: TrackerEntry[] }> {
  const metric = await ownedMetric(userId, metricId);
  const entries = await db
    .select()
    .from(trackerEntries)
    .where(and(eq(trackerEntries.metricId, metricId), eq(trackerEntries.userId, userId)))
    .orderBy(desc(trackerEntries.date));
  return { metric, entries };
}

export async function updateMetric(userId: string, metricId: string, patch: UpdateMetric): Promise<TrackerMetric> {
  const current = await ownedMetric(userId, metricId);

  const columns: Partial<typeof trackerMetrics.$inferInsert> = {};
  if (patch.name !== undefined) {
    columns.name = patch.name;
    columns.slug = slugify(patch.name);
  }
  if (patch.valueType !== undefined) columns.valueType = patch.valueType;
  if (patch.unit !== undefined) columns.unit = patch.unit;
  if (patch.dailyGoal !== undefined) columns.dailyGoal = patch.dailyGoal;
  if (patch.fields !== undefined) columns.fields = patch.fields;
  if (patch.hidden !== undefined) columns.hidden = patch.hidden;
  if (patch.categoryId !== undefined) columns.categoryId = await ownedCategoryId(userId, patch.categoryId);

  const singleValuePerDay = patch.singleValuePerDay ?? current.singleValuePerDay;
  const counter = patch.counter ?? current.counter;
  if (patch.singleValuePerDay !== undefined || patch.counter !== undefined) {
    columns.singleValuePerDay = singleValuePerDay;
    columns.counter = counter && !singleValuePerDay;
  }

  if (Object.keys(columns).length === 0) return current;

  const [updated] = await db
    .update(trackerMetrics)
    .set({ ...columns, updatedAt: new Date() })
    .where(and(eq(trackerMetrics.id, metricId), eq(trackerMetrics.userId, userId)))
    .returning();
  return updated;
}

export async function deleteMetric(userId: string, metricId: string): Promise<void> {
  const deleted = await db
    .delete(trackerMetrics)
    .where(and(eq(trackerMetrics.id, metricId), eq(trackerMetrics.userId, userId)))
    .returning({ id: trackerMetrics.id });
  if (deleted.length === 0) throw new HttpError(notFound("Metric not found"));
}

/** Rewrites `sortOrder` from the array index. Every id must be one of the caller's. */
export async function reorderMetrics(userId: string, ids: string[]): Promise<TrackerMetric[]> {
  const known = new Set((await listMetrics(userId)).map((m) => m.id));
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw new HttpError(fail(422, "Validation failed", { ids: [`Unknown metric: ${unknown[0]}`] }));
  }

  for (let i = 0; i < ids.length; i++) {
    await db
      .update(trackerMetrics)
      .set({ sortOrder: String(i), updatedAt: new Date() })
      .where(and(eq(trackerMetrics.id, ids[i]), eq(trackerMetrics.userId, userId)));
  }
  return listMetrics(userId);
}

/**
 * A value arrives in the unit the caller says it is in. For a mass metric that
 * may not be the unit the metric stores, so convert here rather than trust the
 * client. Non-numeric values ("done", free text) pass through untouched.
 */
function toStored(value: string, metric: Pick<TrackerMetric, "unit">, unit: MassUnit | undefined): string {
  const numeric = parseFloat(value);
  if (Number.isNaN(numeric) || !unit) return value;
  const stored = toStoredValue(numeric, metric.unit, unit);
  return stored === numeric ? value : String(stored);
}

/**
 * Writes an entry. A metric that holds one reading per day (weight) replaces
 * that day's entry and reports `replaced: true`; one that accumulates (coffee)
 * adds another.
 */
export async function createEntry(
  userId: string,
  metricId: string,
  input: CreateEntry
): Promise<{ entry: TrackerEntry; replaced: boolean }> {
  const metric = await ownedMetric(userId, metricId);
  const value = toStored(input.value, metric, input.unit);
  const date = input.date ?? new Date();
  const notes = input.notes ?? null;

  if (metric.singleValuePerDay) {
    const { start, end } = dayBounds(date);
    const [existing] = await db
      .select({ id: trackerEntries.id })
      .from(trackerEntries)
      .where(
        and(
          eq(trackerEntries.metricId, metric.id),
          eq(trackerEntries.userId, userId),
          gte(trackerEntries.date, start),
          lt(trackerEntries.date, end)
        )
      )
      .limit(1);

    if (existing) {
      const [entry] = await db
        .update(trackerEntries)
        .set({ value, notes, date, updatedAt: new Date() })
        .where(and(eq(trackerEntries.id, existing.id), eq(trackerEntries.userId, userId)))
        .returning();
      return { entry, replaced: true };
    }
  }

  const [entry] = await db
    .insert(trackerEntries)
    .values({ id: crypto.randomUUID(), userId, metricId: metric.id, value, notes, date })
    .returning();
  return { entry, replaced: false };
}

export async function updateEntry(userId: string, entryId: string, patch: UpdateEntry): Promise<TrackerEntry> {
  const [owning] = await db
    .select({ entry: trackerEntries, unit: trackerMetrics.unit })
    .from(trackerEntries)
    .innerJoin(trackerMetrics, eq(trackerMetrics.id, trackerEntries.metricId))
    .where(and(eq(trackerEntries.id, entryId), eq(trackerEntries.userId, userId)))
    .limit(1);
  if (!owning) throw new HttpError(notFound("Entry not found"));

  const columns: Partial<typeof trackerEntries.$inferInsert> = {};
  if (patch.value !== undefined) columns.value = toStored(patch.value, { unit: owning.unit }, patch.unit);
  if (patch.notes !== undefined) columns.notes = patch.notes;
  if (Object.keys(columns).length === 0) return owning.entry;

  const [updated] = await db
    .update(trackerEntries)
    .set({ ...columns, updatedAt: new Date() })
    .where(and(eq(trackerEntries.id, entryId), eq(trackerEntries.userId, userId)))
    .returning();
  return updated;
}

export async function deleteEntry(userId: string, entryId: string): Promise<void> {
  const deleted = await db
    .delete(trackerEntries)
    .where(and(eq(trackerEntries.id, entryId), eq(trackerEntries.userId, userId)))
    .returning({ id: trackerEntries.id });
  if (deleted.length === 0) throw new HttpError(notFound("Entry not found"));
}

export interface MetricsOverview {
  categories: TrackerCategory[];
  metrics: TrackerMetric[];
  /** Whether each category has a visible nav item. */
  categoryNavStatus: Record<string, boolean>;
  /** Whether each tracking section is shown in the nav. */
  sectionStatus: Record<string, boolean>;
  /** One line per tracking section, e.g. "3 sessions this week". */
  sectionSummaries: Record<string, string>;
}

/** Everything the metrics page shows, in one read. The summaries used to be nine queries in the page. */
export async function readOverview(userId: string): Promise<MetricsOverview> {
  const count = (n: unknown) => Number(n ?? 0);
  const [
    categories,
    metrics,
    sectionStatus,
    foodCalories,
    trackingCount,
    medicalCount,
    appointmentCount,
    entertainmentCount,
    workoutCount,
    meditationStats,
    financeAccountCount,
  ] = await Promise.all([
    listCategories(userId),
    listMetrics(userId),
    trackingSectionStatus(userId),
    db
      .select({ total: sql<number>`COALESCE(SUM(${foodLogItems.calories} * ${foodLogItems.quantity}), 0)` })
      .from(foodLog)
      .innerJoin(foodLogItems, eq(foodLogItems.foodLogId, foodLog.id))
      .where(and(eq(foodLog.userId, userId), gte(foodLog.date, todayStart()))),
    db.select({ count: sql<number>`COUNT(*)` }).from(trackingItems).where(eq(trackingItems.userId, userId)),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(medicalLogs)
      .where(and(eq(medicalLogs.userId, userId), gte(medicalLogs.date, daysAgo(7)))),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(appointments)
      .where(and(eq(appointments.userId, userId), eq(appointments.status, "upcoming"))),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(entertainmentItems)
      .where(and(eq(entertainmentItems.userId, userId), sql`${entertainmentItems.status} IN ('watching', 'reading', 'listening')`)),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(workouts)
      .where(and(eq(workouts.userId, userId), gte(workouts.date, daysAgo(7)))),
    db
      .select({
        count: sql<number>`COUNT(*)`,
        totalMinutes: sql<number>`COALESCE(SUM(${meditationSessions.duration}), 0) / 60`,
      })
      .from(meditationSessions)
      .where(and(eq(meditationSessions.userId, userId), gte(meditationSessions.date, daysAgo(7)))),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(financialAccounts)
      .where(and(eq(financialAccounts.userId, userId), eq(financialAccounts.archived, false))),
  ]);

  const sectionSummaries: Record<string, string> = {
    food: `${count(foodCalories[0]?.total)} cal today`,
    tracking: `${count(trackingCount[0]?.count)} items tracked`,
    medical: `${count(medicalCount[0]?.count)} logs this week`,
    appointments: `${count(appointmentCount[0]?.count)} upcoming`,
    entertainment: `${count(entertainmentCount[0]?.count)} in progress`,
    workout: `${count(workoutCount[0]?.count)} sessions this week`,
    meditate: `${count(meditationStats[0]?.count)} sessions, ${count(meditationStats[0]?.totalMinutes)} min this week`,
    finances: `${count(financeAccountCount[0]?.count)} accounts tracked`,
  };

  return {
    categories,
    metrics,
    categoryNavStatus: await categoryNavStatus(userId, categories.map((c) => c.id)),
    sectionStatus,
    sectionSummaries,
  };
}

export const GET: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    return json({ metrics: await listMetrics(userId) });
  });

export const overview = {
  GET: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json(await readOverview(userId));
    })) satisfies ApiHandler,
};

export const POST: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    const input = await readJson(request, createMetricSchema);
    return json({ metric: await createMetric(userId, input) }, 201);
  });

export const PATCH: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    const { ids } = await readJson(request, reorderSchema);
    return json({ metrics: await reorderMetrics(userId, ids) });
  });

export const item = {
  GET: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json(await getMetric(userId, params.id));
    })) satisfies ApiHandler,

  PATCH: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const patch = await readJson(request, updateMetricSchema);
      return json({ metric: await updateMetric(userId, params.id, patch) });
    })) satisfies ApiHandler,

  DELETE: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await deleteMetric(userId, params.id);
      return noContent();
    })) satisfies ApiHandler,
};

export const entries = {
  POST: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const input = await readJson(request, createEntrySchema);
      const { entry, replaced } = await createEntry(userId, params.id, input);
      return json({ entry }, replaced ? 200 : 201);
    })) satisfies ApiHandler,
};

export const entry = {
  PATCH: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const patch = await readJson(request, updateEntrySchema);
      return json({ entry: await updateEntry(userId, params.id, patch) });
    })) satisfies ApiHandler,

  DELETE: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await deleteEntry(userId, params.id);
      return noContent();
    })) satisfies ApiHandler,
};
