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

const queries: { method: string; dataType: string; startDate: string }[] = [];
vi.mock("@capgo/capacitor-health", () => ({
  Health: {
    queryAggregated: async (options: { dataType: string; startDate: string }) => {
      queries.push({ method: "queryAggregated", ...options });
      return { samples: [] };
    },
    readSamples: async (options: { dataType: string; startDate: string }) => {
      queries.push({ method: "readSamples", ...options });
      return { samples: [] };
    },
  },
}));

describe("readHealthDays", () => {
  it("reads a week from local midnight, and sleep from the evening before it", async () => {
    const { readHealthDays } = await import("@/lib/health");
    const now = new Date(2026, 9, 1, 9, 30);
    await readHealthDays(now);

    const startOf = (dataType: string) => new Date(queries.find((query) => query.dataType === dataType)!.startDate);
    expect(startOf("steps")).toEqual(new Date(2026, 8, 25, 0, 0));
    expect(startOf("restingHeartRate")).toEqual(new Date(2026, 8, 25, 0, 0));
    expect(startOf("sleep")).toEqual(new Date(2026, 8, 24, 18, 0));
  });
});
