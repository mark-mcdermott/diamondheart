import { test, expect } from "@playwright/test";
import { PASSWORD, gotoReady, signUp } from "./helpers";

/**
 * The account page reads the signed-in user through the API and changes the
 * password through the endpoint; a success line proves the round trip.
 */
test("the account page shows the signed-in user and changes the password", async ({ page }) => {
  const email = await signUp(page);
  await gotoReady(page, "/account");

  await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel("Email")).toHaveValue(email);

  await page.getByLabel("Current password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("New password", { exact: true }).fill("another-horse-battery-staple");
  await page.getByLabel("Confirm new password", { exact: true }).fill("another-horse-battery-staple");
  await page.getByRole("button", { name: "Change password" }).click();

  await expect(page.getByText("Password changed successfully.")).toBeVisible({ timeout: 15_000 });
});
