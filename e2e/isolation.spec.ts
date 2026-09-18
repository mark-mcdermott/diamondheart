import { test, expect, type Page } from "@playwright/test";

/**
 * The scoping rule in CLAUDE.md, enforced rather than merely written down.
 *
 * Until PR #188 every tracker table was global: the dashboard pooled all
 * users' metrics and any account could open /metrics/<someone else's id>.
 * Nothing in the unit suite could catch that — these are the assertions that can.
 */

const PASSWORD = "correct-horse-battery-staple";

function unique(): string {
  return Math.random().toString(36).slice(2, 10);
}

async function signUp(page: Page): Promise<string> {
  const email = `e2e-${unique()}@example.test`;
  await page.goto("/signup");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="name"]', "E2E User");
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirmPassword"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  return email;
}

async function createMetric(page: Page, name: string): Promise<string> {
  await page.goto("/metrics");
  await page.getByRole("button", { name: "Add Metric" }).click();
  await page.getByPlaceholder("e.g. Water intake").fill(name);
  await page.getByRole("button", { name: "Save Metric" }).click();

  const link = page.locator('a[href^="/metrics/"]').filter({ hasText: new RegExp(name, "i") }).first();
  await expect(link).toBeVisible({ timeout: 15_000 });

  const href = await link.getAttribute("href");
  const id = href?.split("/").pop();
  expect(id, "created metric should have an id").toBeTruthy();
  return id as string;
}

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

  await bob.goto("/metrics");
  await expect(bob.getByText(new RegExp(secret, "i"))).toHaveCount(0);

  await bob.goto("/dashboard");
  await expect(bob.getByText(new RegExp(secret, "i"))).toHaveCount(0);

  // Direct URL with Alice's id is the case the dashboard fix alone would miss.
  await bob.goto(`/metrics/${metricId}`);
  await expect(bob.getByText(/page not found/i)).toBeVisible();

  // Guard against a false pass: Alice must still reach her own metric.
  await alice.goto(`/metrics/${metricId}`);
  await expect(alice.getByText(new RegExp(secret, "i")).first()).toBeVisible();

  await aliceContext.close();
  await bobContext.close();
});
