import { test, expect } from "@playwright/test";
import { signUp, createMetric, unique, gotoReady } from "./helpers";

/**
 * The scoping rule in CLAUDE.md, enforced rather than merely written down.
 *
 * Until PR #188 every tracker table was global: the dashboard pooled all
 * users' metrics and any account could open /metrics/<someone else's id>.
 * Nothing in the unit suite could catch that — these are the assertions that can.
 */

test("one user cannot see or open another user's metric", async ({ browser }) => {
  // Separate contexts rather than sign-out/sign-in: independent cookie jars.
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  const alice = await aliceContext.newPage();
  const bob = await bobContext.newPage();

  const secret = `zzsecret${unique()}`;

  await signUp(alice);
  const metricId = await createMetric(alice, secret);

  await signUp(bob);

  await gotoReady(bob, "/metrics");
  await expect(bob.getByText(new RegExp(secret, "i"))).toHaveCount(0);

  await gotoReady(bob, "/dashboard");
  await expect(bob.getByText(new RegExp(secret, "i"))).toHaveCount(0);

  // Direct URL with Alice's id is the case the dashboard fix alone would miss.
  await gotoReady(bob, `/metrics/${metricId}`);
  await expect(bob.getByText(/page not found/i)).toBeVisible();

  // Guard against a false pass: Alice must still reach her own metric.
  await gotoReady(alice, `/metrics/${metricId}`);
  await expect(alice.getByText(new RegExp(secret, "i")).first()).toBeVisible();

  await aliceContext.close();
  await bobContext.close();
});

test("a failed action tells the user why, instead of appearing to work", async ({ page }) => {
  await signUp(page);
  await gotoReady(page, "/metrics");

  async function createCategory(name: string) {
    await page.getByRole("button", { name: /add section|add category/i }).click();
    await page.getByPlaceholder(/Section name/i).fill(name);
    await page.getByRole("button", { name: "Create", exact: true }).click();
  }

  // On success the component closes the form — the app's own signal that the
  // write landed, rather than guessing at how categories render.
  await createCategory("Duplicate Probe");
  await expect(page.getByPlaceholder(/Section name/i)).toBeHidden({ timeout: 20_000 });

  // The same name again is rejected by createCategory. Before the Toaster was
  // mounted, that rejection had nowhere to go: the form simply sat there.
  await createCategory("Duplicate Probe");
  await expect(page.getByText(/already exists/i)).toBeVisible({ timeout: 15_000 });
  // And the form stays open, because it did not succeed.
  await expect(page.getByPlaceholder(/Section name/i)).toBeVisible();
});
