import type { APIRoute } from "astro";
import { resolveSession } from "@/server/api/_lib/session";
import { db } from "@/db";
import { integrationConnections } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const session = await resolveSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await db.select().from(integrationConnections).where(and(eq(integrationConnections.userId, session.userId), eq(integrationConnections.service, "healthkit")));

  if (existing.length > 0) {
    await db.update(integrationConnections).set({ status: "active", lastSyncError: null, updatedAt: new Date() }).where(eq(integrationConnections.id, existing[0].id));
    return Response.json({ ok: true, connectionId: existing[0].id });
  }

  const id = crypto.randomUUID();
  await db.insert(integrationConnections).values({ id, userId: session.userId, service: "healthkit", status: "active" });
  return Response.json({ ok: true, connectionId: id });
};
