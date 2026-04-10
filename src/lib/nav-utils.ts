import type { UserNavItem } from "@/db/schema";

// Default nav items — the canonical list
// "builtin" items are core app pages. "tracking_section" items are toggleable tracking systems.
export const DEFAULT_NAV_ITEMS = [
  { label: "Dashboard",     href: "/dashboard",      itemType: "builtin",          sortOrder: 0, visible: true,  locked: true },
  { label: "Metrics",       href: "/metrics",        itemType: "builtin",          sortOrder: 1, visible: true,  locked: false },
  { label: "Meditate",      href: "/meditate",       itemType: "tracking_section", sortOrder: 2, visible: true,  locked: false },
  { label: "Food",          href: "/food",           itemType: "tracking_section", sortOrder: 3, visible: true,  locked: false },
  { label: "Tracking",      href: "/tracking",       itemType: "tracking_section", sortOrder: 4, visible: true,  locked: false },
  { label: "Medical",       href: "/medical",        itemType: "tracking_section", sortOrder: 5, visible: true,  locked: false },
  { label: "Appointments",  href: "/appointments",   itemType: "tracking_section", sortOrder: 6, visible: true,  locked: false },
  { label: "Entertainment", href: "/entertainment",  itemType: "tracking_section", sortOrder: 7, visible: true,  locked: false },
  { label: "Workout",       href: "/workout",        itemType: "tracking_section", sortOrder: 8, visible: false, locked: false },
  { label: "Finances",      href: "/finances",       itemType: "tracking_section", sortOrder: 9, visible: true,  locked: false },
];

// Section keys for tracking systems (used by Metrics page toggles)
export const TRACKING_SECTIONS = [
  { key: "meditate",      label: "Meditate",      href: "/meditate",       description: "Meditation timer and session history" },
  { key: "food",          label: "Food",          href: "/food",           description: "Nutrition tracking with meals and macros" },
  { key: "tracking",      label: "Tracking",      href: "/tracking",       description: "Collections, hobbies, and misc counters" },
  { key: "medical",       label: "Medical",       href: "/medical",        description: "Health, symptoms, and medications" },
  { key: "appointments",  label: "Appointments",  href: "/appointments",   description: "Doctor visits and scheduled events" },
  { key: "entertainment", label: "Entertainment", href: "/entertainment",  description: "Shows, movies, books, and games" },
  { key: "workout",       label: "Workout",       href: "/workout",        description: "Strength training and exercise logging" },
  { key: "finances",      label: "Finances",      href: "/finances",       description: "Spending, budgets, investments, and net worth" },
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

/**
 * Check if nav items are old-format (pre-tracking-section migration).
 * Old format: has builtin items for /food, /meditate, etc. but no /metrics builtin.
 */
export function needsMigration(
  items: { href: string; itemType: string }[]
): boolean {
  const hasMetricsBuiltin = items.some(
    (i) => i.itemType === "builtin" && i.href === "/metrics"
  );
  const hasOldBuiltin = items.some(
    (i) => i.itemType === "builtin" && ["/food", "/meditate", "/tracking", "/medical", "/appointments", "/entertainment"].includes(i.href)
  );
  return !hasMetricsBuiltin && hasOldBuiltin;
}
