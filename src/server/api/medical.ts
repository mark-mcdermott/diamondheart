import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { medicalLogs } from "@/db/schema";
import { dayBounds, parseDate } from "@/lib/dates";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { HttpError, fail, handler, json, noContent, notFound, readJson } from "./_lib/http";
import { calendarDay, createMedicalLogSchema, type CreateMedicalLog } from "./_lib/schemas";

export type MedicalLog = typeof medicalLogs.$inferSelect;

export function listLogs(userId: string): Promise<MedicalLog[]> {
  return db.select().from(medicalLogs).where(eq(medicalLogs.userId, userId)).orderBy(desc(medicalLogs.date));
}

export async function createLog(userId: string, input: CreateMedicalLog): Promise<MedicalLog> {
  const [row] = await db
    .insert(medicalLogs)
    .values({
      id: crypto.randomUUID(),
      userId,
      type: input.type,
      subtype: input.subtype ?? null,
      severity: input.severity ?? null,
      notes: input.notes ?? null,
      date: input.date ?? new Date(),
      endDate: null,
    })
    .returning();
  return row;
}

export async function deleteLog(userId: string, id: string): Promise<void> {
  const deleted = await db.delete(medicalLogs).where(and(eq(medicalLogs.id, id), eq(medicalLogs.userId, userId))).returning({ id: medicalLogs.id });
  if (deleted.length === 0) throw new HttpError(notFound("Log not found"));
}

export interface MedicalTotals {
  byType: { type: string; count: number }[];
  bySeverity: { date: string; avgSeverity: number; count: number }[];
}

/** Counts per type, and the average severity per day where one was recorded. */
export async function totalsBetween(userId: string, from: Date, to: Date): Promise<MedicalTotals> {
  const inRange = and(eq(medicalLogs.userId, userId), gte(medicalLogs.date, from), lt(medicalLogs.date, to));
  const [byType, bySeverity] = await Promise.all([
    db.select({ type: medicalLogs.type, count: sql<number>`COUNT(*)` }).from(medicalLogs).where(inRange).groupBy(medicalLogs.type).orderBy(sql`COUNT(*) DESC`),
    db
      .select({ date: sql<string>`DATE(${medicalLogs.date})`, avgSeverity: sql<number>`COALESCE(AVG(${medicalLogs.severity}), 0)`, count: sql<number>`COUNT(*)` })
      .from(medicalLogs)
      .where(and(inRange, sql`${medicalLogs.severity} IS NOT NULL`))
      .groupBy(sql`DATE(${medicalLogs.date})`)
      .orderBy(sql`DATE(${medicalLogs.date})`),
  ]);
  return {
    byType: byType.map((r) => ({ type: r.type, count: Number(r.count) })),
    bySeverity: bySeverity.map((r) => ({ date: String(r.date), avgSeverity: Math.round(Number(r.avgSeverity) * 10) / 10, count: Number(r.count) })),
  };
}

function dayParam(request: Request, name: string): Date {
  const parsed = calendarDay.safeParse(new URL(request.url).searchParams.get(name) ?? "");
  if (!parsed.success) throw new HttpError(fail(422, "Validation failed", { [name]: ["Must be YYYY-MM-DD"] }));
  return parseDate(parsed.data);
}

export const GET: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    return json({ logs: await listLogs(userId) });
  });

export const POST: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    return json({ log: await createLog(userId, await readJson(request, createMedicalLogSchema)) }, 201);
  });

export const log = {
  DELETE: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await deleteLog(userId, params.id);
      return noContent();
    })) satisfies ApiHandler,
};

export const totals = {
  GET: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const from = dayParam(request, "from");
      const to = dayParam(request, "to");
      if (to < from) throw new HttpError(fail(422, "Validation failed", { to: ["Must not be before from"] }));
      return json(await totalsBetween(userId, from, dayBounds(to).end));
    })) satisfies ApiHandler,
};
