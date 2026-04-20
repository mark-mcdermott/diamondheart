import { CHART_PALETTE } from "@/lib/chart-utils";

type CategorizedItem = { count: number; category: string | null };

/**
 * Maps each category to a stable color drawn from CHART_PALETTE.
 * Ordering mirrors the tracking chart (highest total count first) so the
 * chart bars and category cards share the same color for each category.
 */
export function getCategoryColorMap(items: CategorizedItem[]): Map<string, string> {
  const totals = new Map<string, number>();
  for (const item of items) {
    const cat = item.category || "Uncategorized";
    totals.set(cat, (totals.get(cat) || 0) + item.count);
  }

  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  const map = new Map<string, string>();
  sorted.forEach(([cat], idx) => {
    map.set(cat, CHART_PALETTE[idx % CHART_PALETTE.length]);
  });
  return map;
}
