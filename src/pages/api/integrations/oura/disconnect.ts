import type { APIRoute } from "astro";
import { resolveSession } from "@/server/api/_lib/session";
import { db } from "@/db";
import { integrationConnections } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const session = await resolveSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [conn] = await db.select().from(integrationConnections).where(and(eq(integrationConnections.userId, session.userId), eq(integrationConnections.service, "oura")));
  if (!conn) return Response.json({ error: "No Oura connection found" }, { status: 404 });

  await db.update(integrationConnections).set({ accessToken: null, refreshToken: null, tokenExpiresAt: null, status: "disconnected", updatedAt: new Date() }).where(eq(integrationConnections.id, conn.id));

  return Response.json({ ok: true });
};
