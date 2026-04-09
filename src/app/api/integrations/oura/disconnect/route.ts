import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { integrationConnections } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST() {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [conn] = await db.select().from(integrationConnections).where(and(eq(integrationConnections.userId, session.userId), eq(integrationConnections.service, "oura")));
  if (!conn) return NextResponse.json({ error: "No Oura connection found" }, { status: 404 });

  await db.update(integrationConnections).set({ accessToken: null, refreshToken: null, tokenExpiresAt: null, status: "disconnected", updatedAt: new Date() }).where(eq(integrationConnections.id, conn.id));

  return NextResponse.json({ ok: true });
}
