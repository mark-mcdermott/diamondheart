"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import * as notifications from "@/server/api/notifications";
import { asResult, type ActionResult } from "./api-result";

/** Thin wrappers over `src/server/api/notifications.ts`, kept until Phase 3 moves the clients onto `/api/notifications`. */

export async function getNotifications(userId: string) {
  return notifications.listNotifications(userId);
}

export async function getUnreadCount(userId: string) {
  return notifications.unreadCount(userId);
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function markAsRead(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const id = text(formData, "notificationId");
  if (!id) return { success: false, error: "Notification ID required" };

  const result = await asResult(() => notifications.setRead(session.userId, id, true));
  revalidatePath("/");
  return result;
}

export async function markAllAsRead(): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const result = await asResult(() => notifications.markAllRead(session.userId));
  revalidatePath("/");
  return result;
}

export async function deleteNotification(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const id = text(formData, "notificationId");
  if (!id) return { success: false, error: "Notification ID required" };

  const result = await asResult(() => notifications.deleteNotification(session.userId, id));
  revalidatePath("/");
  return result;
}
