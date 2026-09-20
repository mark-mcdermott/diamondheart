"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { readPreferences } from "@/server/api/preferences";
import * as metrics from "@/server/api/metrics";
import { asResult, type ActionResult } from "./api-result";

/**
 * Thin wrappers over `src/server/api/metrics.ts`, kept until Phase 3 moves the
 * clients onto the endpoints. Values typed into the forms are in the viewer's
 * unit, so each write passes `unit: weightUnit` and the server converts.
 */

export type { ActionResult };

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function viewerUnit(userId: string) {
  return (await readPreferences(userId)).weightUnit;
}

// Quick log from the dashboard — records "done" unless a value is given.
export async function quickLog(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const metricId = text(formData, "metricId");
  if (!metricId) return { success: false, error: "Metric is required" };

  const unit = await viewerUnit(session.userId);
  const result = await asResult(() =>
    metrics.createEntry(session.userId, metricId, { value: text(formData, "value") || "done", unit })
  );
  revalidatePath("/dashboard");
  return result;
}

// The /entry form: value with date, time and notes, then back to the dashboard.
export async function createEntry(formData: FormData): Promise<void> {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const metricId = text(formData, "metricId");
  if (!metricId) return;

  const dateStr = text(formData, "date");
  const timeStr = text(formData, "time");
  let date: Date | undefined;
  if (dateStr && timeStr) date = new Date(`${dateStr}T${timeStr}`);
  else if (dateStr) date = new Date(dateStr);
  if (date && Number.isNaN(date.getTime())) date = undefined;

  const unit = await viewerUnit(session.userId);
  const result = await asResult(() =>
    metrics.createEntry(session.userId, metricId, {
      value: text(formData, "value") || "done",
      date,
      notes: text(formData, "notes") || null,
      unit,
    })
  );
  if (!result.success) return;

  revalidatePath("/dashboard");
  revalidatePath("/metrics");
  redirect("/dashboard");
}

export async function updateMetric(metricId: string, formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const name = text(formData, "name");
  const valueType = text(formData, "valueType");
  if (!name || !valueType) return { success: false, error: "Name and type are required" };

  const dailyGoalStr = text(formData, "dailyGoal");
  const dailyGoal = dailyGoalStr ? parseInt(dailyGoalStr, 10) : 1;

  let fields: unknown = null;
  const fieldsJson = text(formData, "fields");
  if (fieldsJson) {
    try {
      fields = JSON.parse(fieldsJson);
    } catch {
      fields = null;
    }
  }

  const result = await asResult(() =>
    metrics.updateMetric(session.userId, metricId, {
      name,
      valueType,
      unit: text(formData, "unit") || null,
      dailyGoal: Number.isInteger(dailyGoal) && dailyGoal >= 1 ? dailyGoal : 1,
      fields,
      counter: text(formData, "counter") === "true",
      singleValuePerDay: text(formData, "singleValuePerDay") === "true",
    })
  );
  if (!result.success) return result;

  redirect(`/metrics/${metricId}`);
}

export async function deleteEntry(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const entryId = text(formData, "entryId");
  if (!entryId) return { success: false, error: "Entry ID is required" };

  const result = await asResult(() => metrics.deleteEntry(session.userId, entryId));
  revalidatePath("/metrics");
  return result;
}

export async function updateEntry(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const entryId = text(formData, "entryId");
  if (!entryId) return { success: false, error: "Entry ID is required" };

  const unit = await viewerUnit(session.userId);
  const result = await asResult(() =>
    metrics.updateEntry(session.userId, entryId, {
      value: text(formData, "value") || "done",
      notes: text(formData, "notes") || null,
      unit,
    })
  );
  revalidatePath("/metrics");
  return result;
}
