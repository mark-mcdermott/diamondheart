import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { integrationConnections } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { refreshOuraToken, syncOuraData } from "@/lib/server/oura";

export async function POST(request: Request) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.json({ error: "Oura not configured" }, { status: 500 });

  const [conn] = await db.select().from(integrationConnections).where(and(eq(integrationConnections.userId, session.userId), eq(integrationConnections.service, "oura"), eq(integrationConnections.status, "active")));
  if (!conn) return NextResponse.json({ error: "No active Oura connection" }, { status: 404 });

  let dateStr: string;
  try { const body = await request.json(); dateStr = body.date || new Date().toISOString().split("T")[0]; } catch { dateStr = new Date().toISOString().split("T")[0]; }

  try {
    const accessToken = await refreshOuraToken(conn.id, clientId, clientSecret);
    const result = await syncOuraData(conn.id, accessToken, dateStr);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    await db.update(integrationConnections).set({ lastSyncError: message, updatedAt: new Date() }).where(eq(integrationConnections.id, conn.id));
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
