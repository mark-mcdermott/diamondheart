import { describe, it, expect } from "vitest";

describe("nav item defaults", () => {
  const DEFAULT_NAV_ITEMS = [
    { label: "Dashboard", href: "/dashboard", itemType: "builtin", sortOrder: 0, visible: true, locked: true },
    { label: "Meditate", href: "/meditate", itemType: "builtin", sortOrder: 1, visible: true, locked: false },
    { label: "Food", href: "/food", itemType: "builtin", sortOrder: 2, visible: true, locked: false },
    { label: "Tracking", href: "/tracking", itemType: "builtin", sortOrder: 3, visible: true, locked: false },
    { label: "Medical", href: "/medical", itemType: "builtin", sortOrder: 4, visible: true, locked: false },
    { label: "Entertainment", href: "/entertainment", itemType: "builtin", sortOrder: 5, visible: true, locked: false },
  ];

  it("has 6 default nav items", () => {
    expect(DEFAULT_NAV_ITEMS).toHaveLength(6);
  });

  it("Dashboard is first, locked, and visible", () => {
    const dashboard = DEFAULT_NAV_ITEMS[0];
    expect(dashboard.label).toBe("Dashboard");
    expect(dashboard.sortOrder).toBe(0);
    expect(dashboard.locked).toBe(true);
    expect(dashboard.visible).toBe(true);
  });

  it("Meditate is second, visible, and unlocked", () => {
    const meditate = DEFAULT_NAV_ITEMS[1];
    expect(meditate.label).toBe("Meditate");
    expect(meditate.sortOrder).toBe(1);
    expect(meditate.locked).toBe(false);
    expect(meditate.visible).toBe(true);
  });

  it("only Dashboard is locked", () => {
    const locked = DEFAULT_NAV_ITEMS.filter((i) => i.locked);
    expect(locked).toHaveLength(1);
    expect(locked[0].label).toBe("Dashboard");
  });

  it("all items are visible by default", () => {
    expect(DEFAULT_NAV_ITEMS.every((i) => i.visible)).toBe(true);
  });

  it("all items are builtin type", () => {
    expect(DEFAULT_NAV_ITEMS.every((i) => i.itemType === "builtin")).toBe(true);
  });

  it("sort orders are sequential starting at 0", () => {
    DEFAULT_NAV_ITEMS.forEach((item, i) => {
      expect(item.sortOrder).toBe(i);
    });
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

    // All checked should be before unchecked
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

    // Uncheck "Food"
    const updated = items.map((i) =>
      i.id === "3" ? { ...i, visible: false } : i
    );
    const checked = updated.filter((i) => i.visible);
    const unchecked = updated.filter((i) => !i.visible);
    const reordered = [...checked, ...unchecked];

    expect(reordered[0].label).toBe("Dashboard");
    expect(reordered[1].label).toBe("Meditate");
    // Unchecked items follow
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

    // Check "Food"
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
    // Only Hidden is unchecked
    expect(reordered[3].label).toBe("Hidden");
    expect(reordered[3].visible).toBe(false);
  });
});
