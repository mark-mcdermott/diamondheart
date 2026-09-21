import { describe, it, expect } from "vitest";
import { getCategoryColorMap } from "../tracking-utils";
import { CHART_PALETTE } from "@/lib/chart-utils";

describe("getCategoryColorMap", () => {
  it("returns an empty map for no items", () => {
    expect(getCategoryColorMap([]).size).toBe(0);
  });

  it("assigns the first palette color to the highest-total category", () => {
    const map = getCategoryColorMap([
      { category: "Health", count: 5 },
      { category: "Places", count: 20 },
      { category: "Outdoors", count: 12 },
    ]);
    expect(map.get("Places")).toBe(CHART_PALETTE[0]);
    expect(map.get("Outdoors")).toBe(CHART_PALETTE[1]);
    expect(map.get("Health")).toBe(CHART_PALETTE[2]);
  });

  it("sums counts per category before ranking", () => {
    const map = getCategoryColorMap([
      { category: "A", count: 3 },
      { category: "A", count: 4 },
      { category: "B", count: 6 },
    ]);
    expect(map.get("A")).toBe(CHART_PALETTE[0]);
    expect(map.get("B")).toBe(CHART_PALETTE[1]);
  });

  it("buckets null categories as 'Uncategorized'", () => {
    const map = getCategoryColorMap([{ category: null, count: 1 }]);
    expect(map.has("Uncategorized")).toBe(true);
  });

  it("wraps around the palette when categories exceed its length", () => {
    const items = Array.from({ length: CHART_PALETTE.length + 1 }, (_, i) => ({
      category: `cat-${i}`,
      count: 100 - i,
    }));
    const map = getCategoryColorMap(items);
    expect(map.get(`cat-${CHART_PALETTE.length}`)).toBe(CHART_PALETTE[0]);
  });
});
