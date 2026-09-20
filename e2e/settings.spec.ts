import { test, expect } from "@playwright/test";
import { gotoReady, signUp } from "./helpers";

/**
 * Settings is the first page that reads and writes through the API from the
 * browser. The nav toggle is the flow most worth guarding: a fresh account's
 * first toggle used to match nothing on the server and report success.
 */
test("hiding a nav item in settings removes it from the sidebar", async ({ page }) => {
  await signUp(page);

  await gotoReady(page, "/dashboard");
  await expect(page.getByRole("link", { name: "Food", exact: true }).first()).toBeVisible();

  await gotoReady(page, "/settings");
  const foodToggle = page.getByRole("checkbox", { name: /toggle food/i });
  await expect(foodToggle).toBeVisible({ timeout: 15_000 });
  await foodToggle.click();

  // The checkbox flips optimistically; only a fresh load proves the save landed.
  await expect(async () => {
    await gotoReady(page, "/dashboard");
    await expect(page.getByRole("link", { name: "Food", exact: true })).toHaveCount(0);
  }).toPass({ timeout: 30_000 });

  await gotoReady(page, "/settings");
  await page.getByRole("checkbox", { name: /toggle food/i }).click();
  await expect(async () => {
    await gotoReady(page, "/dashboard");
    await expect(page.getByRole("link", { name: "Food", exact: true }).first()).toBeVisible();
  }).toPass({ timeout: 30_000 });
});
