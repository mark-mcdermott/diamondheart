import { describe, it, expect, vi } from "vitest";
import { fetchWidgetSnapshot, widgetSnapshotSchema } from "../widget-snapshot";

function mockFetch(response: { ok: boolean; body?: unknown }) {
  return vi.fn(async () =>
    ({
      ok: response.ok,
      json: async () => response.body,
    }) as unknown as Response
  );
}

describe("widget-snapshot", () => {
  it("returns null on non-ok responses", async () => {
    const result = await fetchWidgetSnapshot(mockFetch({ ok: false }));
    expect(result).toBeNull();
  });

  it("returns null when the body fails schema validation", async () => {
    const result = await fetchWidgetSnapshot(
      mockFetch({ ok: true, body: { current: "nope" } })
    );
    expect(result).toBeNull();
  });

  it("returns null when the body is missing fields", async () => {
    const result = await fetchWidgetSnapshot(
      mockFetch({ ok: true, body: { current: 1 } })
    );
    expect(result).toBeNull();
  });

  it("returns the parsed snapshot for a valid payload", async () => {
    const payload = {
      current: 5,
      todayCompleted: 2,
      todayTotal: 4,
      updatedAt: 1700000000000,
    };
    const result = await fetchWidgetSnapshot(mockFetch({ ok: true, body: payload }));
    expect(result).toEqual(payload);
  });

  it("rejects negative values so the native layer never sees garbage", () => {
    const parsed = widgetSnapshotSchema.safeParse({
      current: -1,
      todayCompleted: 0,
      todayTotal: 0,
      updatedAt: 0,
    });
    expect(parsed.success).toBe(false);
  });

  it("returns null when fetch itself throws (offline, abort, etc.)", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const result = await fetchWidgetSnapshot(fetcher);
    expect(result).toBeNull();
  });
});
