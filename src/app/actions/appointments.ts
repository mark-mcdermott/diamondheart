"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import * as appointments from "@/server/api/appointments";
import { asResult, type ActionResult } from "./api-result";

/** Thin wrappers over `src/server/api/appointments.ts`, kept until Phase 3. */

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function whenOf(formData: FormData): Date | null {
  const raw = text(formData, "date");
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function run(work: (userId: string) => Promise<unknown>): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };
  const result = await asResult(() => work(session.userId));
  revalidatePath("/appointments");
  return result;
}

export async function addAppointment(formData: FormData): Promise<ActionResult> {
  const title = text(formData, "title");
  const date = whenOf(formData);
  if (!title || !date) return { success: false, error: "Title and date are required" };
  const duration = text(formData, "durationMinutes");
  return run((userId) =>
    appointments.createAppointment(userId, {
      title,
      date,
      appointmentType: text(formData, "appointmentType") || "doctor",
      provider: text(formData, "provider") || null,
      location: text(formData, "location") || null,
      durationMinutes: duration ? Number.parseInt(duration, 10) : null,
      status: text(formData, "status") || "upcoming",
      notes: text(formData, "notes") || null,
      followUp: text(formData, "followUp") || null,
    })
  );
}

export async function updateAppointment(formData: FormData): Promise<ActionResult> {
  const appointmentId = text(formData, "appointmentId");
  if (!appointmentId) return { success: false, error: "Appointment ID required" };
  const duration = text(formData, "durationMinutes");
  const date = whenOf(formData);
  return run((userId) =>
    appointments.updateAppointment(userId, appointmentId, {
      ...(text(formData, "title") ? { title: text(formData, "title") } : {}),
      ...(text(formData, "appointmentType") ? { appointmentType: text(formData, "appointmentType") } : {}),
      ...(date ? { date } : {}),
      ...(text(formData, "status") ? { status: text(formData, "status") } : {}),
      provider: text(formData, "provider") || null,
      location: text(formData, "location") || null,
      durationMinutes: duration ? Number.parseInt(duration, 10) : null,
      notes: text(formData, "notes") || null,
      followUp: text(formData, "followUp") || null,
    })
  );
}

export async function deleteAppointment(formData: FormData): Promise<ActionResult> {
  return run((userId) => appointments.deleteAppointment(userId, text(formData, "appointmentId")));
}
