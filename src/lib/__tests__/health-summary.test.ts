import { describe, it, expect } from "vitest";
import { hoursAsleep, summarizeHealth, type HealthSamples, type SleepSegment } from "@/lib/health-summary";

/** A local wall-clock time as the ISO string Health would report, whatever zone the suite runs in. */
const at = (day: string, time: string) => new Date(`${day}T${time}:00`).toISOString();
const reading = (day: string, time: string, value: number) => ({ value, startDate: at(day, time), endDate: at(day, time) });
const segment = (startDay: string, start: string, endDay: string, end: string, sleepState: string): SleepSegment => ({
  value: 0,
  startDate: at(startDay, start),
  endDate: at(endDay, end),
  sleepState,
});

const none: HealthSamples = { steps: [], activeCalories: [], restingHeartRate: [], hrv: [], spo2: [], sleep: [] };

describe("hoursAsleep", () => {
  it("adds the asleep stages and ignores time in bed or awake", () => {
    const night = [
      segment("2026-09-29", "22:30", "2026-09-30", "06:30", "inBed"),
      segment("2026-09-29", "23:00", "2026-09-30", "01:00", "light"),
      segment("2026-09-30", "01:00", "2026-09-30", "02:30", "deep"),
      segment("2026-09-30", "02:30", "2026-09-30", "02:45", "awake"),
      segment("2026-09-30", "02:45", "2026-09-30", "06:15", "rem"),
    ];
    expect(hoursAsleep(night)).toBe(7);
  });

  it("counts a minute once when two sources report the same night", () => {
    const night = [
      segment("2026-09-29", "23:00", "2026-09-30", "06:00", "asleep"),
      segment("2026-09-29", "23:30", "2026-09-30", "05:00", "light"),
      segment("2026-09-30", "05:30", "2026-09-30", "07:00", "asleep"),
    ];
    expect(hoursAsleep(night)).toBe(8);
  });
});

describe("summarizeHealth", () => {
  it("puts each reading on its local day, oldest first", () => {
    const days = summarizeHealth({
      ...none,
      steps: [reading("2026-09-30", "00:00", 2040.4), reading("2026-09-29", "00:00", 8123)],
      activeCalories: [reading("2026-09-30", "00:00", 310.6)],
    });
    expect(days).toEqual([
      { date: "2026-09-29", steps: 8123 },
      { date: "2026-09-30", steps: 2040, activeCalories: 311 },
    ]);
  });

  it("averages a day's samples and reports saturation as a percentage", () => {
    const [day] = summarizeHealth({
      ...none,
      restingHeartRate: [reading("2026-09-30", "08:00", 57), reading("2026-09-30", "20:00", 60)],
      hrv: [reading("2026-09-30", "03:00", 41.2), reading("2026-09-30", "04:00", 47.4)],
      spo2: [reading("2026-09-30", "03:00", 0.96), reading("2026-09-30", "04:00", 0.98)],
    });
    expect(day).toEqual({ date: "2026-09-30", restingHeartRate: 59, hrv: 44, spo2: 97 });
  });

  it("gives a night to the day it ends on, and an evening's sleep to the next", () => {
    const days = summarizeHealth({
      ...none,
      sleep: [
        segment("2026-09-29", "23:00", "2026-09-30", "06:30", "asleep"),
        segment("2026-09-30", "22:00", "2026-09-30", "23:45", "asleep"),
      ],
    });
    expect(days).toEqual([
      { date: "2026-09-30", sleepDuration: 7.5 },
      { date: "2026-10-01", sleepDuration: 1.8 },
    ]);
  });

  it("leaves out a day Health had nothing for", () => {
    expect(summarizeHealth({ ...none, steps: [reading("2026-09-30", "00:00", 0)] })).toEqual([]);
  });
});
