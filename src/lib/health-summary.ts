import { toISODate } from "./dates";
import type { HealthDay, HealthField } from "./health-day";

export interface HealthReading {
  value: number;
  startDate: string;
  endDate: string;
}

export interface SleepSegment extends HealthReading {
  sleepState?: string;
}

/** What Health hands back for a span of days: day totals for the counters, raw samples for the rest. */
export interface HealthSamples {
  steps: HealthReading[];
  activeCalories: HealthReading[];
  restingHeartRate: HealthReading[];
  hrv: HealthReading[];
  spo2: HealthReading[];
  /** `value` is minutes. */
  sleep: SleepSegment[];
}

const ASLEEP_STATES = new Set(["asleep", "rem", "deep", "light"]);
/** A night belongs to the day it ends on; sleep that ends after 18:00 is the next day's. */
export const SLEEP_DAY_SHIFT_MS = 6 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

const round = (value: number, places = 0) => Math.round(value * 10 ** places) / 10 ** places;
const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
/** HealthKit reports saturation as a fraction; a percentage is what the metric stores. */
const asPercent = (value: number) => (value <= 1 ? value * 100 : value);

const startDay = (reading: HealthReading) => toISODate(new Date(reading.startDate));
const sleepDay = (segment: SleepSegment) => toISODate(new Date(new Date(segment.endDate).getTime() + SLEEP_DAY_SHIFT_MS));

/**
 * Hours asleep, counting a minute once however many sources reported it: a
 * watch and a phone both record the same night, and their segments overlap.
 */
export function hoursAsleep(segments: SleepSegment[]): number {
  const spans = segments
    .filter((segment) => segment.sleepState !== undefined && ASLEEP_STATES.has(segment.sleepState))
    .map((segment) => [new Date(segment.startDate).getTime(), new Date(segment.endDate).getTime()] as const)
    .sort((a, b) => a[0] - b[0]);

  let total = 0;
  let coveredUntil = -Infinity;
  for (const [start, end] of spans) {
    if (end <= coveredUntil) continue;
    total += end - Math.max(start, coveredUntil);
    coveredUntil = end;
  }
  return total / MS_PER_HOUR;
}

/** One `HealthDay` per day Health had anything for, oldest first; a reading of nothing is left out. */
export function summarizeHealth(samples: HealthSamples): HealthDay[] {
  const days = new Map<string, HealthDay>();
  const record = (date: string, field: HealthField, value: number) => {
    if (!(value > 0)) return;
    days.set(date, { ...(days.get(date) ?? { date }), [field]: value });
  };

  for (const total of samples.steps) record(startDay(total), "steps", round(total.value));
  for (const total of samples.activeCalories) record(startDay(total), "activeCalories", round(total.value));

  const values = (readings: HealthReading[]) => readings.map((reading) => reading.value);
  for (const [date, readings] of Map.groupBy(samples.restingHeartRate, startDay)) record(date, "restingHeartRate", round(average(values(readings))));
  for (const [date, readings] of Map.groupBy(samples.hrv, startDay)) record(date, "hrv", round(average(values(readings))));
  for (const [date, readings] of Map.groupBy(samples.spo2, startDay)) record(date, "spo2", round(asPercent(average(values(readings))), 1));
  for (const [date, segments] of Map.groupBy(samples.sleep, sleepDay)) record(date, "sleepDuration", round(hoursAsleep(segments), 1));

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}
