import { Capacitor } from "@capacitor/core";
import type { HealthDataType } from "@capgo/capacitor-health";
import { api } from "@/app/api";
import { startOfDay, toISODate } from "./dates";
import type { HealthDay } from "./health-day";
import { summarizeHealth, type HealthReading } from "./health-summary";

const READ_TYPES: HealthDataType[] = ["steps", "calories", "restingHeartRate", "heartRateVariability", "oxygenSaturation", "sleep"];
/** Each sync resends this many days, so a day missed while the app was closed is filled in. */
const SYNC_DAYS = 7;
/** The plugin stops at 100 samples unless told otherwise; a week of sleep stages is several hundred. */
const SAMPLE_LIMIT = 5000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const AUTO_SYNC_INTERVAL_MS = 60 * 60 * 1000;

/** Apple Health exists on the iPhone build only. */
export function healthSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

/**
 * Shows Apple's permission sheet. iOS never says which types were allowed to
 * be read, so true means only that Health is there and the sheet was answered.
 */
export async function requestHealthAccess(): Promise<boolean> {
  if (!healthSupported()) return false;
  const { Health } = await import("@capgo/capacitor-health");
  const { available } = await Health.isAvailable();
  if (!available) return false;
  await Health.requestAuthorization({ read: READ_TYPES });
  return true;
}

/** A type Health cannot answer for is read as empty, so one missing reading does not cost the others. */
const orNone = (query: Promise<{ samples: HealthReading[] }>) => query.then((result) => result.samples).catch(() => []);

export async function readHealthDays(now = new Date()): Promise<HealthDay[]> {
  const { Health } = await import("@capgo/capacitor-health");
  const firstDay = new Date(startOfDay(now).getTime() - (SYNC_DAYS - 1) * MS_PER_DAY);
  const range = { startDate: firstDay.toISOString(), endDate: now.toISOString() };
  const dayTotals = (dataType: HealthDataType) => orNone(Health.queryAggregated({ dataType, ...range, bucket: "day", aggregation: "sum" }));
  const samples = (dataType: HealthDataType) => orNone(Health.readSamples({ dataType, ...range, limit: SAMPLE_LIMIT, ascending: true }));

  const [steps, activeCalories, restingHeartRate, hrv, spo2, sleep] = await Promise.all([
    dayTotals("steps"),
    dayTotals("calories"),
    samples("restingHeartRate"),
    samples("heartRateVariability"),
    samples("oxygenSaturation"),
    samples("sleep"),
  ]);
  return summarizeHealth({ steps, activeCalories, restingHeartRate, hrv, spo2, sleep });
}

/** Reads the recent days from Health and stores them; resolves to how many readings were stored. */
export async function syncHealth(now = new Date()): Promise<number> {
  const days = await readHealthDays(now);
  // A sync with nothing to report still counts as one, so "last synced" is honest.
  const { entries } = await api.integrations.healthkit.sync(days.length > 0 ? days : [{ date: toISODate(now) }]);
  return entries;
}

/** Whether enough time has passed since the last sync for the app to run one unasked. */
export function healthSyncDue(lastSyncAt: string | null, now = Date.now()): boolean {
  return lastSyncAt === null || now - new Date(lastSyncAt).getTime() >= AUTO_SYNC_INTERVAL_MS;
}
