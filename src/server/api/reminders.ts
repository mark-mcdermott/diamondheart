import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { reminderSchedules, trackerMetrics, type ReminderSchedule } from "@/db/schema";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { HttpError, handler, json, noContent, notFound, readJson } from "./_lib/http";
import { createReminderSchema, updateReminderSchema, type CreateReminder, type UpdateReminder } from "./_lib/schemas";

const DEFAULT_TIMEZONE = "America/Chicago";

export function listReminders(userId: string): Promise<ReminderSchedule[]> {
  return db
    .select()
    .from(reminderSchedules)
    .where(eq(reminderSchedules.userId, userId))
    .orderBy(reminderSchedules.time);
}

/** A reminder may point at a metric, which must be the caller's. */
async function ownedMetricId(userId: string, metricId: string | null | undefined): Promise<string | null> {
  if (!metricId) return null;
  const [owned] = await db
    .select({ id: trackerMetrics.id })
    .from(trackerMetrics)
    .where(and(eq(trackerMetrics.id, metricId), eq(trackerMetrics.userId, userId)))
    .limit(1);
  if (!owned) throw new HttpError(notFound("Metric not found"));
  return owned.id;
}

export async function createReminder(userId: string, input: CreateReminder): Promise<ReminderSchedule> {
  const [reminder] = await db
    .insert(reminderSchedules)
    .values({
      id: crypto.randomUUID(),
      userId,
      metricId: await ownedMetricId(userId, input.metricId),
      label: input.label,
      time: input.time,
      days: [...input.days].sort((a, b) => a - b),
      timezone: input.timezone ?? DEFAULT_TIMEZONE,
      enabled: input.enabled ?? true,
    })
    .returning();
  return reminder;
}

export async function updateReminder(userId: string, reminderId: string, patch: UpdateReminder): Promise<ReminderSchedule> {
  const columns: Partial<typeof reminderSchedules.$inferInsert> = {};
  if (patch.label !== undefined) columns.label = patch.label;
  if (patch.time !== undefined) columns.time = patch.time;
  if (patch.days !== undefined) columns.days = [...patch.days].sort((a, b) => a - b);
  if (patch.timezone !== undefined) columns.timezone = patch.timezone;
  if (patch.enabled !== undefined) columns.enabled = patch.enabled;
  if (patch.metricId !== undefined) columns.metricId = await ownedMetricId(userId, patch.metricId);

  if (Object.keys(columns).length === 0) {
    const [current] = await db
      .select()
      .from(reminderSchedules)
      .where(and(eq(reminderSchedules.id, reminderId), eq(reminderSchedules.userId, userId)))
      .limit(1);
    if (!current) throw new HttpError(notFound("Reminder not found"));
    return current;
  }

  const [updated] = await db
    .update(reminderSchedules)
    .set({ ...columns, updatedAt: new Date() })
    .where(and(eq(reminderSchedules.id, reminderId), eq(reminderSchedules.userId, userId)))
    .returning();
  if (!updated) throw new HttpError(notFound("Reminder not found"));
  return updated;
}

export async function deleteReminder(userId: string, reminderId: string): Promise<void> {
  const deleted = await db
    .delete(reminderSchedules)
    .where(and(eq(reminderSchedules.id, reminderId), eq(reminderSchedules.userId, userId)))
    .returning({ id: reminderSchedules.id });
  if (deleted.length === 0) throw new HttpError(notFound("Reminder not found"));
}

export const GET: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    return json({ reminders: await listReminders(userId) });
  });

export const POST: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    const input = await readJson(request, createReminderSchema);
    return json({ reminder: await createReminder(userId, input) }, 201);
  });

export const item = {
  PATCH: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const patch = await readJson(request, updateReminderSchema);
      return json({ reminder: await updateReminder(userId, params.id, patch) });
    })) satisfies ApiHandler,

  DELETE: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await deleteReminder(userId, params.id);
      return noContent();
    })) satisfies ApiHandler,
};
