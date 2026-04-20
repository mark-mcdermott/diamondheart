import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { patchAndroidSplash } from "../../../scripts/patch-android-splash";

const TEMPLATE = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
    </style>
    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.NoActionBar">
        <item name="windowActionBar">false</item>
    </style>
</resources>
`;

let tmpDir: string;
let stylesPath: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "patch-splash-"));
  stylesPath = join(tmpDir, "styles.xml");
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("patch-android-splash", () => {
  it("returns 'missing' when the target file does not exist", () => {
    expect(patchAndroidSplash(join(tmpDir, "nope.xml"))).toBe("missing");
  });

  it("inserts the background item into AppTheme.NoActionBar", () => {
    writeFileSync(stylesPath, TEMPLATE, "utf8");
    expect(patchAndroidSplash(stylesPath)).toBe("patched");
    const updated = readFileSync(stylesPath, "utf8");
    expect(updated).toContain('<item name="android:background">#FFFBF7</item>');
  });

  it("is idempotent — a second run reports 'unchanged'", () => {
    writeFileSync(stylesPath, TEMPLATE, "utf8");
    expect(patchAndroidSplash(stylesPath)).toBe("patched");
    expect(patchAndroidSplash(stylesPath)).toBe("unchanged");
    const updated = readFileSync(stylesPath, "utf8");
    const occurrences = (updated.match(/android:background/g) ?? []).length;
    expect(occurrences).toBe(1);
  });

  it("reports 'unchanged' if the AppTheme.NoActionBar style is missing", () => {
    writeFileSync(stylesPath, `<?xml version="1.0"?><resources></resources>`, "utf8");
    expect(patchAndroidSplash(stylesPath)).toBe("unchanged");
  });
});
