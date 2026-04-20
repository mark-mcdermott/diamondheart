import { describe, it, expect } from "vitest";
import { buildWeekBars } from "@/lib/week-bars";

const REF = new Date(2026, 3, 20); // Mon Apr 20 2026, local time

function day(offsetFromRef: number): string {
  const d = new Date(REF);
  d.setDate(d.getDate() + offsetFromRef);
  return d.toISOString();
}

describe("buildWeekBars", () => {
  it("returns 7 bars ordered oldest → today", () => {
    const bars = buildWeekBars("m1", 10, [], REF);
    expect(bars).toHaveLength(7);
    expect(bars[6].isToday).toBe(true);
    expect(bars.slice(0, 6).every((b) => !b.isToday)).toBe(true);
  });

  it("marks days with no entries as empty", () => {
    const bars = buildWeekBars("m1", 10, [], REF);
    expect(bars.every((b) => b.state === "empty")).toBe(true);
    expect(bars.every((b) => b.value === 0)).toBe(true);
  });

  it("sums numeric entries within the same day", () => {
    const bars = buildWeekBars(
      "m1",
      10,
      [
        { metricId: "m1", value: "3", date: day(0) },
        { metricId: "m1", value: "4", date: day(0) },
      ],
      REF,
    );
    expect(bars[6].value).toBe(7);
    expect(bars[6].state).toBe("partial");
  });

  it("marks goal-met days as met", () => {
    const bars = buildWeekBars(
      "m1",
      10,
      [{ metricId: "m1", value: "10", date: day(0) }],
      REF,
    );
    expect(bars[6].state).toBe("met");
  });

  it("marks over-goal days as met", () => {
    const bars = buildWeekBars(
      "m1",
      10,
      [{ metricId: "m1", value: "25", date: day(0) }],
      REF,
    );
    expect(bars[6].state).toBe("met");
  });

  it("computes ratio clamped to [0, 1]", () => {
    const bars = buildWeekBars(
      "m1",
      10,
      [
        { metricId: "m1", value: "4", date: day(-1) },
        { metricId: "m1", value: "25", date: day(0) },
      ],
      REF,
    );
    expect(bars[5].ratio).toBeCloseTo(0.4);
    expect(bars[6].ratio).toBe(1);
  });

  it("ignores entries from other metrics", () => {
    const bars = buildWeekBars(
      "m1",
      10,
      [{ metricId: "m2", value: "99", date: day(0) }],
      REF,
    );
    expect(bars[6].value).toBe(0);
    expect(bars[6].state).toBe("empty");
  });

  it("ignores entries outside the 7-day window", () => {
    const bars = buildWeekBars(
      "m1",
      10,
      [
        { metricId: "m1", value: "50", date: day(-9) },
        { metricId: "m1", value: "50", date: day(1) },
      ],
      REF,
    );
    expect(bars.every((b) => b.value === 0)).toBe(true);
  });

  it("treats non-numeric values as count of 1", () => {
    const bars = buildWeekBars(
      "m1",
      3,
      [
        { metricId: "m1", value: "done", date: day(0) },
        { metricId: "m1", value: "done", date: day(0) },
      ],
      REF,
    );
    expect(bars[6].value).toBe(2);
    expect(bars[6].state).toBe("partial");
  });

  it("treats goal ≤ 0 as 1 for state threshold", () => {
    const bars = buildWeekBars(
      "m1",
      0,
      [{ metricId: "m1", value: "1", date: day(0) }],
      REF,
    );
    expect(bars[6].state).toBe("met");
  });

  it("places each entry on the correct day offset", () => {
    const bars = buildWeekBars(
      "m1",
      5,
      [
        { metricId: "m1", value: "5", date: day(-6) },
        { metricId: "m1", value: "5", date: day(-3) },
        { metricId: "m1", value: "2", date: day(0) },
      ],
      REF,
    );
    expect(bars[0].state).toBe("met");
    expect(bars[3].state).toBe("met");
    expect(bars[6].state).toBe("partial");
    expect(bars[1].state).toBe("empty");
  });
});
