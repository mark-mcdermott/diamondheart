import { test, expect } from "@playwright/test";
import { PASSWORD, gotoReady, signUp } from "./helpers";

/**
 * Sign-up, sign-out and sign-in all go through Better Auth's browser client.
 * The sign-up helper already covers the first; this test closes the loop by
 * signing out from the avatar menu and back in through the form.
 */
test("signing out and back in returns to the dashboard", async ({ page }) => {
  const email = await signUp(page);

  await gotoReady(page, "/dashboard");
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL("**/login", { timeout: 30_000 });

  // The session is gone: an app path bounces to sign-in. (The page does this
  // itself; the root middleware.ts has never been registered, see CLAUDE.md.)
  await page.goto("/settings");
  await page.waitForURL("**/login**", { timeout: 30_000 });

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  await expect(page.getByRole("link", { name: "Food", exact: true }).first()).toBeVisible({ timeout: 15_000 });
});
