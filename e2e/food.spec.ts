import { test, expect, type Page } from "@playwright/test";
import { signUp, seedFavoriteFood, dailyTotal, gotoReady } from "./helpers";

/**
 * Food numbers, end to end.
 *
 * Until #208 every macro column was an integer read with `parseInt`, so half a
 * serving logged as a whole one and 12.5 g of protein became 12. The unit tests
 * cover the parsing; these cover the whole path — form, action, database,
 * totals — which is what would have caught the columns still being integers in
 * production while CI went green.
 */

async function openMealPanel(page: Page): Promise<void> {
  await gotoReady(page, "/food");
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
}

test("decimal macros survive the round trip to the totals", async ({ page }) => {
  await signUp(page);
  await openMealPanel(page);

  await page.getByRole("button", { name: /custom/i }).click();
  await page.locator("#custom-name").fill("Probe Yoghurt");
  await page.locator("#custom-cal").fill("99.6");
  await page.locator("#custom-protein").fill("12.5");
  await page.getByRole("button", { name: "Add Food" }).click();

  await expect(async () => {
    await gotoReady(page, "/food");
    expect(await dailyTotal(page, "calories")).toBeCloseTo(99.6, 1);
    expect(await dailyTotal(page, "protein")).toBeCloseTo(12.5, 1);
  }).toPass({ timeout: 30_000 });
});

test("half a serving counts as half", async ({ page }) => {
  const email = await signUp(page);
  await seedFavoriteFood(email, {
    name: "Probe Oats",
    calories: 100,
    protein: 10,
    carbs: 20,
    fat: 4,
  });

  await openMealPanel(page);
  await page.getByRole("button", { name: /Probe Oats/ }).click();

  // Staging a food reveals the quantity picker.
  const qty = page.locator('input[type="number"][step="0.5"]').first();
  await expect(qty).toBeVisible({ timeout: 15_000 });
  await qty.fill("0.5");
  // Not getByRole("Add").first() — that matches the meal's own Add button,
  // which just closes the panel again.
  await page.getByTestId("confirm-staged-food").click();

  await expect(async () => {
    await gotoReady(page, "/food");
    // The bug: 0.5 became 1, and this read 100 / 10.
    expect(await dailyTotal(page, "calories")).toBeCloseTo(50, 1);
    expect(await dailyTotal(page, "protein")).toBeCloseTo(5, 1);
  }).toPass({ timeout: 30_000 });
});

test("an unavailable food search explains itself instead of showing nothing", async ({ page }) => {
  await signUp(page);

  // Stand in for a deployment with no USDA_API_KEY.
  await page.route("**/api/food/search**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Food search isn't set up on this deployment. Add a food manually with Custom.",
        reason: "not_configured",
      }),
    })
  );

  await openMealPanel(page);
  await page.getByPlaceholder("Search USDA foods...").fill("egg");

  // Previously this rendered as an empty list — indistinguishable from "no
  // matches" — and left people retyping a search that could never work.
  const error = page.getByTestId("search-error");
  await expect(error).toBeVisible({ timeout: 15_000 });
  await expect(error).toContainText(/Custom/i);
});

test("totals show a plain number until a target is set", async ({ page }) => {
  await signUp(page);
  await gotoReady(page, "/food");

  // The acceptance criterion "sensible before any goal is set" is a specific
  // bug avoided: the metric page once showed "Daily goal: 1 kg" because a
  // missing goal was defaulted to 1. No target must mean no progress shown.
  await expect(page.getByTestId("total-calories")).toHaveText("0");
  await expect(page.getByTestId("target-calories")).toHaveCount(0);
  await expect(page.getByTestId("target-protein")).toHaveCount(0);
});

test("a saved target reads the day against it", async ({ page }) => {
  await signUp(page);

  await gotoReady(page, "/settings");
  await page.locator("#target-calories").fill("2000");
  await page.getByRole("button", { name: /save targets/i }).click();
  // The success toast fires only after the server confirms — not optimistic state.
  await expect(page.getByText("Daily targets saved")).toBeVisible({ timeout: 15_000 });

  // Log 500 kcal through the custom-food path (needs no USDA key).
  await openMealPanel(page);
  await page.getByRole("button", { name: /custom/i }).click();
  await page.locator("#custom-name").fill("Target Probe");
  await page.locator("#custom-cal").fill("500");
  await page.getByRole("button", { name: "Add Food" }).click();

  await expect(async () => {
    await gotoReady(page, "/food");
    expect(await dailyTotal(page, "calories")).toBeCloseTo(500, 1);
    await expect(page.getByTestId("target-calories")).toContainText("of 2000");
  }).toPass({ timeout: 30_000 });

  // Protein had no target set, so it must still render bare.
  await expect(page.getByTestId("target-protein")).toHaveCount(0);
});
