import { describe, it, expect } from "vitest";
import { movingAverage, movingAverageWindow } from "@/lib/chart-utils";
import { TIME_RANGES } from "@/lib/chart-utils";

describe("movingAverage", () => {
  it("averages the trailing window", () => {
    expect(movingAverage([1, 2, 3, 4, 5], 3)).toEqual([1, 1.5, 2, 3, 4]);
  });

  it("ramps up rather than dropping the first points", () => {
    // The first value has only itself to average.
    expect(movingAverage([10, 20], 5)).toEqual([10, 15]);
  });

  it("returns the value itself for a single data point", () => {
    expect(movingAverage([80.4], 7)).toEqual([80.4]);
  });

  it("is empty for an empty series", () => {
    expect(movingAverage([], 7)).toEqual([]);
  });

  it("skips gaps instead of treating them as zero", () => {
    // A missed day is missing data, not a weight of 0.
    expect(movingAverage([80, null, 82], 3)).toEqual([80, 80, 81]);
  });

  it("is null until the first reading", () => {
    expect(movingAverage([null, null, 70], 3)).toEqual([null, null, 70]);
  });

  it("is null when the whole window is empty", () => {
    expect(movingAverage([null, null], 2)).toEqual([null, null]);
  });

  it("ignores NaN the same way it ignores gaps", () => {
    expect(movingAverage([80, NaN, 82], 3)).toEqual([80, 80, 81]);
  });

  it("smooths a spike rather than following it", () => {
    const raw = [80, 80, 90, 80, 80];
    const smoothed = movingAverage(raw, 3) as number[];
    expect(smoothed[2]).toBeLessThan(90);
    expect(smoothed[2]).toBeGreaterThan(80);
  });

  it("rounds to two decimals", () => {
    expect(movingAverage([1, 2], 2)).toEqual([1, 1.5]);
    expect(movingAverage([1, 1, 2], 3)).toEqual([1, 1, 1.33]);
  });

  it("with window 1 returns the series unchanged", () => {
    expect(movingAverage([5, 6, 7], 1)).toEqual([5, 6, 7]);
  });

  it("rejects a window below 1", () => {
    expect(() => movingAverage([1], 0)).toThrow(/window must be >= 1/);
  });
});

describe("movingAverageWindow", () => {
  it("covers every time range", () => {
    for (const { value } of TIME_RANGES) {
      const w = movingAverageWindow(value);
      expect(Number.isInteger(w), `${value} gave ${w}`).toBe(true);
      expect(w).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps the week window short enough to still show a shape", () => {
    // 7 daily buckets averaged over 7 would be a flat line.
    expect(movingAverageWindow("week")).toBeLessThan(7);
  });
});

describe("measurementDomain", () => {
  it("brackets the data instead of anchoring at zero", async () => {
    const { measurementDomain } = await import("@/lib/chart-utils");
    // Body weight plotted from 0 is a flat line at the top of the chart.
    const [min, max] = measurementDomain([79, 84], null)!;
    expect(min).toBeGreaterThan(70);
    expect(min).toBeLessThan(79);
    expect(max).toBeGreaterThan(84);
  });

  it("gives a single reading a visible band rather than a zero-height axis", async () => {
    const { measurementDomain } = await import("@/lib/chart-utils");
    const [min, max] = measurementDomain([80.4], null)!;
    expect(max).toBeGreaterThan(min);
    expect(min).toBeLessThan(80.4);
    expect(max).toBeGreaterThan(80.4);
  });

  it("does the same for a perfectly flat series", async () => {
    const { measurementDomain } = await import("@/lib/chart-utils");
    const [min, max] = measurementDomain([70, 70, 70], null)!;
    expect(max).toBeGreaterThan(min);
  });

  it("ignores gaps", async () => {
    const { measurementDomain } = await import("@/lib/chart-utils");
    expect(measurementDomain([80, null, 82], null)).toEqual(
      measurementDomain([80, 82], null)
    );
  });

  it("is undefined with nothing to plot, so the axis can fall back", async () => {
    const { measurementDomain } = await import("@/lib/chart-utils");
    expect(measurementDomain([], null)).toBeUndefined();
    expect(measurementDomain([null, null], null)).toBeUndefined();
  });

  it("widens to keep the goal line on the chart", async () => {
    const { measurementDomain } = await import("@/lib/chart-utils");
    const [min, max] = measurementDomain([80, 84], 75)!;
    expect(min).toBeLessThan(75);
    expect(max).toBeGreaterThan(84);
  });

  it("does not let a goal narrow the data range", async () => {
    const { measurementDomain } = await import("@/lib/chart-utils");
    const [min, max] = measurementDomain([60, 90], 75)!;
    expect(min).toBeLessThan(60);
    expect(max).toBeGreaterThan(90);
  });
});
