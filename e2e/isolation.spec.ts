import { test, expect } from "@playwright/test";
import { signUp, createMetric, unique } from "./helpers";

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
