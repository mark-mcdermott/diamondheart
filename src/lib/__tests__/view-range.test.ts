import { describe, it, expect } from "vitest";
import {
  VIEW_RANGES,
  VIEW_RANGE_VALUES,
  isViewRange,
  viewRangeStart,
  filterByViewRange,
} from "@/lib/view-range";

const ANCHOR = new Date("2026-04-15T12:00:00Z");

describe("VIEW_RANGES", () => {
  it("exposes day, week, month, year in order", () => {
    expect(VIEW_RANGE_VALUES).toEqual(["day", "week", "month", "year"]);
  });

  it("each range has a label and icon", () => {
    for (const r of VIEW_RANGES) {
      expect(r.label).toBeTruthy();
      expect(r.icon).toBeTruthy();
    }
  });
});

describe("isViewRange", () => {
  it.each(["day", "week", "month", "year"])("accepts %s", (v) => {
    expect(isViewRange(v)).toBe(true);
  });

  it.each([null, undefined, "", "quarter", "5year", "DAY"])(
    "rejects %s",
    (v) => {
      expect(isViewRange(v as string | null | undefined)).toBe(false);
    },
  );
});

describe("viewRangeStart", () => {
  it("day starts at local midnight of today", () => {
    const start = viewRangeStart("day", ANCHOR);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    const expected = new Date(ANCHOR);
    expected.setHours(0, 0, 0, 0);
    expect(start.getTime()).toBe(expected.getTime());
  });

  it("week starts 6 days before today at midnight (7-day inclusive window)", () => {
    const start = viewRangeStart("week", ANCHOR);
    const expected = new Date(ANCHOR);
    expected.setHours(0, 0, 0, 0);
    expected.setDate(expected.getDate() - 6);
    expect(start.getTime()).toBe(expected.getTime());
  });

  it("month starts 29 days before today", () => {
    const start = viewRangeStart("month", ANCHOR);
    const expected = new Date(ANCHOR);
    expected.setHours(0, 0, 0, 0);
    expected.setDate(expected.getDate() - 29);
    expect(start.getTime()).toBe(expected.getTime());
  });

  it("year starts 364 days before today", () => {
    const start = viewRangeStart("year", ANCHOR);
    const expected = new Date(ANCHOR);
    expected.setHours(0, 0, 0, 0);
    expected.setDate(expected.getDate() - 364);
    expect(start.getTime()).toBe(expected.getTime());
  });

  it("does not mutate the provided anchor", () => {
    const copy = new Date(ANCHOR);
    viewRangeStart("week", copy);
    expect(copy.getTime()).toBe(ANCHOR.getTime());
  });
});

describe("filterByViewRange", () => {
  const items = [
    { id: "earlier-today", date: new Date("2026-04-15T08:00:00Z") },
    { id: "three-days-ago", date: new Date("2026-04-12T10:00:00Z") },
    { id: "two-weeks-ago", date: new Date("2026-04-01T10:00:00Z") },
    { id: "two-months-ago", date: new Date("2026-02-10T10:00:00Z") },
    { id: "two-years-ago", date: new Date("2024-04-15T10:00:00Z") },
  ];

  it("day keeps only today", () => {
    const result = filterByViewRange(items, "day", ANCHOR).map((i) => i.id);
    expect(result).toEqual(["earlier-today"]);
  });

  it("week keeps items within 7 days", () => {
    const result = filterByViewRange(items, "week", ANCHOR).map((i) => i.id);
    expect(result).toEqual(["earlier-today", "three-days-ago"]);
  });

  it("month keeps items within 30 days", () => {
    const result = filterByViewRange(items, "month", ANCHOR).map((i) => i.id);
    expect(result).toEqual(["earlier-today", "three-days-ago", "two-weeks-ago"]);
  });

  it("year keeps items within 365 days", () => {
    const result = filterByViewRange(items, "year", ANCHOR).map((i) => i.id);
    expect(result).toEqual([
      "earlier-today",
      "three-days-ago",
      "two-weeks-ago",
      "two-months-ago",
    ]);
  });

  it("accepts string dates", () => {
    const result = filterByViewRange(
      [{ date: "2026-04-15T08:00:00Z" }, { date: "2020-01-01T00:00:00Z" }],
      "day",
      ANCHOR,
    );
    expect(result).toHaveLength(1);
  });
});
