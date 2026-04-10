/**
 * Check if a list of nav items contains duplicates.
 * Duplicates are detected by (itemType, href) for builtins
 * and (itemType, referenceId) for metric_category items.
 */
export function hasDuplicates(
  items: { href: string; itemType: string; referenceId: string | null }[]
): boolean {
  const seen = new Set<string>();
  for (const item of items) {
    const key =
      item.itemType === "metric_category" && item.referenceId
        ? `metric_category:${item.referenceId}`
        : `${item.itemType}:${item.href}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}
