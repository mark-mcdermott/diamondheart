import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/api", () => ({ api: {} }));

import { healthSyncDue } from "@/lib/health";

const NOW = new Date("2026-10-01T15:00:00Z").getTime();

describe("healthSyncDue", () => {
  it("is due when the account has never synced", () => {
    expect(healthSyncDue(null, NOW)).toBe(true);
  });

  it("waits an hour between unasked syncs", () => {
    expect(healthSyncDue("2026-10-01T14:30:00Z", NOW)).toBe(false);
    expect(healthSyncDue("2026-10-01T14:00:00Z", NOW)).toBe(true);
    expect(healthSyncDue("2026-09-30T09:00:00Z", NOW)).toBe(true);
  });
});
