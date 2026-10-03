import { describe, it, expect, afterEach } from "vitest";
import { searchFoods, toFoodSearchResult } from "@/server/api/food";

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

  it("maps USDA nutrients onto the app's shape, per the stated serving", async () => {
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
      // USDA's figures are per 100 g; a 50 g serving gets half of each.
      { fdcId: "123", description: "Egg, whole", calories: 72, protein: 6, carbs: 0, fat: 5, servingSize: 50, servingUnit: "g" },
    ]);
  });
});

describe("search results", () => {
  it("asks for every USDA dataset, with the POST form the API accepts", async () => {
    process.env.USDA_API_KEY = "test-key";
    let sent: { url: string; init?: RequestInit } | undefined;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      sent = { url: String(url), init };
      return Response.json({ foods: [] });
    }) as typeof fetch;

    await searchFoods("fiber one cereal");
    expect(sent?.init?.method).toBe("POST");
    expect(sent?.url).toMatch(/^https:\/\/api\.nal\.usda\.gov\/fdc\/v1\/foods\/search\?api_key=test-key$/);
    const body = JSON.parse(String(sent?.init?.body)) as { query: string; dataType: string[] };
    expect(body.query).toBe("fiber one cereal");
    expect(body.dataType).toEqual(["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"]);
  });

  it("scales a branded food's macros to its stated serving and names the brand", () => {
    const row = toFoodSearchResult({
      fdcId: 1,
      description: "Fiber One Cereal",
      dataType: "Branded",
      brandName: "Fiber One",
      brandOwner: "GENERAL MILLS SALES INC.",
      servingSize: 40,
      servingSizeUnit: "GRM",
      householdServingFullText: "2/3 cup",
      foodNutrients: [
        { nutrientId: 1008, value: 225 },
        { nutrientId: 1003, value: 7.5 },
        { nutrientId: 1005, value: 72.5 },
        { nutrientId: 1004, value: 5 },
      ],
    });
    expect(row).toEqual({
      fdcId: "1",
      description: "Fiber One Cereal",
      brand: "Fiber One",
      calories: 90,
      protein: 3,
      carbs: 29,
      fat: 2,
      servingSize: 40,
      servingUnit: "g",
      householdServing: "2/3 cup",
    });
  });

  it("keeps a reference food per 100 g, as before", () => {
    const row = toFoodSearchResult({ fdcId: 2, description: "Egg, whole, raw", dataType: "Foundation", foodNutrients: [{ nutrientId: 1008, value: 143 }] });
    expect(row).toMatchObject({ calories: 143, servingSize: 100, servingUnit: "g" });
    expect(row).not.toHaveProperty("brand");
  });
});
