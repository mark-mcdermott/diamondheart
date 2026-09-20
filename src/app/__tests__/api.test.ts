import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/app/api";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function respond(status: number, body?: unknown) {
  globalThis.fetch = vi.fn(async () =>
    body === undefined
      ? new Response(null, { status })
      : new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
  ) as typeof fetch;
}

describe("the API client", () => {
  it("unwraps the envelope", async () => {
    respond(200, { preferences: { weightUnit: "kg" } });
    const prefs = await api.preferences.get();
    expect(prefs.weightUnit).toBe("kg");
  });

  it("sends JSON with the right method and content type", async () => {
    respond(200, { items: [] });
    await api.nav.setVisible("abc", false);
    const [url, init] = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/nav/abc");
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({ visible: false }));
    expect(new Headers(init.headers).get("content-type")).toBe("application/json");
  });

  it("posts a count delta to the item's count route", async () => {
    respond(200, { item: { id: "abc", count: 3 } });
    const item = await api.tracking.adjust("abc", 1);
    const [url, init] = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/tracking/abc/count");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ delta: 1 }));
    expect(item.count).toBe(3);
  });

  it("puts an explicit reaction rather than toggling", async () => {
    respond(200, { reacted: false, reactionCount: 2 });
    const result = await api.feed.react("s1", false);
    const [url, init] = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/feed/reactions/s1");
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(JSON.stringify({ reacted: false }));
    expect(result.reactionCount).toBe(2);
  });

  it("turns an error body into an ApiError with its fields", async () => {
    respond(422, { error: "Validation failed", fields: { weightUnit: ["Invalid"] } });
    const failure = await api.preferences.update({ weightUnit: "kg" }).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(422);
    expect((failure as ApiError).fields).toEqual({ weightUnit: ["Invalid"] });
  });

  it("reports a 401 as not signed in", async () => {
    respond(401, { error: "Not signed in" });
    await expect(api.nav.list()).rejects.toMatchObject({ status: 401 });
  });

  it("survives an error response that is not JSON", async () => {
    globalThis.fetch = vi.fn(async () => new Response("<html>502</html>", { status: 502 })) as typeof fetch;
    await expect(api.nav.list()).rejects.toMatchObject({ status: 502, message: "Something went wrong." });
  });
});
