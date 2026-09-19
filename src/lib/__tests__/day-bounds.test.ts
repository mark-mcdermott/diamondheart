import { describe, it, expect } from "vitest";
import { startOfDay, dayBounds, todayStart, daysAgo } from "@/lib/dates";

describe("startOfDay", () => {
  it("zeroes the time without mutating the input", () => {
    const input = new Date(2026, 8, 19, 14, 32, 7, 500);
    const out = startOfDay(input);
    expect(out.getHours()).toBe(0);
    expect(out.getMinutes()).toBe(0);
    expect(out.getSeconds()).toBe(0);
    expect(out.getMilliseconds()).toBe(0);
    expect(input.getHours()).toBe(14);
  });
});

describe("dayBounds", () => {
  it("spans exactly one day", () => {
    const { start, end } = dayBounds(new Date(2026, 8, 19, 9, 0));
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("gives the same window for any time on that day", () => {
    const morning = dayBounds(new Date(2026, 8, 19, 0, 0, 0));
    const evening = dayBounds(new Date(2026, 8, 19, 23, 59, 59));
    expect(morning.start.getTime()).toBe(evening.start.getTime());
    expect(morning.end.getTime()).toBe(evening.end.getTime());
  });

  it("is half-open: the next midnight belongs to the following day", () => {
    const { start, end } = dayBounds(new Date(2026, 8, 19, 12, 0));
    const nextMidnight = new Date(2026, 8, 20, 0, 0, 0, 0);
    expect(end.getTime()).toBe(nextMidnight.getTime());
    expect(dayBounds(nextMidnight).start.getTime()).toBe(end.getTime());
    expect(nextMidnight.getTime()).toBeGreaterThanOrEqual(start.getTime());
  });

  it("crosses a month boundary", () => {
    const { start, end } = dayBounds(new Date(2026, 8, 30, 18, 0));
    expect(start.getDate()).toBe(30);
    expect(end.getMonth()).toBe(9);
    expect(end.getDate()).toBe(1);
  });

  it("handles a leap day", () => {
    const { start, end } = dayBounds(new Date(2028, 1, 29, 8, 0));
    expect(start.getDate()).toBe(29);
    expect(end.getMonth()).toBe(2);
    expect(end.getDate()).toBe(1);
  });
});

describe("todayStart / daysAgo", () => {
  it("todayStart is midnight today", () => {
    const t = todayStart();
    const now = new Date();
    expect(t.getDate()).toBe(now.getDate());
    expect(t.getHours()).toBe(0);
  });

  it("daysAgo(n) is n days before today at midnight", () => {
    const seven = daysAgo(7);
    expect(seven.getHours()).toBe(0);
    const diff = todayStart().getTime() - seven.getTime();
    // Allow for a DST shift changing the elapsed hours.
    expect(diff / (24 * 60 * 60 * 1000)).toBeCloseTo(7, 1);
  });

  it("daysAgo(0) equals todayStart", () => {
    expect(daysAgo(0).getTime()).toBe(todayStart().getTime());
  });
});

describe("metric value types", () => {
  it("offers every type the seed data actually uses", async () => {
    const { VALUE_TYPES } = await import("@/lib/metric-types");
    const offered = new Set(VALUE_TYPES.map((t) => t.value));
    // 14 seeded metrics (weight among them) are stored as "number"; if the
    // picker cannot represent a stored type, editing silently rewrites it.
    for (const used of ["none", "number", "int", "float", "text", "bool"]) {
      expect(offered.has(used as never), `picker is missing "${used}"`).toBe(true);
    }
  });

  it("treats number, int and float as numeric", async () => {
    const { isNumericValueType } = await import("@/lib/metric-types");
    expect(isNumericValueType("number")).toBe(true);
    expect(isNumericValueType("int")).toBe(true);
    expect(isNumericValueType("float")).toBe(true);
    expect(isNumericValueType("text")).toBe(false);
    expect(isNumericValueType("bool")).toBe(false);
    expect(isNumericValueType("none")).toBe(false);
  });
});
