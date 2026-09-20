import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications, type Notification } from "@/db/schema";
import { sendPushToUser } from "@/lib/server/web-push";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { HttpError, handler, json, noContent, notFound, readJson } from "./_lib/http";
import { notificationReadSchema } from "./_lib/schemas";

export function listNotifications(userId: string): Promise<Notification[]> {
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function unreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return Number(row?.count ?? 0);
}

export async function setRead(userId: string, notificationId: string, read: boolean): Promise<Notification> {
  const [updated] = await db
    .update(notifications)
    .set({ read })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning();
  if (!updated) throw new HttpError(notFound("Notification not found"));
  return updated;
}

export async function markAllRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}

export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  const deleted = await db
    .delete(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning({ id: notifications.id });
  if (deleted.length === 0) throw new HttpError(notFound("Notification not found"));
}

/**
 * Server-side only: creates a notification and pushes it, best effort. This
 * used to be exported from a `"use server"` file, which made it a callable
 * action — any signed-in client could have created notifications for any
 * user. It has no callers today; it stays for the schedulers that will.
 */
export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  href?: string;
  referenceId?: string;
}): Promise<Notification> {
  const [created] = await db
    .insert(notifications)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      referenceId: input.referenceId ?? null,
    })
    .returning();
  sendPushToUser(input.userId, { title: input.title, body: input.body, href: input.href }).catch(() => {});
  return created;
}

export const GET: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    const [list, unread] = await Promise.all([listNotifications(userId), unreadCount(userId)]);
    return json({ notifications: list, unread });
  });

/** `{ read: true }` on the collection marks everything read. */
export const PATCH: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    const { read } = await readJson(request, notificationReadSchema);
    if (read) await markAllRead(userId);
    return json({ unread: await unreadCount(userId) });
  });

export const item = {
  PATCH: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const { read } = await readJson(request, notificationReadSchema);
      return json({ notification: await setRead(userId, params.id, read) });
    })) satisfies ApiHandler,

  DELETE: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await deleteNotification(userId, params.id);
      return noContent();
    })) satisfies ApiHandler,
};
