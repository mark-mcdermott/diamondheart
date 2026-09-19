import { expect, type Page } from "@playwright/test";

export const PASSWORD = "correct-horse-battery-staple";

export function unique(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function signUp(page: Page): Promise<string> {
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

export async function createMetric(page: Page, name: string): Promise<string> {
  await page.goto("/metrics");
  await page.getByRole("button", { name: "Add Metric" }).click();
  await page.getByPlaceholder("e.g. Water intake").fill(name);
  await page.getByRole("button", { name: "Save Metric" }).click();

  const link = page
    .locator('a[href^="/metrics/"]')
    .filter({ hasText: new RegExp(name, "i") })
    .first();
  await expect(link).toBeVisible({ timeout: 15_000 });

  const href = await link.getAttribute("href");
  const id = href?.split("/").pop();
  expect(id, "created metric should have an id").toBeTruthy();
  return id as string;
}

/** Logs a value through the /entry form, which redirects to the dashboard. */
export async function logEntry(page: Page, metricId: string, value: string): Promise<void> {
  await page.goto("/entry");
  await page.selectOption('select[name="metricId"]', metricId);
  await page.fill('input[name="value"]', value);
  await page.getByRole("button", { name: /save entry/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
}
