"use server";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { success: boolean; error?: string };

export async function getNotifications(userId: string) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function getUnreadCount(userId: string) {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return result?.count ?? 0;
}

export async function markAsRead(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const notificationId = formData.get("notificationId") as string;
  if (!notificationId) return { success: false, error: "Notification ID required" };

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, session.userId)));

  revalidatePath("/");
  return { success: true };
}

export async function markAllAsRead(): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, session.userId), eq(notifications.read, false)));

  revalidatePath("/");
  return { success: true };
}

export async function deleteNotification(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const notificationId = formData.get("notificationId") as string;
  if (!notificationId) return { success: false, error: "Notification ID required" };

  await db
    .delete(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, session.userId)));

  revalidatePath("/");
  return { success: true };
}

export async function createNotification({
  userId,
  type,
  title,
  body,
  href,
  referenceId,
}: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  href?: string;
  referenceId?: string;
}) {
  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    userId,
    type,
    title,
    body: body ?? null,
    href: href ?? null,
    referenceId: referenceId ?? null,
  });
}
