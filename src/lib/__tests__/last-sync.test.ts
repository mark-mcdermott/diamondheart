import { describe, it, expect } from "vitest";
import { formatLastSync } from "@/app/sections/account/integrations/last-sync";

const NOW = new Date("2026-10-01T15:00:00Z").getTime();

describe("formatLastSync", () => {
  it("says never before the first sync", () => {
    expect(formatLastSync(null, NOW)).toBe("Never");
  });

  it("counts hours within a day, then gives the date", () => {
    expect(formatLastSync("2026-10-01T14:40:00Z", NOW)).toBe("Just now");
    expect(formatLastSync("2026-10-01T10:00:00Z", NOW)).toBe("5h ago");
    expect(formatLastSync("2026-09-28T10:00:00Z", NOW)).toBe(new Date("2026-09-28T10:00:00Z").toLocaleDateString());
  });
});
