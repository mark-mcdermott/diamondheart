import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { integrationConnections } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST() {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await db.select().from(integrationConnections).where(and(eq(integrationConnections.userId, session.userId), eq(integrationConnections.service, "healthkit")));

  if (existing.length > 0) {
    await db.update(integrationConnections).set({ status: "active", lastSyncError: null, updatedAt: new Date() }).where(eq(integrationConnections.id, existing[0].id));
    return NextResponse.json({ ok: true, connectionId: existing[0].id });
  }

  const id = crypto.randomUUID();
  await db.insert(integrationConnections).values({ id, userId: session.userId, service: "healthkit", status: "active" });
  return NextResponse.json({ ok: true, connectionId: id });
}
