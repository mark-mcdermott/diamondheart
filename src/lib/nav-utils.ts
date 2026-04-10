import type { UserNavItem } from "@/db/schema";

// Default nav items — the canonical list
export const DEFAULT_NAV_ITEMS = [
  { label: "Dashboard",     href: "/dashboard",      itemType: "builtin", sortOrder: 0, visible: true,  locked: true },
  { label: "Meditate",      href: "/meditate",       itemType: "builtin", sortOrder: 1, visible: true,  locked: false },
  { label: "Food",          href: "/food",           itemType: "builtin", sortOrder: 2, visible: true,  locked: false },
  { label: "Tracking",      href: "/tracking",       itemType: "builtin", sortOrder: 3, visible: true,  locked: false },
  { label: "Medical",       href: "/medical",        itemType: "builtin", sortOrder: 4, visible: true,  locked: false },
  { label: "Entertainment", href: "/entertainment",  itemType: "builtin", sortOrder: 5, visible: true,  locked: false },
];

/**
 * Build virtual (in-memory) nav items for a user from defaults.
 * Uses deterministic IDs so they're stable across requests.
 */
export function buildDefaultNavItems(userId: string): UserNavItem[] {
  return DEFAULT_NAV_ITEMS.map((item) => ({
    id: `default-${userId.slice(0, 8)}-${item.href.slice(1)}`,
    userId,
    label: item.label,
    href: item.href,
    itemType: item.itemType,
    referenceId: null,
    sortOrder: item.sortOrder,
    visible: item.visible,
    locked: item.locked,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

/**
 * Check if nav items contain duplicates (same href+itemType appearing more than once).
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
