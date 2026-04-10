/**
 * Deduplicate nav items that were created by concurrent auto-seed race conditions.
 * For builtin items, deduplicates by (href, itemType).
 * For metric_category items, deduplicates by (referenceId, itemType).
 * Keeps the item with the lowest sortOrder (the first-created).
 */
export function deduplicateNavItems<
  T extends { id: string; href: string; itemType: string; referenceId: string | null; sortOrder: number }
>(items: T[]): { keep: T[]; removeIds: string[] } {
  if (items.length === 0) return { keep: [], removeIds: [] };

  // Sort by sortOrder ascending to ensure we keep the earliest
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  const seen = new Set<string>();
  const keep: T[] = [];
  const removeIds: string[] = [];

  for (const item of sorted) {
    const key =
      item.itemType === "metric_category" && item.referenceId
        ? `metric_category:${item.referenceId}`
        : `${item.itemType}:${item.href}`;

    if (seen.has(key)) {
      removeIds.push(item.id);
    } else {
      seen.add(key);
      keep.push(item);
    }
  }

  return { keep, removeIds };
}
