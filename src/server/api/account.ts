import { eq } from "drizzle-orm";
import { UTApi } from "uploadthing/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { HttpError, fail, handler, noContent, notFound, readJson } from "./_lib/http";
import { changePasswordSchema } from "./_lib/schemas";

/** Verifies the current password before replacing it; a wrong one is a field error, not a 401. */
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new HttpError(notFound("User not found"));

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new HttpError(fail(422, "Validation failed", { currentPassword: ["Current password is incorrect"] }));
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/** Clears the avatar and, best effort, deletes the file behind it. Nothing to clear is fine. */
export async function removeAvatar(userId: string): Promise<void> {
  const [user] = await db.select({ avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new HttpError(notFound("User not found"));
  if (!user.avatarUrl) return;

  await db.update(users).set({ avatarUrl: null, updatedAt: new Date() }).where(eq(users.id, userId));

  const fileKey = user.avatarUrl.split("/").pop();
  if (fileKey) await new UTApi().deleteFiles(fileKey).catch(() => {});
}

export const password = {
  PATCH: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const { currentPassword, newPassword } = await readJson(request, changePasswordSchema);
      await changePassword(userId, currentPassword, newPassword);
      return noContent();
    })) satisfies ApiHandler,
};

export const avatar = {
  DELETE: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await removeAvatar(userId);
      return noContent();
    })) satisfies ApiHandler,
};
