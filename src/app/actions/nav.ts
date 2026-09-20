"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { TRACKING_SECTIONS } from "@/lib/nav-utils";
import { asResult, type ActionResult } from "./api-result";
import {
  categoryNavStatus,
  readNavItems,
  reorderNav,
  setCategoryInNav,
  setNavItemVisibility,
  setSectionInNav,
  trackingSectionStatus,
} from "@/server/api/nav";

/**
 * Thin wrappers over `src/server/api/nav.ts`, kept until Phase 3 of the port
 * moves the clients onto `/api/nav`. The logic lives there now; these only
 * translate a form field and a toggle into an explicit `visible` value.
 */

export async function getNavItems(userId: string) {
  return readNavItems(userId);
}

export async function getTrackingSectionStatus(userId: string) {
  return trackingSectionStatus(userId);
}

export async function getCategoryNavStatus(userId: string, categoryIds: string[]) {
  return categoryNavStatus(userId, categoryIds);
}

export async function toggleNavItemVisibility(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const itemId = formData.get("itemId");
  if (typeof itemId !== "string" || !itemId) return { success: false, error: "Item ID is required" };

  const item = (await readNavItems(session.userId)).find((i) => i.id === itemId);
  if (!item) return { success: false, error: "Item not found" };

  const result = await asResult(() => setNavItemVisibility(session.userId, itemId, !item.visible));
  revalidatePath("/settings");
  revalidatePath("/metrics");
  return result;
}

export async function reorderNavItems(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const idsJson = formData.get("ids");
  if (typeof idsJson !== "string" || !idsJson) return { success: false, error: "IDs are required" };

  let ids: string[];
  try {
    ids = JSON.parse(idsJson);
  } catch {
    return { success: false, error: "Invalid IDs" };
  }

  const result = await asResult(() => reorderNav(session.userId, ids));
  revalidatePath("/settings");
  return result;
}

export async function toggleCategoryInNav(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const categoryId = formData.get("categoryId");
  if (typeof categoryId !== "string" || !categoryId) return { success: false, error: "Category ID is required" };

  const existing = (await readNavItems(session.userId)).find(
    (i) => i.itemType === "metric_category" && i.referenceId === categoryId
  );

  const result = await asResult(() =>
    setCategoryInNav(session.userId, categoryId, existing ? !existing.visible : true)
  );
  revalidatePath("/settings");
  revalidatePath("/metrics");
  return result;
}

export async function toggleTrackingSectionInNav(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const sectionHref = formData.get("sectionHref");
  if (typeof sectionHref !== "string" || !sectionHref) return { success: false, error: "Section href is required" };

  const section = TRACKING_SECTIONS.find((s) => s.href === sectionHref);
  if (!section) return { success: false, error: "Section not found" };

  const current = (await readNavItems(session.userId)).find(
    (i) => i.itemType === "tracking_section" && i.href === sectionHref
  );
  if (!current) return { success: false, error: "Section not found" };

  const result = await asResult(() => setSectionInNav(session.userId, section.key, !current.visible));
  revalidatePath("/settings");
  revalidatePath("/metrics");
  return result;
}
