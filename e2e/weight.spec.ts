import { test, expect, type Page } from "@playwright/test";
import { signUp, createMetric, logEntry } from "./helpers";

/**
 * Weight-style metrics hold one reading per day: stepping on the scale twice
 * should correct the day's figure, not record two weights.
 *
 * The paired "accumulates" test is the control — without it, a bug that made
 * every metric single-valued would pass the first test alone.
 */

async function configureMetric(
  page: Page,
  metricId: string,
  opts: { valueType: string; singleValuePerDay: boolean }
): Promise<void> {
  await page.goto(`/metrics/${metricId}/edit`);
  await page.selectOption("#valueType", opts.valueType);
  const toggle = page.locator("#singleValuePerDay");
  if (opts.singleValuePerDay) await toggle.check();
  else await toggle.uncheck();
  await page.getByRole("button", { name: /save changes/i }).click();
  await page.waitForURL(`**/metrics/${metricId}`, { timeout: 30_000 });
}

test("a single-reading metric replaces the day's entry", async ({ page }) => {
  await signUp(page);
  const id = await createMetric(page, "Weight");
  await configureMetric(page, id, { valueType: "number", singleValuePerDay: true });

  await logEntry(page, id, "80.5");
  await logEntry(page, id, "81.2");

  await page.goto(`/metrics/${id}`);

  // One row, holding the corrected figure.
  await expect(page.getByText(/^1 entry$/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("cell", { name: /81\.2/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: /80\.5/ })).toHaveCount(0);
});

test("an ordinary metric still accumulates entries", async ({ page }) => {
  await signUp(page);
  const id = await createMetric(page, "Push Ups");
  await configureMetric(page, id, { valueType: "number", singleValuePerDay: false });

  await logEntry(page, id, "20");
  await logEntry(page, id, "30");

  await page.goto(`/metrics/${id}`);

  await expect(page.getByText(/^2 entries$/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("cell", { name: /^20/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: /^30/ })).toBeVisible();
});
