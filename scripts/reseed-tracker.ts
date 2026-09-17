/**
 * Rebuilds the tracker_* tables with per-user ownership.
 *
 * Clears every tracker category/metric/entry/goal, then gives each existing
 * user their own copy of the standard category + metric set. Run this after
 * migrate-tracker-user-scope.ts. Unlike db:seed, it touches nothing else —
 * users, food, workouts, meditation and finances are left alone.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { InferInsertModel } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  users,
  trackerCategories,
  trackerMetrics,
  trackerEntries,
  trackerGoals,
} from "../src/lib/server/db/schema";
import { seedCategories, seedMetrics } from "./tracker-seed-data";

const db = drizzle(neon(process.env.DATABASE_URL!));

const CHUNK = 100;

async function main() {
  await db.delete(trackerGoals);
  await db.delete(trackerEntries);
  await db.delete(trackerMetrics);
  await db.delete(trackerCategories);
  console.log("Cleared tracker categories, metrics, entries and goals.");

  const allUsers = await db.select({ id: users.id, email: users.email }).from(users);
  if (!allUsers.length) {
    console.log("No users found — nothing to seed.");
    return;
  }

  const categoryRows: InferInsertModel<typeof trackerCategories>[] = [];
  const metricRows: InferInsertModel<typeof trackerMetrics>[] = [];

  for (const user of allUsers) {
    const categoryIdMap: Record<string, string> = {};
    for (const cat of seedCategories) {
      const id = randomUUID();
      categoryIdMap[cat.slug] = id;
      categoryRows.push({
        id,
        userId: user.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        sortOrder: cat.sortOrder,
      });
    }
    for (const m of seedMetrics) {
      metricRows.push({
        id: randomUUID(),
        userId: user.id,
        categoryId: categoryIdMap[m.categorySlug],
        name: m.name,
        slug: m.slug,
        description: m.description,
        unit: m.unit,
        valueType: m.valueType,
        dailyGoal: m.dailyGoal,
        icon: m.icon,
        sortOrder: m.sortOrder,
        hidden: m.hidden,
        counter: m.counter ?? false,
      });
    }
  }

  for (let i = 0; i < categoryRows.length; i += CHUNK) {
    await db.insert(trackerCategories).values(categoryRows.slice(i, i + CHUNK));
  }
  for (let i = 0; i < metricRows.length; i += CHUNK) {
    await db.insert(trackerMetrics).values(metricRows.slice(i, i + CHUNK));
  }

  console.log(
    `Seeded ${categoryRows.length} categories and ${metricRows.length} metrics ` +
      `across ${allUsers.length} users.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
