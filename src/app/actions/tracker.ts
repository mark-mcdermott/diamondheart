"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { readPreferences } from "@/server/api/preferences";
import * as metrics from "@/server/api/metrics";
import { asResult, type ActionResult } from "./api-result";

/** The dashboard's quick-log, the last tracker action; it moves with the dashboard page. */

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

