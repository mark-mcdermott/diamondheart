import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { HttpError, handler, json, noContent, notFound, readJson } from "./_lib/http";
import { createAppointmentSchema, updateAppointmentSchema, type CreateAppointment, type UpdateAppointment } from "./_lib/schemas";

export type Appointment = typeof appointments.$inferSelect;

export function listAppointments(userId: string): Promise<Appointment[]> {
  return db.select().from(appointments).where(eq(appointments.userId, userId)).orderBy(desc(appointments.date));
}

export async function createAppointment(userId: string, input: CreateAppointment): Promise<Appointment> {
  const [row] = await db
    .insert(appointments)
    .values({
      id: crypto.randomUUID(),
      userId,
      title: input.title,
      appointmentType: input.appointmentType ?? "doctor",
      provider: input.provider ?? null,
      location: input.location ?? null,
      date: input.date,
      durationMinutes: input.durationMinutes ?? null,
      status: input.status ?? "upcoming",
      notes: input.notes ?? null,
      followUp: input.followUp ?? null,
    })
    .returning();
  return row;
}

export async function updateAppointment(userId: string, id: string, patch: UpdateAppointment): Promise<Appointment> {
  const columns: Partial<typeof appointments.$inferInsert> = {};
  for (const key of ["title", "appointmentType", "provider", "location", "date", "durationMinutes", "status", "notes", "followUp"] as const) {
    if (patch[key] !== undefined) (columns as Record<string, unknown>)[key] = patch[key];
  }
  const [row] =
    Object.keys(columns).length === 0
      ? await db.select().from(appointments).where(and(eq(appointments.id, id), eq(appointments.userId, userId))).limit(1)
      : await db.update(appointments).set({ ...columns, updatedAt: new Date() }).where(and(eq(appointments.id, id), eq(appointments.userId, userId))).returning();
  if (!row) throw new HttpError(notFound("Appointment not found"));
  return row;
}

export async function deleteAppointment(userId: string, id: string): Promise<void> {
  const deleted = await db.delete(appointments).where(and(eq(appointments.id, id), eq(appointments.userId, userId))).returning({ id: appointments.id });
  if (deleted.length === 0) throw new HttpError(notFound("Appointment not found"));
}

export const GET: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    return json({ appointments: await listAppointments(userId) });
  });

export const POST: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    return json({ appointment: await createAppointment(userId, await readJson(request, createAppointmentSchema)) }, 201);
  });

export const item = {
  PATCH: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json({ appointment: await updateAppointment(userId, params.id, await readJson(request, updateAppointmentSchema)) });
    })) satisfies ApiHandler,
  DELETE: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await deleteAppointment(userId, params.id);
      return noContent();
    })) satisfies ApiHandler,
};
