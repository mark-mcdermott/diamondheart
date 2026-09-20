"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import {
  createCategory as createCategoryRow,
  deleteCategory as deleteCategoryRow,
  renameCategory as renameCategoryRow,
} from "@/server/api/categories";
import { asResult, type ActionResult } from "./api-result";

/** Thin wrappers over `src/server/api/categories.ts`, kept until Phase 3 moves the clients onto `/api/categories`. */

export type { ActionResult };

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const name = text(formData, "name");
  if (!name) return { success: false, error: "Name is required" };

  const result = await asResult(() => createCategoryRow(session.userId, name));
  revalidatePath("/metrics");
  return result;
}

export async function renameCategory(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const categoryId = text(formData, "categoryId");
  const name = text(formData, "name");
  if (!categoryId || !name) return { success: false, error: "Category and name are required" };

  const result = await asResult(() => renameCategoryRow(session.userId, categoryId, name));
  revalidatePath("/metrics");
  revalidatePath("/settings");
  return result;
}

export async function deleteCategory(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const categoryId = text(formData, "categoryId");
  if (!categoryId) return { success: false, error: "Category ID is required" };

  const result = await asResult(() => deleteCategoryRow(session.userId, categoryId));
  revalidatePath("/metrics");
  revalidatePath("/settings");
  return result;
}
