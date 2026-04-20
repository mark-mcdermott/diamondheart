import { describe, it, expect, beforeEach, vi } from "vitest";

const isNativeRef = { value: false };
const pluginCalls: Array<Record<string, unknown>> = [];
const pluginBehavior = { mode: "ok" as "ok" | "throw" | "missing" };

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => isNativeRef.value,
    isPluginAvailable: () => pluginBehavior.mode !== "missing",
  },
  registerPlugin: () => ({
    write: async (opts: Record<string, unknown>) => {
      if (pluginBehavior.mode === "throw") {
        throw new Error("nope");
      }
      pluginCalls.push(opts);
    },
  }),
}));

import { syncStreakToWidgets, WIDGET_SYNC_PLUGIN_NAME } from "../widget-sync";

describe("widget-sync", () => {
  beforeEach(() => {
    isNativeRef.value = false;
    pluginCalls.length = 0;
    pluginBehavior.mode = "ok";
  });

  it("no-ops on web and returns false", async () => {
    isNativeRef.value = false;
    const ok = await syncStreakToWidgets({
      current: 7,
      todayCompleted: 3,
      todayTotal: 5,
      updatedAt: 1700000000000,
    });
    expect(ok).toBe(false);
    expect(pluginCalls).toHaveLength(0);
  });

  it("forwards the snapshot to the native plugin when on a native platform", async () => {
    isNativeRef.value = true;
    const ok = await syncStreakToWidgets({
      current: 12,
      todayCompleted: 4,
      todayTotal: 6,
      updatedAt: 1700000000000,
    });
    expect(ok).toBe(true);
    expect(pluginCalls).toEqual([
      {
        current: 12,
        todayCompleted: 4,
        todayTotal: 6,
        updatedAt: 1700000000000,
      },
    ]);
  });

  it("returns false if the plugin throws", async () => {
    isNativeRef.value = true;
    pluginBehavior.mode = "throw";
    const ok = await syncStreakToWidgets({
      current: 1,
      todayCompleted: 0,
      todayTotal: 1,
      updatedAt: 1,
    });
    expect(ok).toBe(false);
  });

  it("returns false if the plugin is not available on-device", async () => {
    isNativeRef.value = true;
    pluginBehavior.mode = "missing";
    const ok = await syncStreakToWidgets({
      current: 1,
      todayCompleted: 0,
      todayTotal: 1,
      updatedAt: 1,
    });
    expect(ok).toBe(false);
  });

  it("clamps negative/NaN numbers to zero so the native layer never sees junk", async () => {
    isNativeRef.value = true;
    await syncStreakToWidgets({
      current: -5,
      todayCompleted: Number.NaN,
      todayTotal: -1,
      updatedAt: 42,
    });
    expect(pluginCalls[0]).toEqual({
      current: 0,
      todayCompleted: 0,
      todayTotal: 0,
      updatedAt: 42,
    });
  });

  it("exposes a stable plugin name so the Swift side can match", () => {
    expect(WIDGET_SYNC_PLUGIN_NAME).toBe("WidgetSync");
  });
});
