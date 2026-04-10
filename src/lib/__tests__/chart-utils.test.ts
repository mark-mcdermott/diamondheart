import { describe, it, expect } from "vitest";
import {
  getDateRange,
  formatDateLabel,
  generateDateKeys,
  toDateKey,
  CHART_COLORS,
  CHART_PALETTE,
  MACRO_COLORS,
  TIME_RANGES,
} from "@/lib/chart-utils";

describe("TIME_RANGES", () => {
  it("has 5 ranges", () => {
    expect(TIME_RANGES).toHaveLength(5);
  });

  it("includes week, month, quarter, year, 5year", () => {
    const values = TIME_RANGES.map((r) => r.value);
    expect(values).toEqual(["week", "month", "quarter", "year", "5year"]);
  });
});

describe("getDateRange", () => {
  it("returns start before end for all ranges", () => {
    for (const r of TIME_RANGES) {
      const { start, end } = getDateRange(r.value);
      expect(start.getTime()).toBeLessThan(end.getTime());
    }
  });

  it("week range covers ~7 days", () => {
    const { start, end } = getDateRange("week");
    const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThanOrEqual(6);
    expect(days).toBeLessThan(8);
  });

  it("month range covers ~30 days", () => {
    const { start, end } = getDateRange("month");
    const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThanOrEqual(29);
    expect(days).toBeLessThan(31);
  });
});

describe("formatDateLabel", () => {
  it("returns short weekday for week range", () => {
    const label = formatDateLabel("2026-04-10", "week");
    expect(label).toMatch(/\w{3}/); // e.g. "Thu"
  });

  it("returns month+day for month range", () => {
    const label = formatDateLabel("2026-04-10T12:00:00", "month");
    expect(label).toContain("Apr");
  });

  it("returns month only for year range", () => {
    const label = formatDateLabel("2026-04-10", "year");
    expect(label).toContain("Apr");
  });
});

describe("generateDateKeys", () => {
  it("generates daily keys for week range", () => {
    const keys = generateDateKeys("week");
    expect(keys.length).toBe(7);
    expect(keys[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("generates daily keys for month range", () => {
    const keys = generateDateKeys("month");
    expect(keys.length).toBe(30);
  });

  it("generates monthly keys for year range", () => {
    const keys = generateDateKeys("year");
    expect(keys.length).toBeGreaterThanOrEqual(12);
    expect(keys[0]).toMatch(/^\d{4}-\d{2}$/);
  });

  it("generates monthly keys for 5year range", () => {
    const keys = generateDateKeys("5year");
    expect(keys.length).toBeGreaterThanOrEqual(60);
    expect(keys[0]).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("toDateKey", () => {
  it("returns YYYY-MM-DD for week range", () => {
    expect(toDateKey("2026-04-10T15:30:00Z", "week")).toBe("2026-04-10");
  });

  it("returns YYYY-MM for year range", () => {
    expect(toDateKey("2026-04-10T15:30:00Z", "year")).toMatch(/^2026-04$/);
  });

  it("accepts Date objects", () => {
    const d = new Date("2026-04-10T15:30:00Z");
    expect(toDateKey(d, "month")).toBe("2026-04-10");
  });
});

describe("color constants", () => {
  it("CHART_COLORS has primary color", () => {
    expect(CHART_COLORS.primary).toBe("#a57cf4");
  });

  it("CHART_PALETTE has 8 colors", () => {
    expect(CHART_PALETTE).toHaveLength(8);
  });

  it("MACRO_COLORS has protein, carbs, fat, calories", () => {
    expect(MACRO_COLORS.protein).toBeTruthy();
    expect(MACRO_COLORS.carbs).toBeTruthy();
    expect(MACRO_COLORS.fat).toBeTruthy();
    expect(MACRO_COLORS.calories).toBeTruthy();
  });
});
