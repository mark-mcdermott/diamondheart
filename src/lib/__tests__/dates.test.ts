import { describe, it, expect } from "vitest";
import { parseDate, toISODate } from "@/lib/dates";

describe("parseDate", () => {
  it("parses a valid ISO date string", () => {
    const d = parseDate("2026-04-20");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(20);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it("returns today at midnight when input is undefined", () => {
    const d = parseDate(undefined);
    const now = new Date();
    expect(d.getFullYear()).toBe(now.getFullYear());
    expect(d.getMonth()).toBe(now.getMonth());
    expect(d.getDate()).toBe(now.getDate());
    expect(d.getHours()).toBe(0);
  });

  it("returns today for malformed strings", () => {
    const d = parseDate("not-a-date");
    const now = new Date();
    expect(d.getDate()).toBe(now.getDate());
  });

  it("returns today for wrong format", () => {
    const d = parseDate("04/20/2026");
    const now = new Date();
    expect(d.getDate()).toBe(now.getDate());
  });

  it("returns today for empty string", () => {
    const d = parseDate("");
    const now = new Date();
    expect(d.getDate()).toBe(now.getDate());
  });
});

describe("toISODate", () => {
  it("formats a date as YYYY-MM-DD", () => {
    const d = new Date(2026, 3, 20);
    expect(toISODate(d)).toBe("2026-04-20");
  });

  it("zero-pads single-digit months and days", () => {
    const d = new Date(2026, 0, 5);
    expect(toISODate(d)).toBe("2026-01-05");
  });

  it("round-trips through parseDate", () => {
    const original = "2025-12-31";
    expect(toISODate(parseDate(original))).toBe(original);
  });
});
