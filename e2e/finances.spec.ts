import { test, expect } from "@playwright/test";
import { gotoReady, signUp } from "./helpers";

/**
 * Finances is the largest section to move onto the API. One round trip
 * through the accounts page covers the form-to-JSON conversion (dollars to
 * cents), the create endpoint, and the refetch; the dashboard read proves the
 * aggregate sees the same row.
 */
test("an account can be added and shows on the finances dashboard", async ({ page }) => {
  await signUp(page);
  await gotoReady(page, "/finances/accounts");

  // A fresh account list shows the button twice: the header trigger and the empty state's.
  await page.getByRole("button", { name: "Add Account" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("e.g. Chase Checking").fill("Chase Checking");
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "Checking" }).click();
  await dialog.getByLabel("Balance ($)").fill("1250");
  await dialog.getByRole("button", { name: "Add Account" }).click();

  await expect(async () => {
    await gotoReady(page, "/finances/accounts");
    await expect(page.getByText("Chase Checking", { exact: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("$1,250.00").first()).toBeVisible();
  }).toPass({ timeout: 30_000 });

  await gotoReady(page, "/finances");
  await expect(page.getByText("Chase Checking", { exact: true })).toBeVisible({ timeout: 15_000 });
});
