import { describe, it, expect } from "vitest";
import { summarizePushReport } from "@/lib/push-report";

describe("summarizePushReport", () => {
  it("counts the devices reached", () => {
    expect(summarizePushReport({ sent: 1, failed: 0, removed: 0 })).toEqual({ delivered: true, message: "Test notification sent" });
    expect(summarizePushReport({ sent: 3, failed: 1, removed: 0 })).toEqual({ delivered: true, message: "Test notification sent to 3 devices" });
  });

  it("tells a failed delivery from an expired registration from nothing to send to", () => {
    expect(summarizePushReport({ sent: 0, failed: 2, removed: 1 }).message).toMatch(/could not be delivered/);
    expect(summarizePushReport({ sent: 0, failed: 0, removed: 1 }).message).toMatch(/registration had expired/);
    expect(summarizePushReport({ sent: 0, failed: 0, removed: 0 }).message).toMatch(/Nothing on this account/);
  });
});
