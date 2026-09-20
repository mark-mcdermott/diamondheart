import { describe, it, expect, afterEach } from "vitest";
import { searchFoods } from "@/server/api/food";

const original = process.env.USDA_API_KEY;
const realFetch = globalThis.fetch;
afterEach(() => {
  if (original === undefined) delete process.env.USDA_API_KEY;
  else process.env.USDA_API_KEY = original;
  globalThis.fetch = realFetch;
});

describe("food search without a key", () => {
  it("reports unavailable, not a server error", async () => {
    delete process.env.USDA_API_KEY;
    const res = await searchFoods("egg");

    // 500 would say "this is broken"; the deployment is simply not configured.
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.reason).toBe("not_configured");
    expect(body.error).toMatch(/custom/i); // points at the path that does work
  });
});

describe("food search with a key", () => {
  it("returns an empty list for a blank query without calling upstream", async () => {
    process.env.USDA_API_KEY = "test-key";
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    const res = await searchFoods("   ");
    expect(res.status).toBe(200);
    expect((await res.json()).foods).toEqual([]);
    expect(called, "a blank query should not hit USDA").toBe(false);
  });

  it("explains a rejected key rather than blaming the food database", async () => {
    process.env.USDA_API_KEY = "bad-key";
    globalThis.fetch = (async () => new Response("nope", { status: 403 })) as typeof fetch;

    const res = await searchFoods("egg");
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.reason).toBe("bad_key");
    expect(body.error).toMatch(/USDA_API_KEY/);
  });

  it("reports an upstream outage separately from a bad key", async () => {
    process.env.USDA_API_KEY = "test-key";
    globalThis.fetch = (async () => new Response("boom", { status: 500 })) as typeof fetch;

    const res = await searchFoods("egg");
    const body = await res.json();
    expect(body.reason).toBe("upstream_error");
    expect(body.error).not.toMatch(/USDA_API_KEY/);
  });

  it("survives the network being unreachable", async () => {
    process.env.USDA_API_KEY = "test-key";
    globalThis.fetch = (async () => {
      throw new Error("ENOTFOUND");
    }) as typeof fetch;

    const res = await searchFoods("egg");
    expect(res.status).toBe(502);
    expect((await res.json()).reason).toBe("unreachable");
  });

  it("maps USDA nutrients onto the app's shape", async () => {
    process.env.USDA_API_KEY = "test-key";
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          foods: [
            {
              fdcId: 123,
              description: "Egg, whole",
              servingSize: 50.4,
              servingSizeUnit: "g",
              foodNutrients: [
                { nutrientId: 1008, value: 143.2 },
                { nutrientId: 1003, value: 12.6 },
                { nutrientId: 1005, value: 0.7 },
                { nutrientId: 1004, value: 9.5 },
              ],
            },
          ],
        }),
        { status: 200 }
      )) as typeof fetch;

    const res = await searchFoods("egg");
    expect(res.status).toBe(200);
    expect((await res.json()).foods).toEqual([
      { fdcId: "123", description: "Egg, whole", calories: 143, protein: 13, carbs: 1, fat: 10, servingSize: 50, servingUnit: "g" },
    ]);
  });
});
