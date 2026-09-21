import type { APIRoute } from "astro";
import { resolveSession } from "@/server/api/_lib/session";
import { db } from "@/db";
import { integrationConnections, integrationSyncLog, trackerMetrics, trackerEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureBiometricMetrics, BIOMETRIC_METRICS } from "@/lib/server/biometrics";

interface HealthKitPayload {
  date: string;
  steps?: number;
  restingHeartRate?: number;
  hrv?: number;
  sleepDuration?: number;
  activeCalories?: number;
  spo2?: number;
}

const FIELD_TO_SLUG: Record<string, string> = {
  steps: "bio-steps",
  restingHeartRate: "bio-resting-hr",
  hrv: "bio-hrv",
  sleepDuration: "bio-sleep-duration",
  activeCalories: "bio-active-calories",
  spo2: "bio-spo2",
};

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const session = await resolveSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [conn] = await db.select().from(integrationConnections).where(and(eq(integrationConnections.userId, session.userId), eq(integrationConnections.service, "healthkit"), eq(integrationConnections.status, "active")));
  if (!conn) return Response.json({ error: "No active HealthKit connection" }, { status: 404 });

  let payload: HealthKitPayload;
  try { payload = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!payload.date || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) return Response.json({ error: "Invalid date" }, { status: 400 });

  const existingSync = await db.select().from(integrationSyncLog).where(and(eq(integrationSyncLog.connectionId, conn.id), eq(integrationSyncLog.syncDate, payload.date), eq(integrationSyncLog.status, "success")));
  if (existingSync.length > 0) return Response.json({ ok: true, entriesCreated: 0, skipped: true });

  await ensureBiometricMetrics(session.userId);

  const slugs = BIOMETRIC_METRICS.map((m) => m.slug);
  const metrics = await db.select().from(trackerMetrics).where(eq(trackerMetrics.userId, session.userId));
  const metricBySlug = new Map(metrics.filter((m) => slugs.includes(m.slug)).map((m) => [m.slug, m]));

  const entryDate = new Date(`${payload.date}T12:00:00Z`);
  let entriesCreated = 0;

  for (const [field, slug] of Object.entries(FIELD_TO_SLUG)) {
    const value = payload[field as keyof HealthKitPayload];
    if (value == null || typeof value !== "number") continue;
    const metric = metricBySlug.get(slug);
    if (!metric) continue;
    await db.insert(trackerEntries).values({ id: crypto.randomUUID(), userId: session.userId, metricId: metric.id, value: String(value), notes: "source:healthkit", date: entryDate });
    entriesCreated++;
  }

  await db.update(integrationConnections).set({ lastSyncAt: new Date(), lastSyncError: null, updatedAt: new Date() }).where(eq(integrationConnections.id, conn.id));
  await db.insert(integrationSyncLog).values({ id: crypto.randomUUID(), connectionId: conn.id, syncType: "daily", syncDate: payload.date, entriesCreated, status: "success" });

  return Response.json({ ok: true, entriesCreated });
};
