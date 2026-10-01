import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/api", () => ({ apiFetch: vi.fn() }));

import { tapDestination } from "@/lib/native-push";

describe("tapDestination", () => {
  it("follows a path on this app", () => {
    expect(tapDestination({ href: "/tracking" })).toBe("/tracking");
    expect(tapDestination({ aps: { alert: { title: "Hi" } }, href: "/notifications" })).toBe("/notifications");
  });

  it("ignores anything that is not a local path", () => {
    expect(tapDestination({ href: "https://example.com" })).toBeNull();
    expect(tapDestination({ href: "//example.com" })).toBeNull();
    expect(tapDestination({ href: 42 })).toBeNull();
    expect(tapDestination({})).toBeNull();
    expect(tapDestination(null)).toBeNull();
  });
});
