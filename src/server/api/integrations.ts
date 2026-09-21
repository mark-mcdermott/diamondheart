import { eq } from "drizzle-orm";
import { db } from "@/db";
import { integrationConnections } from "@/db/schema";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { handler, json } from "./_lib/http";

export interface IntegrationConnection {
  id: string;
  service: string;
  status: string;
  lastSyncAt: Date | null;
  lastSyncError: string | null;
}

export function listConnections(userId: string): Promise<IntegrationConnection[]> {
  return db
    .select({
      id: integrationConnections.id,
      service: integrationConnections.service,
      status: integrationConnections.status,
      lastSyncAt: integrationConnections.lastSyncAt,
      lastSyncError: integrationConnections.lastSyncError,
    })
    .from(integrationConnections)
    .where(eq(integrationConnections.userId, userId));
}

/** The account's connections, and whether Oura can be offered at all (it needs a client id on the server). */
export const GET: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    return json({ connections: await listConnections(userId), ouraConfigured: Boolean(process.env.OURA_CLIENT_ID) });
  });
