"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import * as tracking from "@/server/api/tracking";
import { asResult, type ActionResult } from "./api-result";

/** Thin wrappers over `src/server/api/tracking.ts`, kept until Phase 3. */

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function run(work: (userId: string) => Promise<unknown>): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };
  const result = await asResult(() => work(session.userId));
  revalidatePath("/tracking");
  return result;
}

export async function addTrackingItem(formData: FormData): Promise<ActionResult> {
  const name = text(formData, "name");
  if (!name) return { success: false, error: "Name is required" };
  return run((userId) =>
    tracking.createItem(userId, {
      name,
      category: text(formData, "category") || null,
      count: Number.parseInt(text(formData, "count"), 10) || 0,
      unit: text(formData, "unit") || null,
      icon: text(formData, "icon") || null,
      notes: text(formData, "notes") || null,
    })
  );
}

export async function updateTrackingCount(formData: FormData): Promise<ActionResult> {
  const delta = Number.parseInt(text(formData, "delta"), 10) || 1;
  return run((userId) => tracking.adjustCount(userId, text(formData, "itemId"), delta));
}

export async function updateTrackingItem(formData: FormData): Promise<ActionResult> {
  const itemId = text(formData, "itemId");
  const name = text(formData, "name");
  if (!itemId || !name) return { success: false, error: "Required fields missing" };
  return run((userId) =>
    tracking.updateItem(userId, itemId, {
      name,
      category: text(formData, "category") || null,
      count: Number.parseInt(text(formData, "count"), 10) || 0,
      unit: text(formData, "unit") || null,
      notes: text(formData, "notes") || null,
    })
  );
}

export async function deleteTrackingItem(formData: FormData): Promise<ActionResult> {
  return run((userId) => tracking.deleteItem(userId, text(formData, "itemId")));
}
