import { test, expect } from "@playwright/test";
import { gotoReady, signUp } from "./helpers";

/**
 * The shelved sections read and write through the API from the browser.
 * One round trip each: create through the UI, then a fresh load proves the
 * write landed rather than only the optimistic cache.
 */

test("a tracking item can be added and counted up", async ({ page }) => {
  await signUp(page);
  await gotoReady(page, "/tracking");

  await page.getByRole("button", { name: "Add Item" }).click();
  await page.getByPlaceholder("e.g. Pokemon Cards").fill("Vinyl");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("Vinyl", { exact: true })).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Increase Vinyl" }).click();

  await expect(async () => {
    await gotoReady(page, "/tracking");
    await expect(page.getByText("Vinyl", { exact: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: "Decrease Vinyl" })).toBeEnabled();
  }).toPass({ timeout: 30_000 });
});

test("a medical quick log lands in the day's list", async ({ page }) => {
  await signUp(page);
  await gotoReady(page, "/medical");

  await page.getByRole("button", { name: "Pee" }).click();

  await expect(async () => {
    await gotoReady(page, "/medical");
    await expect(page.getByText("pee", { exact: true })).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 30_000 });
});

test("an appointment can be added and shows as upcoming", async ({ page }) => {
  await signUp(page);
  await gotoReady(page, "/appointments");

  await page.getByRole("button", { name: "Add Appointment" }).click();
  await page.getByPlaceholder("e.g. Annual physical").fill("Annual physical");
  await page.locator('input[type="datetime-local"]').fill("2035-01-15T10:30");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await expect(async () => {
    await gotoReady(page, "/appointments");
    await expect(page.getByText("Annual physical", { exact: true })).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 30_000 });
});
