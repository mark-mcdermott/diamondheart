import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ANDROID_PLUGINS, IOS_ONLY_PLUGINS } from "../../../capacitor.config";
import { dependencies } from "../../../package.json";

/** The way Capacitor itself tells a plugin from any other dependency: a `capacitor` field in its package.json. */
const installedPlugins = Object.keys(dependencies).filter((name) => {
  const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "node_modules", name, "package.json"), "utf8")) as { capacitor?: unknown };
  return manifest.capacitor !== undefined;
});

describe("the Android plugin list", () => {
  it("accounts for every installed Capacitor plugin, on Android or as iPhone-only", () => {
    expect([...ANDROID_PLUGINS, ...IOS_ONLY_PLUGINS].sort()).toEqual([...installedPlugins].sort());
  });

  it("keeps Apple Health out of the Android project", () => {
    expect(ANDROID_PLUGINS).not.toContain("@capgo/capacitor-health");
  });
});
