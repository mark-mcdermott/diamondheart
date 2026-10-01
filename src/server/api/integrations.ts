import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { integrationConnections, integrationSyncLog, trackerEntries, trackerMetrics } from "@/db/schema";
import { HEALTH_FIELDS, type HealthDay, type HealthField } from "@/lib/health-day";
import { ensureBiometricMetrics } from "@/lib/server/biometrics";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { HttpError, handler, json, noContent, notFound, readJson } from "./_lib/http";
import { healthkitSyncSchema } from "./_lib/schemas";

export interface IntegrationConnection {
  id: string;
  service: string;
  status: string;
  lastSyncAt: Date | null;
  lastSyncError: string | null;
}

const HEALTHKIT = "healthkit";
/** Marks an entry as Health's, so a re-sync replaces its own readings and nothing typed by hand. */
const HEALTHKIT_SOURCE = "source:healthkit";

const HEALTH_METRIC_SLUGS: Record<HealthField, string> = {
  steps: "bio-steps",
  activeCalories: "bio-active-calories",
  restingHeartRate: "bio-resting-hr",
  hrv: "bio-hrv",
  spo2: "bio-spo2",
  sleepDuration: "bio-sleep-duration",
};

const connectionColumns = {
  id: integrationConnections.id,
  service: integrationConnections.service,
  status: integrationConnections.status,
  lastSyncAt: integrationConnections.lastSyncAt,
  lastSyncError: integrationConnections.lastSyncError,
};

export function listConnections(userId: string): Promise<IntegrationConnection[]> {
  return db.select(connectionColumns).from(integrationConnections).where(eq(integrationConnections.userId, userId));
}

const ownHealthkit = (userId: string) => and(eq(integrationConnections.userId, userId), eq(integrationConnections.service, HEALTHKIT));

/** Idempotent: connecting again reactivates the connection the account already has. */
export async function connectHealthkit(userId: string): Promise<IntegrationConnection> {
  const [reactivated] = await db
    .update(integrationConnections)
    .set({ status: "active", lastSyncError: null, updatedAt: new Date() })
    .where(ownHealthkit(userId))
    .returning(connectionColumns);
  if (reactivated) return reactivated;

  const [created] = await db
    .insert(integrationConnections)
    .values({ id: crypto.randomUUID(), userId, service: HEALTHKIT, status: "active" })
    .returning(connectionColumns);
  return created;
}

export async function disconnectHealthkit(userId: string): Promise<void> {
  const disconnected = await db
    .update(integrationConnections)
    .set({ status: "disconnected", updatedAt: new Date() })
    .where(ownHealthkit(userId))
    .returning({ id: integrationConnections.id });
  if (disconnected.length === 0) throw new HttpError(notFound("Apple Health is not connected"));
}

/** Entries carry a timestamp, a day of readings does not: noon UTC keeps it on its day in every timezone the app is used in. */
const entryDate = (day: string) => new Date(`${day}T12:00:00Z`);

/**
 * Stores each day's readings as entries on the account's biometric metrics.
 * The phone resends its recent days every time, with today's totals still
 * growing, so a reading replaces the one Health gave for that metric and day
 * before. A reading the phone left out leaves what is stored alone.
 */
export async function syncHealthkit(userId: string, days: HealthDay[]): Promise<{ entries: number }> {
  const [connection] = await db
    .select({ id: integrationConnections.id })
    .from(integrationConnections)
    .where(and(ownHealthkit(userId), eq(integrationConnections.status, "active")))
    .limit(1);
  if (!connection) throw new HttpError(notFound("Apple Health is not connected"));

  await ensureBiometricMetrics(userId);
  const metrics = await db
    .select({ id: trackerMetrics.id, slug: trackerMetrics.slug })
    .from(trackerMetrics)
    .where(and(eq(trackerMetrics.userId, userId), inArray(trackerMetrics.slug, Object.values(HEALTH_METRIC_SLUGS))));
  const metricIdBySlug = new Map(metrics.map((metric) => [metric.slug, metric.id]));

  const entries = days.flatMap((day) =>
    HEALTH_FIELDS.flatMap((field) => {
      const value = day[field];
      const metricId = metricIdBySlug.get(HEALTH_METRIC_SLUGS[field]);
      if (value === undefined || !metricId) return [];
      return [{ id: crypto.randomUUID(), userId, metricId, value: String(value), notes: HEALTHKIT_SOURCE, date: entryDate(day.date) }];
    })
  );

  const now = new Date();
  const markSynced = db.update(integrationConnections).set({ lastSyncAt: now, lastSyncError: null, updatedAt: now }).where(eq(integrationConnections.id, connection.id));
  if (entries.length === 0) {
    await markSynced;
    return { entries: 0 };
  }

  const datesByMetric = Map.groupBy(entries, (entry) => entry.metricId);
  const replaced = or(...[...datesByMetric].map(([metricId, own]) => and(eq(trackerEntries.metricId, metricId), inArray(trackerEntries.date, own.map((entry) => entry.date)))));
  const newestDay = days.map((day) => day.date).sort().at(-1) ?? days[0].date;

  await db.batch([
    db.delete(trackerEntries).where(and(eq(trackerEntries.userId, userId), eq(trackerEntries.notes, HEALTHKIT_SOURCE), replaced)),
    db.insert(trackerEntries).values(entries),
    markSynced,
    db.insert(integrationSyncLog).values({ id: crypto.randomUUID(), connectionId: connection.id, syncType: "daily", syncDate: newestDay, entriesCreated: entries.length, status: "success" }),
  ]);
  return { entries: entries.length };
}

/** The account's connections, and whether Oura can be offered at all (it needs a client id on the server). */
export const GET: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    return json({ connections: await listConnections(userId), ouraConfigured: Boolean(process.env.OURA_CLIENT_ID) });
  });

export const healthkit = {
  connect: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json({ connection: await connectHealthkit(userId) });
    })) satisfies ApiHandler,

  disconnect: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await disconnectHealthkit(userId);
      return noContent();
    })) satisfies ApiHandler,

  sync: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const { days } = await readJson(request, healthkitSyncSchema);
      return json(await syncHealthkit(userId, days));
    })) satisfies ApiHandler,
};
