import type { APIRoute } from "astro";
import { resolveSession } from "@/server/api/_lib/session";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { deviceTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const bodySchema = z.object({
  platform: z.enum(["ios", "android"]),
  token: z.string().min(1).max(512),
});

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const session = await resolveSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { platform, token } = parsed.data;

  await db
    .insert(deviceTokens)
    .values({
      id: crypto.randomUUID(),
      userId: session.userId,
      platform,
      token,
    })
    .onConflictDoUpdate({
      target: deviceTokens.token,
      set: {
        userId: session.userId,
        platform,
        updatedAt: sql`now()`,
      },
    });

  return Response.json({ success: true });
};

export const DELETE: APIRoute = async ({ request }) => {
  const session = await resolveSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await request.json().catch(() => ({}));
  if (!token || typeof token !== "string") {
    return Response.json({ error: "Token required" }, { status: 400 });
  }

  await db
    .delete(deviceTokens)
    .where(and(eq(deviceTokens.userId, session.userId), eq(deviceTokens.token, token)));

  return Response.json({ success: true });
};
