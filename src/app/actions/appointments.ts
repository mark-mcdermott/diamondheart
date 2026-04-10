"use server";

import { db } from "@/db";
import { appointments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { success: boolean; error?: string };

export async function addAppointment(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const title = formData.get("title") as string;
  const date = formData.get("date") as string;
  if (!title || !date) return { success: false, error: "Title and date are required" };

  await db.insert(appointments).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    title,
    appointmentType: (formData.get("appointmentType") as string) || "doctor",
    provider: (formData.get("provider") as string) || null,
    location: (formData.get("location") as string) || null,
    date: new Date(date),
    durationMinutes: formData.get("durationMinutes") ? parseInt(formData.get("durationMinutes") as string) : null,
    status: (formData.get("status") as string) || "upcoming",
    notes: (formData.get("notes") as string) || null,
    followUp: (formData.get("followUp") as string) || null,
  });

  revalidatePath("/appointments");
  return { success: true };
}

export async function updateAppointment(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const appointmentId = formData.get("appointmentId") as string;
  if (!appointmentId) return { success: false, error: "Appointment ID required" };

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  const title = formData.get("title") as string;
  if (title) updates.title = title;

  const appointmentType = formData.get("appointmentType") as string;
  if (appointmentType) updates.appointmentType = appointmentType;

  updates.provider = (formData.get("provider") as string) || null;
  updates.location = (formData.get("location") as string) || null;

  const date = formData.get("date") as string;
  if (date) updates.date = new Date(date);

  const durationMinutes = formData.get("durationMinutes") as string;
  updates.durationMinutes = durationMinutes ? parseInt(durationMinutes) : null;

  const status = formData.get("status") as string;
  if (status) updates.status = status;

  updates.notes = (formData.get("notes") as string) || null;
  updates.followUp = (formData.get("followUp") as string) || null;

  await db.update(appointments)
    .set(updates)
    .where(and(eq(appointments.id, appointmentId), eq(appointments.userId, session.userId)));

  revalidatePath("/appointments");
  return { success: true };
}

export async function deleteAppointment(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const appointmentId = formData.get("appointmentId") as string;
  await db.delete(appointments)
    .where(and(eq(appointments.id, appointmentId), eq(appointments.userId, session.userId)));

  revalidatePath("/appointments");
  return { success: true };
}
