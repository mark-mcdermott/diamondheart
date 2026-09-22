import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { patchIosInfo } from "../../../scripts/patch-ios-info";

const TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
\t<key>CFBundleName</key>
\t<string>Diamondheart</string>
</dict>
</plist>
`;

let tmpDir: string;
let plistPath: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "patch-ios-info-"));
  plistPath = join(tmpDir, "Info.plist");
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("patch-ios-info", () => {
  it("returns 'missing' when the plist does not exist", () => {
    expect(patchIosInfo(join(tmpDir, "nope.plist"))).toBe("missing");
  });

  it("adds the Face ID usage string inside the top-level dict", () => {
    writeFileSync(plistPath, TEMPLATE, "utf8");
    expect(patchIosInfo(plistPath)).toBe("patched");
    const updated = readFileSync(plistPath, "utf8");
    expect(updated).toContain("<key>NSFaceIDUsageDescription</key>\n\t<string>Unlock Diamondheart with Face ID.</string>");
    expect(updated.indexOf("NSFaceIDUsageDescription")).toBeLessThan(updated.lastIndexOf("</dict>"));
  });

  it("is idempotent — a second run reports 'unchanged'", () => {
    writeFileSync(plistPath, TEMPLATE, "utf8");
    expect(patchIosInfo(plistPath)).toBe("patched");
    expect(patchIosInfo(plistPath)).toBe("unchanged");
    const occurrences = (readFileSync(plistPath, "utf8").match(/NSFaceIDUsageDescription/g) ?? []).length;
    expect(occurrences).toBe(1);
  });
});
