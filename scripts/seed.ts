import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { InferInsertModel } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import {
  users,
  trackerCategories,
  trackerMetrics,
  userNavItems,
  financialAccounts,
  financialCategories,
  financialTransactions,
  financialBudgets,
  financialInvestments,
  financialProperties,
  financialRetirementPlans,
  financialSnapshots,
} from "../src/lib/server/db/schema";
import { DEFAULT_NAV_ITEMS } from "../src/lib/nav-utils";
import { hash } from "bcryptjs";
import { randomUUID, randomBytes } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { seedBuiltInExercises, seedDemoDataForUser } from "./seed-demo-data";
import { seedCategories, seedMetrics } from "./tracker-seed-data";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const seedUsers = [
  // Admin users
  { email: "admin@diamondheart.app",              name: "Admin",             role: "admin" },
  { email: "mark@markmcdermott.io",               name: "Mark McDermott",    role: "admin" },

  // Regular test user
  { email: "user@diamondheart.app",               name: "Test User",         role: "user" },

  // Office users
  { email: "michael.scott@dundermifflin.com",      name: "Michael Scott",     role: "user" },
  { email: "dwight.schrute@dundermifflin.com",     name: "Dwight Schrute",    role: "user" },
  { email: "jim.halpert@dundermifflin.com",        name: "Jim Halpert",       role: "user" },
  { email: "pam.beesly@dundermifflin.com",         name: "Pam Beesly",       role: "user" },
  { email: "ryan.howard@dundermifflin.com",        name: "Ryan Howard",       role: "user" },
  { email: "andy.bernard@dundermifflin.com",       name: "Andy Bernard",      role: "user" },
  { email: "angela.martin@dundermifflin.com",      name: "Angela Martin",     role: "user" },
  { email: "kevin.malone@dundermifflin.com",       name: "Kevin Malone",      role: "user" },
  { email: "oscar.martinez@dundermifflin.com",     name: "Oscar Martinez",    role: "user" },
  { email: "stanley.hudson@dundermifflin.com",     name: "Stanley Hudson",    role: "user" },
  { email: "phyllis.vance@dundermifflin.com",      name: "Phyllis Vance",     role: "user" },
  { email: "meredith.palmer@dundermifflin.com",    name: "Meredith Palmer",   role: "user" },
  { email: "creed.bratton@dundermifflin.com",      name: "Creed Bratton",     role: "user" },
  { email: "kelly.kapoor@dundermifflin.com",       name: "Kelly Kapoor",      role: "user" },
  { email: "toby.flenderson@dundermifflin.com",    name: "Toby Flenderson",   role: "user" },
  { email: "darryl.philbin@dundermifflin.com",     name: "Darryl Philbin",    role: "user" },
  { email: "erin.hannon@dundermifflin.com",        name: "Erin Hannon",       role: "user" },
  { email: "gabe.lewis@dundermifflin.com",         name: "Gabe Lewis",        role: "user" },
  { email: "holly.flax@dundermifflin.com",         name: "Holly Flax",        role: "user" },
  { email: "jan.levinson@dundermifflin.com",       name: "Jan Levinson",      role: "user" },
];

// Metrics in current production order (sort_order matches current DB state)

// Generate a strong random password: lowercase, uppercase, number, 2+ special chars
function generatePassword(length = 14): string {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const special = "!@#$%&*";

  const required = [
    lower[randomBytes(1)[0] % lower.length],
    upper[randomBytes(1)[0] % upper.length],
    digits[randomBytes(1)[0] % digits.length],
    special[randomBytes(1)[0] % special.length],
    special[randomBytes(1)[0] % special.length],
  ];

  const all = lower + upper + digits + special;
  const remaining = Array.from({ length: length - required.length }, () =>
    all[randomBytes(1)[0] % all.length]
  );

  const chars = [...required, ...remaining];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

const INSERT_CHUNK_SIZE = 100;

async function insertInChunks<T extends PgTable>(
  table: T,
  rows: InferInsertModel<T>[]
): Promise<void> {
  for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
    await db.insert(table).values(rows.slice(i, i + INSERT_CHUNK_SIZE));
  }
}

async function seed() {
  console.log("Seeding database...\n");

  // --- Users ---
  await db.delete(userNavItems); // delete nav items first (FK dependency)
  await db.delete(users);
  console.log("Cleared users & nav items.");

  const credentials: { email: string; password: string; role: string }[] = [];
  const userIds: string[] = [];

  for (const u of seedUsers) {
    const password = generatePassword();
    const passwordHash = await hash(password, 12);
    const userId = randomUUID();
    userIds.push(userId);
    await db.insert(users).values({
      id: userId,
      email: u.email,
      passwordHash,
      name: u.name,
      role: u.role,
      avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(u.name)}&backgroundColor=C4653A,D4964A,A0785A&backgroundType=gradientLinear&fontFamily=Georgia&fontSize=40`,
    });
    credentials.push({ email: u.email, password, role: u.role });
    console.log(`  Created ${u.role.padEnd(5)} ${u.email}`);
  }

  // --- Categories & metrics (per user) ---
  await db.delete(trackerMetrics); // delete metrics first (FK dependency)
  await db.delete(trackerCategories);
  console.log("\nCleared categories & metrics.");

  const categoryRows: InferInsertModel<typeof trackerCategories>[] = [];
  const metricRows: InferInsertModel<typeof trackerMetrics>[] = [];

  for (const userId of userIds) {
    const categoryIdMap: Record<string, string> = {};
    for (const cat of seedCategories) {
      const id = randomUUID();
      categoryIdMap[cat.slug] = id;
      categoryRows.push({
        id,
        userId,
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
        userId,
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
        singleValuePerDay: m.singleValuePerDay ?? false,
      });
    }
  }

  await insertInChunks(trackerCategories, categoryRows);
  await insertInChunks(trackerMetrics, metricRows);

  const onCount = seedMetrics.filter((m) => !m.hidden).length;
  const offCount = seedMetrics.length - onCount;
  console.log(
    `  ${seedCategories.length} categories + ${seedMetrics.length} metrics per user ` +
      `(${onCount} ON, ${offCount} OFF) across ${userIds.length} users`
  );

  // --- Nav Items (per user) ---
  // Canonical list lives in src/lib/nav-utils.ts; this copy had already
  // drifted (no Metrics, no Community, a gap at sortOrder 8).
  const defaultNavItems = DEFAULT_NAV_ITEMS;

  let navCount = 0;
  for (const userId of userIds) {
    for (const item of defaultNavItems) {
      await db.insert(userNavItems).values({
        id: randomUUID(),
        userId,
        label: item.label,
        href: item.href,
        itemType: item.itemType,
        sortOrder: item.sortOrder,
        visible: item.visible,
        locked: item.locked,
      });
      navCount++;
    }
  }
  console.log(`  ${navCount} nav items (${defaultNavItems.length} per user)`);

  // --- Financial data (for first 3 users: admin, mark, test user) ---
  await db.delete(financialSnapshots);
  await db.delete(financialTransactions);
  await db.delete(financialBudgets);
  await db.delete(financialInvestments);
  await db.delete(financialProperties);
  await db.delete(financialRetirementPlans);
  await db.delete(financialCategories);
  await db.delete(financialAccounts);
  console.log("\nCleared financial data.");

  const financeUserIds = userIds.slice(0, 3); // admin, mark, test user

  for (const userId of financeUserIds) {
    // Default categories
    const catIds: Record<string, string> = {};
    const defaultFinCats = [
      { name: "Salary", slug: "salary", type: "income", icon: "briefcase" },
      { name: "Freelance", slug: "freelance", type: "income", icon: "laptop" },
      { name: "Dividends", slug: "dividends", type: "income", icon: "trending-up" },
      { name: "Housing", slug: "housing", type: "expense", icon: "home" },
      { name: "Groceries", slug: "groceries", type: "expense", icon: "shopping-cart" },
      { name: "Transportation", slug: "transportation", type: "expense", icon: "car" },
      { name: "Utilities", slug: "utilities", type: "expense", icon: "zap" },
      { name: "Dining Out", slug: "dining-out", type: "expense", icon: "utensils" },
      { name: "Entertainment", slug: "entertainment", type: "expense", icon: "film" },
      { name: "Subscriptions", slug: "subscriptions", type: "expense", icon: "repeat" },
      { name: "Savings", slug: "savings", type: "transfer", icon: "piggy-bank" },
    ];
    for (let i = 0; i < defaultFinCats.length; i++) {
      const c = defaultFinCats[i];
      const id = randomUUID();
      catIds[c.slug] = id;
      await db.insert(financialCategories).values({
        id, userId, name: c.name, slug: c.slug, type: c.type, icon: c.icon, isDefault: true, sortOrder: i,
      });
    }

    // Accounts
    const checkingId = randomUUID();
    const savingsId = randomUUID();
    const creditId = randomUUID();
    const investmentId = randomUUID();

    await db.insert(financialAccounts).values([
      { id: checkingId, userId, name: "Main Checking", accountType: "checking", institution: "Chase", balanceCents: 485032, currency: "USD" },
      { id: savingsId, userId, name: "Emergency Fund", accountType: "savings", institution: "Marcus", balanceCents: 2150000, currency: "USD" },
      { id: creditId, userId, name: "Visa Rewards", accountType: "credit_card", institution: "Chase", balanceCents: -142567, currency: "USD" },
      { id: investmentId, userId, name: "Brokerage", accountType: "investment", institution: "Fidelity", balanceCents: 0, currency: "USD" },
    ]);

    // Sample transactions (last 30 days)
    const txData = [
      { acct: checkingId, cat: "salary", type: "income", amount: 650000, desc: "Paycheck", merchant: "Employer", daysAgo: 1 },
      { acct: checkingId, cat: "salary", type: "income", amount: 650000, desc: "Paycheck", merchant: "Employer", daysAgo: 15 },
      { acct: checkingId, cat: "housing", type: "expense", amount: -195000, desc: "Rent", merchant: "Property Mgmt", daysAgo: 2 },
      { acct: creditId, cat: "groceries", type: "expense", amount: -15234, desc: "Weekly groceries", merchant: "HEB", daysAgo: 3 },
      { acct: creditId, cat: "groceries", type: "expense", amount: -8750, desc: "Groceries", merchant: "Trader Joes", daysAgo: 10 },
      { acct: creditId, cat: "dining-out", type: "expense", amount: -4599, desc: "Dinner", merchant: "Uchi", daysAgo: 5 },
      { acct: creditId, cat: "dining-out", type: "expense", amount: -2345, desc: "Lunch", merchant: "Chipotle", daysAgo: 8 },
      { acct: creditId, cat: "transportation", type: "expense", amount: -5500, desc: "Gas", merchant: "Shell", daysAgo: 7 },
      { acct: creditId, cat: "utilities", type: "expense", amount: -18500, desc: "Electric bill", merchant: "Austin Energy", daysAgo: 12 },
      { acct: creditId, cat: "subscriptions", type: "expense", amount: -1599, desc: "Netflix", merchant: "Netflix", daysAgo: 14 },
      { acct: creditId, cat: "subscriptions", type: "expense", amount: -1099, desc: "Spotify", merchant: "Spotify", daysAgo: 14 },
      { acct: creditId, cat: "entertainment", type: "expense", amount: -3200, desc: "Movie tickets", merchant: "AMC", daysAgo: 9 },
      { acct: checkingId, cat: "savings", type: "transfer", amount: -50000, desc: "Monthly savings", merchant: null, daysAgo: 2 },
    ];

    for (const tx of txData) {
      const d = new Date();
      d.setDate(d.getDate() - tx.daysAgo);
      await db.insert(financialTransactions).values({
        id: randomUUID(), userId, accountId: tx.acct, categoryId: catIds[tx.cat], type: tx.type,
        amountCents: tx.amount, description: tx.desc, merchant: tx.merchant, date: d, importSource: "manual",
      });
    }

    // Budgets
    const budgetData = [
      { cat: "housing", amount: 200000 },
      { cat: "groceries", amount: 40000 },
      { cat: "dining-out", amount: 20000 },
      { cat: "transportation", amount: 15000 },
      { cat: "utilities", amount: 25000 },
      { cat: "entertainment", amount: 15000 },
      { cat: "subscriptions", amount: 5000 },
    ];
    for (const b of budgetData) {
      await db.insert(financialBudgets).values({
        id: randomUUID(), userId, categoryId: catIds[b.cat], amountCents: b.amount, period: "monthly",
      });
    }

    // Investments
    await db.insert(financialInvestments).values([
      { id: randomUUID(), userId, accountId: investmentId, symbol: "VTI", name: "Vanguard Total Stock Market ETF", investmentType: "etf", shares: "45.5", costBasisCents: 850000, currentPriceCents: 26800 },
      { id: randomUUID(), userId, accountId: investmentId, symbol: "AAPL", name: "Apple Inc.", investmentType: "stock", shares: "20", costBasisCents: 320000, currentPriceCents: 19500 },
      { id: randomUUID(), userId, accountId: null, symbol: "COMP", name: "Company RSU Grant", investmentType: "rsu", shares: "100", costBasisCents: 0, currentPriceCents: 15000, grantDate: new Date("2024-01-15"), vestingDate: new Date("2025-01-15") },
      { id: randomUUID(), userId, accountId: null, symbol: "COMP", name: "Company ISO Grant", investmentType: "iso", shares: "200", costBasisCents: 0, currentPriceCents: 15000, strikePriceCents: 8000, grantDate: new Date("2023-06-01"), expirationDate: new Date("2033-06-01") },
    ]);

    // Property
    await db.insert(financialProperties).values({
      id: randomUUID(), userId, name: "Primary Residence", address: "123 Main St, Austin, TX",
      purchasePriceCents: 42500000, currentValueCents: 51000000, purchaseDate: new Date("2021-03-15"),
      mortgageBalanceCents: 33500000, mortgageRatePercent: "6.25", mortgageMonthlyPaymentCents: 245000,
      propertyType: "primary",
    });

    // Retirement plans
    await db.insert(financialRetirementPlans).values([
      {
        id: randomUUID(), userId, name: "Company 401(k)", planType: "401k", institution: "Fidelity",
        balanceCents: 18500000, employerMatch: "100% up to 6%", contributionYtdCents: 780000,
        contributionLimitCents: 2350000, monthlyContributionCents: 195000, expectedReturnPercent: "7",
        targetRetirementAge: 60,
      },
      {
        id: randomUUID(), userId, name: "Roth IRA", planType: "roth_ira", institution: "Vanguard",
        balanceCents: 6200000, contributionYtdCents: 350000, contributionLimitCents: 700000,
        monthlyContributionCents: 58333, expectedReturnPercent: "7", targetRetirementAge: 60,
      },
    ]);

    // Net worth snapshot
    const totalAssets = 485032 + 2150000 + (45.5 * 26800 + 20 * 19500 + 100 * 15000 + 200 * 15000) + 51000000 + 18500000 + 6200000;
    const totalLiabilities = 142567 + 33500000;
    await db.insert(financialSnapshots).values({
      id: randomUUID(), userId, date: new Date(), netWorthCents: Math.round(totalAssets - totalLiabilities),
      totalAssetsCents: Math.round(totalAssets), totalLiabilitiesCents: Math.round(totalLiabilities),
      breakdown: { checking: 485032, savings: 2150000, credit_card: -142567, investments: Math.round(45.5 * 26800 + 20 * 19500 + 100 * 15000 + 200 * 15000), property_equity: 51000000 - 33500000, retirement: 18500000 + 6200000 },
    });
  }
  console.log(`  Financial data seeded for ${financeUserIds.length} users`);

  // --- Built-in exercise library (shared across all users) ---
  console.log("\nSeeding built-in exercise library...");
  const exerciseIdsByName = await seedBuiltInExercises(db);
  console.log(`  ${exerciseIdsByName.size} exercises in library`);

  // --- Demo data for the test user (entertainment, meditation, food, etc.) ---
  console.log("\nSeeding demo data for user@diamondheart.app...");
  const testUserIndex = seedUsers.findIndex((u) => u.email === "user@diamondheart.app");
  if (testUserIndex === -1) throw new Error("Test user not found in seedUsers");
  await seedDemoDataForUser(db, userIds[testUserIndex], exerciseIdsByName);
  console.log("  Demo data ready");

  // --- Write credentials to .secrets ---
  const secretsPath = resolve(import.meta.dirname, "../.secrets");
  let existing = "";
  try { existing = readFileSync(secretsPath, "utf-8"); } catch {}

  existing = existing.replace(/# --- SEED CREDENTIALS ---[\s\S]*# --- END SEED CREDENTIALS ---\n?/, "");

  const credBlock = [
    "# --- SEED CREDENTIALS ---",
    `# Generated by scripts/seed.ts on ${new Date().toISOString().split("T")[0]}`,
    ...credentials.map((c) => `# ${c.role.padEnd(5)} ${c.email.padEnd(45)} ${c.password}`),
    "# --- END SEED CREDENTIALS ---",
    "",
  ].join("\n");

  writeFileSync(secretsPath, existing.trimEnd() + (existing.trim() ? "\n\n" : "") + credBlock);
  console.log(`\nSeeded ${credentials.length} users, ${seedCategories.length} categories, ${seedMetrics.length} metrics.`);
  console.log("Credentials written to .secrets");
}

seed().catch(console.error);
