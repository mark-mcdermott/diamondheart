import { createUploadthing, type FileRouter } from "uploadthing/server";
import { resolveSession } from "@/server/api/_lib/session";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { UTApi } from "uploadthing/server";

const f = createUploadthing();

export const uploadRouter = {
  avatarUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async ({ req }) => {
      const session = await resolveSession(req);
      if (!session) throw new Error("Not authenticated");

      // Fetch current avatar so we can delete the old one after upload
      const [user] = await db
        .select({ avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      return { userId: session.userId, oldAvatarUrl: user?.avatarUrl ?? null };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const url = file.ufsUrl;

      await db
        .update(users)
        .set({ avatarUrl: url, updatedAt: new Date() })
        .where(eq(users.id, metadata.userId));

      // Clean up old avatar
      if (metadata.oldAvatarUrl) {
        const oldKey = metadata.oldAvatarUrl.split("/").pop();
        if (oldKey) {
          const utapi = new UTApi();
          await utapi.deleteFiles(oldKey).catch(() => {});
        }
      }

      return { url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
