import { expect, type Page } from "@playwright/test";
import { neon } from "@neondatabase/serverless";

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

  // The list updates from local state, so its first render says nothing about
  // whether the insert landed. Under load it can show "No metrics yet" while
  // the action is still in flight. Reload until the server agrees the metric
  // exists — the same trap fixed for the settings toggle in #209.
  const link = page
    .locator('a[href^="/metrics/"]')
    .filter({ hasText: new RegExp(name, "i") })
    .first();

  await expect(async () => {
    await page.goto("/metrics");
    await expect(link).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 30_000 });

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

/**
 * Seeds a favourite food straight into the database.
 *
 * The UI can only create favourites by starring a USDA search result, which
 * needs an API key CI does not have. Staging a favourite is the only path to
 * the quantity picker, so the fixture is set up out of band and the UI is then
 * driven normally.
 */
export async function seedFavoriteFood(
  email: string,
  food: { name: string; calories: number; protein: number; carbs: number; fat: number }
): Promise<void> {
  // The wrapper exports DATABASE_URL to the child; running playwright directly
  // only has TEST_DATABASE_URL.
  const url = process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("no database url for seeding");
  const sql = neon(url);
  const [user] = (await sql.query("select id from users where email = $1", [email])) as {
    id: string;
  }[];
  if (!user) throw new Error(`no user ${email}`);

  await sql.query(
    `insert into favorite_foods
       (id, user_id, name, serving_size, serving_unit, calories, protein, carbs, fat)
     values ($1, $2, $3, 1, 'serving', $4, $5, $6, $7)`,
    [crypto.randomUUID(), user.id, food.name, food.calories, food.protein, food.carbs, food.fat]
  );
}

export async function dailyTotal(page: Page, macro: string): Promise<number> {
  const text = await page.getByTestId(`total-${macro}`).innerText();
  return Number(text);
}
