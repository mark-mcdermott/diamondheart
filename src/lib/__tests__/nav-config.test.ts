import { describe, it, expect } from "vitest";
import {
  DEFAULT_NAV_ITEMS,
  buildDefaultNavItems,
  hasDuplicates,
  needsMigration,
  TRACKING_SECTIONS,
} from "@/lib/nav-utils";

describe("nav item defaults", () => {
  it("has 10 default nav items", () => {
    expect(DEFAULT_NAV_ITEMS).toHaveLength(10);
  });

  it("Dashboard is first, locked, and visible", () => {
    const dashboard = DEFAULT_NAV_ITEMS[0];
    expect(dashboard.label).toBe("Dashboard");
    expect(dashboard.sortOrder).toBe(0);
    expect(dashboard.locked).toBe(true);
    expect(dashboard.visible).toBe(true);
  });

  it("Metrics is second builtin item", () => {
    const metrics = DEFAULT_NAV_ITEMS[1];
    expect(metrics.label).toBe("Metrics");
    expect(metrics.href).toBe("/metrics");
    expect(metrics.itemType).toBe("builtin");
  });

  it("only Dashboard is locked", () => {
    const locked = DEFAULT_NAV_ITEMS.filter((i) => i.locked);
    expect(locked).toHaveLength(1);
    expect(locked[0].label).toBe("Dashboard");
  });

  it("has 2 builtin items and 8 tracking_section items", () => {
    const builtins = DEFAULT_NAV_ITEMS.filter((i) => i.itemType === "builtin");
    const sections = DEFAULT_NAV_ITEMS.filter((i) => i.itemType === "tracking_section");
    expect(builtins).toHaveLength(2);
    expect(sections).toHaveLength(8);
  });

  it("Workout starts hidden", () => {
    const workout = DEFAULT_NAV_ITEMS.find((i) => i.label === "Workout");
    expect(workout?.visible).toBe(false);
  });

  it("sort orders are sequential starting at 0", () => {
    DEFAULT_NAV_ITEMS.forEach((item, i) => {
      expect(item.sortOrder).toBe(i);
    });
  });
});

describe("TRACKING_SECTIONS", () => {
  it("has 8 tracking sections", () => {
    expect(TRACKING_SECTIONS).toHaveLength(8);
  });

  it("each section has key, label, href, and description", () => {
    for (const section of TRACKING_SECTIONS) {
      expect(section.key).toBeTruthy();
      expect(section.label).toBeTruthy();
      expect(section.href).toMatch(/^\//);
      expect(section.description).toBeTruthy();
    }
  });

  it("section keys match tracking_section nav item hrefs", () => {
    const sectionHrefs = TRACKING_SECTIONS.map((s) => s.href);
    const navSectionHrefs = DEFAULT_NAV_ITEMS
      .filter((i) => i.itemType === "tracking_section")
      .map((i) => i.href);
    expect(sectionHrefs.sort()).toEqual(navSectionHrefs.sort());
  });
});

describe("buildDefaultNavItems", () => {
  it("returns 10 items with deterministic IDs", () => {
    const items = buildDefaultNavItems("user-123");
    expect(items).toHaveLength(10);
    expect(items[0].id).toBe("default-user-123-dashboard");
    expect(items[1].id).toBe("default-user-123-metrics");
  });

  it("returns same IDs for same userId across calls", () => {
    const a = buildDefaultNavItems("user-abc");
    const b = buildDefaultNavItems("user-abc");
    expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
  });

  it("returns different IDs for different userIds", () => {
    const a = buildDefaultNavItems("user-aaa");
    const b = buildDefaultNavItems("user-bbb");
    expect(a[0].id).not.toBe(b[0].id);
  });

  it("sets userId on all items", () => {
    const items = buildDefaultNavItems("user-xyz");
    expect(items.every((i) => i.userId === "user-xyz")).toBe(true);
  });

  it("preserves all default properties", () => {
    const items = buildDefaultNavItems("user-123");
    expect(items[0].label).toBe("Dashboard");
    expect(items[0].locked).toBe(true);
    expect(items[0].visible).toBe(true);
    expect(items[0].href).toBe("/dashboard");
  });
});

describe("hasDuplicates", () => {
  it("returns true when items are duplicated", () => {
    const items = [
      { href: "/dashboard", itemType: "builtin", referenceId: null },
      { href: "/dashboard", itemType: "builtin", referenceId: null },
    ];
    expect(hasDuplicates(items)).toBe(true);
  });

  it("returns false when no duplicates exist", () => {
    const items = [
      { href: "/dashboard", itemType: "builtin", referenceId: null },
      { href: "/metrics", itemType: "builtin", referenceId: null },
      { href: "/food", itemType: "tracking_section", referenceId: null },
    ];
    expect(hasDuplicates(items)).toBe(false);
  });

  it("returns false for empty input", () => {
    expect(hasDuplicates([])).toBe(false);
  });
});

describe("needsMigration", () => {
  it("returns true for old-format items (builtin /food, no /metrics)", () => {
    const items = [
      { href: "/dashboard", itemType: "builtin" },
      { href: "/food", itemType: "builtin" },
      { href: "/meditate", itemType: "builtin" },
    ];
    expect(needsMigration(items)).toBe(true);
  });

  it("returns false for new-format items (has /metrics builtin)", () => {
    const items = [
      { href: "/dashboard", itemType: "builtin" },
      { href: "/metrics", itemType: "builtin" },
      { href: "/food", itemType: "tracking_section" },
    ];
    expect(needsMigration(items)).toBe(false);
  });

  it("returns false when no old builtins exist", () => {
    const items = [
      { href: "/dashboard", itemType: "builtin" },
    ];
    expect(needsMigration(items)).toBe(false);
  });
});

describe("nav reorder logic", () => {
  it("checked items stay above unchecked items", () => {
    const items = [
      { id: "1", visible: true, locked: true },
      { id: "2", visible: true, locked: false },
      { id: "3", visible: false, locked: false },
      { id: "4", visible: true, locked: false },
    ];

    const checked = items.filter((i) => i.visible);
    const unchecked = items.filter((i) => !i.visible);
    const ordered = [...checked, ...unchecked];

    const firstUncheckedIdx = ordered.findIndex((i) => !i.visible);
    const lastCheckedIdx = ordered.reduce(
      (max, item, idx) => (item.visible ? idx : max),
      -1
    );
    expect(lastCheckedIdx).toBeLessThan(firstUncheckedIdx);
  });

  it("toggling OFF moves item to top of unchecked section", () => {
    const items = [
      { id: "1", label: "Dashboard", visible: true, locked: true },
      { id: "2", label: "Meditate", visible: true, locked: false },
      { id: "3", label: "Food", visible: true, locked: false },
      { id: "4", label: "Hidden", visible: false, locked: false },
    ];

    const updated = items.map((i) =>
      i.id === "3" ? { ...i, visible: false } : i
    );
    const checked = updated.filter((i) => i.visible);
    const unchecked = updated.filter((i) => !i.visible);
    const reordered = [...checked, ...unchecked];

    expect(reordered[0].label).toBe("Dashboard");
    expect(reordered[1].label).toBe("Meditate");
    expect(reordered[2].visible).toBe(false);
    expect(reordered[3].visible).toBe(false);
  });

  it("toggling ON moves item to bottom of checked section", () => {
    const items = [
      { id: "1", label: "Dashboard", visible: true, locked: true },
      { id: "2", label: "Meditate", visible: true, locked: false },
      { id: "3", label: "Food", visible: false, locked: false },
      { id: "4", label: "Hidden", visible: false, locked: false },
    ];

    const updated = items.map((i) =>
      i.id === "3" ? { ...i, visible: true } : i
    );
    const checked = updated.filter((i) => i.visible);
    const unchecked = updated.filter((i) => !i.visible);
    const reordered = [...checked, ...unchecked];

    expect(reordered[0].label).toBe("Dashboard");
    expect(reordered[1].label).toBe("Meditate");
    expect(reordered[2].label).toBe("Food");
    expect(reordered[2].visible).toBe(true);
    expect(reordered[3].label).toBe("Hidden");
    expect(reordered[3].visible).toBe(false);
  });
});
