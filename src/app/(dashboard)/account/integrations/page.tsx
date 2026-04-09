import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { integrationConnections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { IntegrationsClient } from "./integrations-client";

export default async function IntegrationsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const connections = await db
    .select({
      id: integrationConnections.id,
      service: integrationConnections.service,
      status: integrationConnections.status,
      lastSyncAt: integrationConnections.lastSyncAt,
      lastSyncError: integrationConnections.lastSyncError,
    })
    .from(integrationConnections)
    .where(eq(integrationConnections.userId, session.userId));

  const ouraConfigured = !!process.env.OURA_CLIENT_ID;

  return (
    <IntegrationsClient
      connections={connections.map((c) => ({
        ...c,
        lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
      }))}
      ouraConfigured={ouraConfigured}
    />
  );
}
