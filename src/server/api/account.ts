import { eq } from "drizzle-orm";
import { UTApi } from "uploadthing/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/server/auth";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { HttpError, fail, handler, noContent, notFound, readJson } from "./_lib/http";
import { changePasswordSchema } from "./_lib/schemas";

/**
 * Delegates to Better Auth, which verifies the current password against
 * `account.password` and rehashes the new one. A wrong current password is a
 * field error, not a 401 — the session is fine.
 */
export async function changePassword(headers: Headers, currentPassword: string, newPassword: string): Promise<void> {
  try {
    await auth.api.changePassword({ body: { currentPassword, newPassword }, headers });
  } catch (cause) {
    if (!(cause instanceof APIError)) throw cause;
    throw new HttpError(fail(422, "Validation failed", { currentPassword: [cause.message || "Current password is incorrect"] }));
  }
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
      await requireSession(request);
      const { currentPassword, newPassword } = await readJson(request, changePasswordSchema);
      await changePassword(request.headers, currentPassword, newPassword);
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
