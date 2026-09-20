import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  financialAccounts,
  financialBudgets,
  financialCategories,
  financialInvestments,
  financialProperties,
  financialRetirementPlans,
  financialSnapshots,
  financialTransactions,
} from "@/db/schema";
import { slugify } from "@/lib/slug";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { HttpError, fail, handler, json, noContent, notFound, readJson } from "./_lib/http";
import {
  createFinanceAccountSchema,
  createFinanceCategorySchema,
  createInvestmentSchema,
  createPropertySchema,
  createRetirementPlanSchema,
  createTransactionSchema,
  importTransactionsSchema,
  setBudgetSchema,
  updateFinanceAccountSchema,
  updateInvestmentSchema,
  updatePropertySchema,
  updateRetirementPlanSchema,
  updateTransactionSchema,
  type CreateFinanceAccount,
  type CreateFinanceCategory,
  type CreateInvestment,
  type CreateProperty,
  type CreateRetirementPlan,
  type CreateTransaction,
  type ImportTransactions,
  type SetBudget,
  type UpdateFinanceAccount,
  type UpdateInvestment,
  type UpdateProperty,
  type UpdateRetirementPlan,
  type UpdateTransaction,
} from "./_lib/schemas";

export type FinanceAccount = typeof financialAccounts.$inferSelect;
export type FinanceCategory = typeof financialCategories.$inferSelect;
export type Transaction = typeof financialTransactions.$inferSelect;
export type Budget = typeof financialBudgets.$inferSelect;
export type Investment = typeof financialInvestments.$inferSelect;
export type Property = typeof financialProperties.$inferSelect;
export type RetirementPlan = typeof financialRetirementPlans.$inferSelect;
export type Snapshot = typeof financialSnapshots.$inferSelect;

/** Assigns every defined key of `patch` (except those listed) onto a fresh columns object. */
function pick<T extends object>(patch: T, keys: readonly (keyof T)[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) if (patch[key] !== undefined) out[key as string] = patch[key];
  return out;
}

// --- accounts -------------------------------------------------------------------

export function listAccounts(userId: string): Promise<FinanceAccount[]> {
  return db.select().from(financialAccounts).where(and(eq(financialAccounts.userId, userId), eq(financialAccounts.archived, false))).orderBy(financialAccounts.name);
}

async function ownedAccountId(userId: string, accountId: string): Promise<string> {
  const [row] = await db.select({ id: financialAccounts.id }).from(financialAccounts).where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.userId, userId))).limit(1);
  if (!row) throw new HttpError(notFound("Account not found"));
  return row.id;
}

export async function createAccount(userId: string, input: CreateFinanceAccount): Promise<FinanceAccount> {
  const [row] = await db
    .insert(financialAccounts)
    .values({
      id: crypto.randomUUID(),
      userId,
      name: input.name,
      accountType: input.accountType,
      institution: input.institution ?? null,
      balanceCents: input.balanceCents ?? 0,
      currency: input.currency ?? "USD",
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updateAccount(userId: string, id: string, patch: UpdateFinanceAccount): Promise<FinanceAccount> {
  const columns = pick(patch, ["name", "accountType", "institution", "balanceCents", "currency", "notes", "archived"]);
  const [row] =
    Object.keys(columns).length === 0
      ? await db.select().from(financialAccounts).where(and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId))).limit(1)
      : await db.update(financialAccounts).set({ ...columns, updatedAt: new Date() }).where(and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId))).returning();
  if (!row) throw new HttpError(notFound("Account not found"));
  return row;
}

/** Accounts are archived, never deleted: their transactions are history. */
export async function archiveAccount(userId: string, id: string): Promise<void> {
  const rows = await db.update(financialAccounts).set({ archived: true, updatedAt: new Date() }).where(and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId))).returning({ id: financialAccounts.id });
  if (rows.length === 0) throw new HttpError(notFound("Account not found"));
}

// --- categories -----------------------------------------------------------------

const DEFAULT_CATEGORIES = [
  ["Salary", "salary", "income", "briefcase"],
  ["Freelance", "freelance", "income", "laptop"],
  ["Dividends", "dividends", "income", "trending-up"],
  ["Other Income", "other-income", "income", "plus-circle"],
  ["Housing", "housing", "expense", "home"],
  ["Groceries", "groceries", "expense", "shopping-cart"],
  ["Transportation", "transportation", "expense", "car"],
  ["Utilities", "utilities", "expense", "zap"],
  ["Insurance", "insurance", "expense", "shield"],
  ["Healthcare", "healthcare", "expense", "heart"],
  ["Dining Out", "dining-out", "expense", "utensils"],
  ["Entertainment", "entertainment", "expense", "film"],
  ["Shopping", "shopping", "expense", "shopping-bag"],
  ["Subscriptions", "subscriptions", "expense", "repeat"],
  ["Education", "education", "expense", "book-open"],
  ["Personal Care", "personal-care", "expense", "scissors"],
  ["Savings", "savings", "transfer", "piggy-bank"],
  ["Investment", "investment", "transfer", "trending-up"],
  ["Debt Payment", "debt-payment", "expense", "credit-card"],
  ["Taxes", "taxes", "expense", "file-text"],
  ["Gifts & Donations", "gifts-donations", "expense", "gift"],
  ["Travel", "travel", "expense", "plane"],
  ["Pets", "pets", "expense", "paw-print"],
  ["Miscellaneous", "miscellaneous", "expense", "more-horizontal"],
] as const;

/** The category list, seeded with the defaults the first time it is read. */
export async function listCategories(userId: string): Promise<FinanceCategory[]> {
  const [any] = await db.select({ id: financialCategories.id }).from(financialCategories).where(eq(financialCategories.userId, userId)).limit(1);
  if (!any) {
    await db.insert(financialCategories).values(
      DEFAULT_CATEGORIES.map(([name, slug, type, icon], i) => ({ id: crypto.randomUUID(), userId, name, slug, type, icon, isDefault: true, sortOrder: i }))
    );
  }
  return db.select().from(financialCategories).where(eq(financialCategories.userId, userId)).orderBy(financialCategories.sortOrder);
}

async function ownedCategoryId(userId: string, categoryId: string): Promise<string> {
  const [row] = await db.select({ id: financialCategories.id }).from(financialCategories).where(and(eq(financialCategories.id, categoryId), eq(financialCategories.userId, userId))).limit(1);
  if (!row) throw new HttpError(notFound("Category not found"));
  return row.id;
}

export async function createCategory(userId: string, input: CreateFinanceCategory): Promise<FinanceCategory> {
  const [row] = await db
    .insert(financialCategories)
    .values({ id: crypto.randomUUID(), userId, name: input.name, slug: slugify(input.name), type: input.type ?? "expense", icon: input.icon ?? null, isDefault: false })
    .returning();
  return row;
}

// --- transactions -----------------------------------------------------------------

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  type?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export function listTransactions(userId: string, f: TransactionFilters = {}): Promise<Transaction[]> {
  const conditions = [eq(financialTransactions.userId, userId)];
  if (f.accountId) conditions.push(eq(financialTransactions.accountId, f.accountId));
  if (f.categoryId) conditions.push(eq(financialTransactions.categoryId, f.categoryId));
  if (f.type) conditions.push(eq(financialTransactions.type, f.type));
  if (f.from) conditions.push(gte(financialTransactions.date, f.from));
  if (f.to) conditions.push(lte(financialTransactions.date, f.to));
  return db
    .select()
    .from(financialTransactions)
    .where(and(...conditions))
    .orderBy(desc(financialTransactions.date))
    .limit(Math.min(f.limit ?? 50, 500))
    .offset(f.offset ?? 0);
}

function signed(type: string, magnitudeCents: number): number {
  return type === "expense" ? -Math.abs(magnitudeCents) : Math.abs(magnitudeCents);
}

/** Records a transaction and moves the account balance in the same request. The account must be the caller's. */
export async function createTransaction(userId: string, input: CreateTransaction): Promise<Transaction> {
  const accountId = await ownedAccountId(userId, input.accountId);
  const categoryId = input.categoryId ? await ownedCategoryId(userId, input.categoryId) : null;
  const amountCents = signed(input.type, input.amountCents);

  const [row] = await db
    .insert(financialTransactions)
    .values({
      id: crypto.randomUUID(),
      userId,
      accountId,
      categoryId,
      type: input.type,
      amountCents,
      description: input.description,
      merchant: input.merchant ?? null,
      date: input.date ?? new Date(),
      notes: input.notes ?? null,
      isRecurring: input.isRecurring ?? false,
      importSource: "manual",
    })
    .returning();

  await db
    .update(financialAccounts)
    .set({ balanceCents: sql`${financialAccounts.balanceCents} + ${amountCents}`, updatedAt: new Date() })
    .where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.userId, userId)));
  return row;
}

export async function updateTransaction(userId: string, id: string, patch: UpdateTransaction): Promise<Transaction> {
  if (patch.categoryId) await ownedCategoryId(userId, patch.categoryId);
  const columns = pick(patch, ["categoryId", "description", "merchant", "notes"]);
  const [row] =
    Object.keys(columns).length === 0
      ? await db.select().from(financialTransactions).where(and(eq(financialTransactions.id, id), eq(financialTransactions.userId, userId))).limit(1)
      : await db.update(financialTransactions).set({ ...columns, updatedAt: new Date() }).where(and(eq(financialTransactions.id, id), eq(financialTransactions.userId, userId))).returning();
  if (!row) throw new HttpError(notFound("Transaction not found"));
  return row;
}

/** Deletes a transaction and reverses its effect on the account balance. */
export async function deleteTransaction(userId: string, id: string): Promise<void> {
  const [tx] = await db.delete(financialTransactions).where(and(eq(financialTransactions.id, id), eq(financialTransactions.userId, userId))).returning();
  if (!tx) throw new HttpError(notFound("Transaction not found"));
  await db
    .update(financialAccounts)
    .set({ balanceCents: sql`${financialAccounts.balanceCents} - ${tx.amountCents}`, updatedAt: new Date() })
    .where(and(eq(financialAccounts.id, tx.accountId), eq(financialAccounts.userId, userId)));
}

/**
 * Imports rows from a CSV, skipping any whose import key was seen before, then
 * recomputes the account balance from every transaction on it.
 */
export async function importTransactions(userId: string, input: ImportTransactions): Promise<{ imported: number; skipped: number }> {
  const accountId = await ownedAccountId(userId, input.accountId);
  let imported = 0;
  let skipped = 0;

  for (const tx of input.transactions) {
    const importId = `csv-${accountId}-${tx.date}-${tx.description}-${tx.amount}`;
    const [existing] = await db.select({ id: financialTransactions.id }).from(financialTransactions).where(and(eq(financialTransactions.userId, userId), eq(financialTransactions.importId, importId))).limit(1);
    if (existing) {
      skipped++;
      continue;
    }
    const when = new Date(tx.date);
    if (Number.isNaN(when.getTime())) throw new HttpError(fail(422, "Validation failed", { transactions: [`Unreadable date: ${tx.date}`] }));
    await db.insert(financialTransactions).values({
      id: crypto.randomUUID(),
      userId,
      accountId,
      categoryId: tx.categoryId ? await ownedCategoryId(userId, tx.categoryId) : null,
      type: tx.type,
      amountCents: signed(tx.type, Math.round(tx.amount * 100)),
      description: tx.description,
      merchant: tx.merchant ?? null,
      date: when,
      importSource: "csv",
      importId,
    });
    imported++;
  }

  const [balance] = await db.select({ total: sql<number>`COALESCE(SUM(${financialTransactions.amountCents}), 0)` }).from(financialTransactions).where(and(eq(financialTransactions.accountId, accountId), eq(financialTransactions.userId, userId)));
  await db.update(financialAccounts).set({ balanceCents: Number(balance?.total ?? 0), updatedAt: new Date() }).where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.userId, userId)));
  return { imported, skipped };
}

export interface MonthSummary {
  spending: { categoryId: string | null; totalCents: number; count: number }[];
  incomeCents: number;
}

export async function monthSummary(userId: string, year: number, month: number): Promise<MonthSummary> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  const inMonth = and(eq(financialTransactions.userId, userId), gte(financialTransactions.date, start), lte(financialTransactions.date, end));
  const [spending, [income]] = await Promise.all([
    db
      .select({ categoryId: financialTransactions.categoryId, totalCents: sql<number>`COALESCE(SUM(ABS(${financialTransactions.amountCents})), 0)`, count: sql<number>`COUNT(*)` })
      .from(financialTransactions)
      .where(and(inMonth, eq(financialTransactions.type, "expense")))
      .groupBy(financialTransactions.categoryId),
    db.select({ totalCents: sql<number>`COALESCE(SUM(${financialTransactions.amountCents}), 0)` }).from(financialTransactions).where(and(inMonth, eq(financialTransactions.type, "income"))),
  ]);
  return {
    spending: spending.map((r) => ({ categoryId: r.categoryId, totalCents: Number(r.totalCents), count: Number(r.count) })),
    incomeCents: Number(income?.totalCents ?? 0),
  };
}

// --- budgets ---------------------------------------------------------------------

export function listBudgets(userId: string): Promise<Budget[]> {
  return db.select().from(financialBudgets).where(eq(financialBudgets.userId, userId));
}

/** One budget per category: sets it, creating on first use. */
export async function setBudget(userId: string, input: SetBudget): Promise<Budget> {
  const categoryId = await ownedCategoryId(userId, input.categoryId);
  const period = input.period ?? "monthly";
  const [existing] = await db.select().from(financialBudgets).where(and(eq(financialBudgets.userId, userId), eq(financialBudgets.categoryId, categoryId))).limit(1);
  if (existing) {
    const [row] = await db.update(financialBudgets).set({ amountCents: input.amountCents, period, updatedAt: new Date() }).where(eq(financialBudgets.id, existing.id)).returning();
    return row;
  }
  const [row] = await db.insert(financialBudgets).values({ id: crypto.randomUUID(), userId, categoryId, amountCents: input.amountCents, period }).returning();
  return row;
}

export async function deleteBudget(userId: string, id: string): Promise<void> {
  const rows = await db.delete(financialBudgets).where(and(eq(financialBudgets.id, id), eq(financialBudgets.userId, userId))).returning({ id: financialBudgets.id });
  if (rows.length === 0) throw new HttpError(notFound("Budget not found"));
}

// --- investments, properties, retirement -----------------------------------------------

export function listInvestments(userId: string): Promise<Investment[]> {
  return db.select().from(financialInvestments).where(eq(financialInvestments.userId, userId)).orderBy(financialInvestments.symbol);
}

export async function createInvestment(userId: string, input: CreateInvestment): Promise<Investment> {
  const accountId = input.accountId ? await ownedAccountId(userId, input.accountId) : null;
  const [row] = await db
    .insert(financialInvestments)
    .values({
      id: crypto.randomUUID(),
      userId,
      accountId,
      symbol: input.symbol.toUpperCase(),
      name: input.name,
      investmentType: input.investmentType,
      shares: input.shares ?? "0",
      costBasisCents: input.costBasisCents ?? 0,
      currentPriceCents: input.currentPriceCents ?? 0,
      vestingDate: input.vestingDate ?? null,
      expirationDate: input.expirationDate ?? null,
      strikePriceCents: input.strikePriceCents ?? null,
      grantDate: input.grantDate ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updateInvestment(userId: string, id: string, patch: UpdateInvestment): Promise<Investment> {
  if (patch.accountId) await ownedAccountId(userId, patch.accountId);
  const columns = pick(patch, ["accountId", "symbol", "name", "investmentType", "shares", "costBasisCents", "currentPriceCents", "vestingDate", "expirationDate", "strikePriceCents", "grantDate", "notes"]);
  if (typeof columns.symbol === "string") columns.symbol = columns.symbol.toUpperCase();
  const [row] =
    Object.keys(columns).length === 0
      ? await db.select().from(financialInvestments).where(and(eq(financialInvestments.id, id), eq(financialInvestments.userId, userId))).limit(1)
      : await db.update(financialInvestments).set({ ...columns, updatedAt: new Date() }).where(and(eq(financialInvestments.id, id), eq(financialInvestments.userId, userId))).returning();
  if (!row) throw new HttpError(notFound("Investment not found"));
  return row;
}

export async function deleteInvestment(userId: string, id: string): Promise<void> {
  const rows = await db.delete(financialInvestments).where(and(eq(financialInvestments.id, id), eq(financialInvestments.userId, userId))).returning({ id: financialInvestments.id });
  if (rows.length === 0) throw new HttpError(notFound("Investment not found"));
}

export function listProperties(userId: string): Promise<Property[]> {
  return db.select().from(financialProperties).where(eq(financialProperties.userId, userId)).orderBy(financialProperties.name);
}

export async function createProperty(userId: string, input: CreateProperty): Promise<Property> {
  const [row] = await db
    .insert(financialProperties)
    .values({
      id: crypto.randomUUID(),
      userId,
      name: input.name,
      address: input.address ?? null,
      purchasePriceCents: input.purchasePriceCents ?? 0,
      currentValueCents: input.currentValueCents ?? 0,
      purchaseDate: input.purchaseDate ?? null,
      mortgageBalanceCents: input.mortgageBalanceCents ?? 0,
      mortgageRatePercent: input.mortgageRatePercent ?? null,
      mortgageMonthlyPaymentCents: input.mortgageMonthlyPaymentCents ?? null,
      propertyType: input.propertyType ?? "primary",
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updateProperty(userId: string, id: string, patch: UpdateProperty): Promise<Property> {
  const columns = pick(patch, ["name", "address", "purchasePriceCents", "currentValueCents", "purchaseDate", "mortgageBalanceCents", "mortgageRatePercent", "mortgageMonthlyPaymentCents", "propertyType", "notes"]);
  const [row] =
    Object.keys(columns).length === 0
      ? await db.select().from(financialProperties).where(and(eq(financialProperties.id, id), eq(financialProperties.userId, userId))).limit(1)
      : await db.update(financialProperties).set({ ...columns, updatedAt: new Date() }).where(and(eq(financialProperties.id, id), eq(financialProperties.userId, userId))).returning();
  if (!row) throw new HttpError(notFound("Property not found"));
  return row;
}

export async function deleteProperty(userId: string, id: string): Promise<void> {
  const rows = await db.delete(financialProperties).where(and(eq(financialProperties.id, id), eq(financialProperties.userId, userId))).returning({ id: financialProperties.id });
  if (rows.length === 0) throw new HttpError(notFound("Property not found"));
}

export function listRetirementPlans(userId: string): Promise<RetirementPlan[]> {
  return db.select().from(financialRetirementPlans).where(eq(financialRetirementPlans.userId, userId)).orderBy(financialRetirementPlans.name);
}

export async function createRetirementPlan(userId: string, input: CreateRetirementPlan): Promise<RetirementPlan> {
  const [row] = await db
    .insert(financialRetirementPlans)
    .values({
      id: crypto.randomUUID(),
      userId,
      name: input.name,
      planType: input.planType,
      institution: input.institution ?? null,
      balanceCents: input.balanceCents ?? 0,
      employerMatch: input.employerMatch ?? null,
      contributionYtdCents: input.contributionYtdCents ?? 0,
      contributionLimitCents: input.contributionLimitCents ?? null,
      targetRetirementAge: input.targetRetirementAge ?? null,
      monthlyContributionCents: input.monthlyContributionCents ?? null,
      expectedReturnPercent: input.expectedReturnPercent ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updateRetirementPlan(userId: string, id: string, patch: UpdateRetirementPlan): Promise<RetirementPlan> {
  const columns = pick(patch, ["name", "planType", "institution", "balanceCents", "employerMatch", "contributionYtdCents", "contributionLimitCents", "targetRetirementAge", "monthlyContributionCents", "expectedReturnPercent", "notes"]);
  const [row] =
    Object.keys(columns).length === 0
      ? await db.select().from(financialRetirementPlans).where(and(eq(financialRetirementPlans.id, id), eq(financialRetirementPlans.userId, userId))).limit(1)
      : await db.update(financialRetirementPlans).set({ ...columns, updatedAt: new Date() }).where(and(eq(financialRetirementPlans.id, id), eq(financialRetirementPlans.userId, userId))).returning();
  if (!row) throw new HttpError(notFound("Retirement plan not found"));
  return row;
}

export async function deleteRetirementPlan(userId: string, id: string): Promise<void> {
  const rows = await db.delete(financialRetirementPlans).where(and(eq(financialRetirementPlans.id, id), eq(financialRetirementPlans.userId, userId))).returning({ id: financialRetirementPlans.id });
  if (rows.length === 0) throw new HttpError(notFound("Retirement plan not found"));
}

// --- net worth and snapshots -----------------------------------------------------------

export interface NetWorth {
  netWorthCents: number;
  totalAssetsCents: number;
  totalLiabilitiesCents: number;
}

export async function netWorth(userId: string): Promise<NetWorth> {
  const [accounts, investments, properties, plans] = await Promise.all([listAccounts(userId), listInvestments(userId), listProperties(userId), listRetirementPlans(userId)]);
  let assets = 0;
  let liabilities = 0;
  for (const a of accounts) {
    if (a.balanceCents >= 0) assets += a.balanceCents;
    else liabilities += Math.abs(a.balanceCents);
  }
  for (const i of investments) assets += Math.round((parseFloat(i.shares) || 0) * i.currentPriceCents);
  for (const p of properties) {
    assets += p.currentValueCents;
    liabilities += p.mortgageBalanceCents;
  }
  for (const p of plans) assets += p.balanceCents;
  return { netWorthCents: assets - liabilities, totalAssetsCents: assets, totalLiabilitiesCents: liabilities };
}

export function listSnapshots(userId: string, limit = 24): Promise<Snapshot[]> {
  return db.select().from(financialSnapshots).where(eq(financialSnapshots.userId, userId)).orderBy(desc(financialSnapshots.date)).limit(Math.min(limit, 500));
}

export async function takeSnapshot(userId: string): Promise<Snapshot> {
  const [worth, accounts] = await Promise.all([netWorth(userId), listAccounts(userId)]);
  const breakdown = Object.fromEntries(accounts.map((a) => [a.name, a.balanceCents]));
  const [row] = await db.insert(financialSnapshots).values({ id: crypto.randomUUID(), userId, date: new Date(), ...worth, breakdown }).returning();
  return row;
}

export interface FinanceOverview {
  accounts: FinanceAccount[];
  investments: Investment[];
  properties: Property[];
  retirementPlans: RetirementPlan[];
  snapshots: Snapshot[];
  recentTransactions: Transaction[];
  netWorth: NetWorth;
  month: MonthSummary & { year: number; month: number };
  categories: FinanceCategory[];
}

/** The finances page's read: everything it shows for the current month. */
export async function readOverview(userId: string, now = new Date()): Promise<FinanceOverview> {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const [accounts, investments, properties, retirementPlans, snapshots, recentTransactions, worth, summary, categories] = await Promise.all([
    listAccounts(userId),
    listInvestments(userId),
    listProperties(userId),
    listRetirementPlans(userId),
    listSnapshots(userId, 12),
    listTransactions(userId, { limit: 10 }),
    netWorth(userId),
    monthSummary(userId, year, month),
    listCategories(userId),
  ]);
  return { accounts, investments, properties, retirementPlans, snapshots, recentTransactions, netWorth: worth, month: { ...summary, year, month }, categories };
}

// --- handlers -----------------------------------------------------------------------------

const withSession = (fn: (userId: string, request: Request, params: Record<string, string>) => Promise<Response>): ApiHandler =>
  ({ request, params }) =>
    handler(async () => fn((await requireSession(request)).userId, request, params));

function intParam(request: Request, name: string): number | undefined {
  const raw = new URL(request.url).searchParams.get(name);
  if (raw === null || raw === "") return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 0) throw new HttpError(fail(422, "Validation failed", { [name]: ["Must be a non-negative integer"] }));
  return n;
}

function dateParam(request: Request, name: string): Date | undefined {
  const raw = new URL(request.url).searchParams.get(name);
  if (!raw) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new HttpError(fail(422, "Validation failed", { [name]: ["Must be a date"] }));
  return d;
}

export const GET = withSession(async (userId) => json(await readOverview(userId)));

export const accounts = {
  GET: withSession(async (userId) => json({ accounts: await listAccounts(userId) })),
  POST: withSession(async (userId, request) => json({ account: await createAccount(userId, await readJson(request, createFinanceAccountSchema)) }, 201)),
};
export const account = {
  PATCH: withSession(async (userId, request, params) => json({ account: await updateAccount(userId, params.id, await readJson(request, updateFinanceAccountSchema)) })),
  DELETE: withSession(async (userId, _request, params) => {
    await archiveAccount(userId, params.id);
    return noContent();
  }),
};

export const categories = {
  GET: withSession(async (userId) => json({ categories: await listCategories(userId) })),
  POST: withSession(async (userId, request) => json({ category: await createCategory(userId, await readJson(request, createFinanceCategorySchema)) }, 201)),
};

export const transactions = {
  GET: withSession(async (userId, request) => {
    const q = new URL(request.url).searchParams;
    return json({
      transactions: await listTransactions(userId, {
        accountId: q.get("accountId") ?? undefined,
        categoryId: q.get("categoryId") ?? undefined,
        type: q.get("type") ?? undefined,
        from: dateParam(request, "from"),
        to: dateParam(request, "to"),
        limit: intParam(request, "limit"),
        offset: intParam(request, "offset"),
      }),
    });
  }),
  POST: withSession(async (userId, request) => json({ transaction: await createTransaction(userId, await readJson(request, createTransactionSchema)) }, 201)),
};
export const transaction = {
  PATCH: withSession(async (userId, request, params) => json({ transaction: await updateTransaction(userId, params.id, await readJson(request, updateTransactionSchema)) })),
  DELETE: withSession(async (userId, _request, params) => {
    await deleteTransaction(userId, params.id);
    return noContent();
  }),
};
export const transactionImport = {
  POST: withSession(async (userId, request) => json(await importTransactions(userId, await readJson(request, importTransactionsSchema)))),
};

export const month = {
  GET: withSession(async (userId, _request, params) => {
    const year = Number.parseInt(params.year, 10);
    const m = Number.parseInt(params.month, 10);
    if (!Number.isInteger(year) || !Number.isInteger(m) || m < 1 || m > 12) throw new HttpError(fail(422, "Validation failed", { month: ["Use /YYYY/MM"] }));
    return json({ ...(await monthSummary(userId, year, m)), year, month: m });
  }),
};

export const budgets = {
  GET: withSession(async (userId) => json({ budgets: await listBudgets(userId) })),
  PUT: withSession(async (userId, request) => json({ budget: await setBudget(userId, await readJson(request, setBudgetSchema)) })),
};
export const budget = {
  DELETE: withSession(async (userId, _request, params) => {
    await deleteBudget(userId, params.id);
    return noContent();
  }),
};

export const investments = {
  GET: withSession(async (userId) => json({ investments: await listInvestments(userId) })),
  POST: withSession(async (userId, request) => json({ investment: await createInvestment(userId, await readJson(request, createInvestmentSchema)) }, 201)),
};
export const investment = {
  PATCH: withSession(async (userId, request, params) => json({ investment: await updateInvestment(userId, params.id, await readJson(request, updateInvestmentSchema)) })),
  DELETE: withSession(async (userId, _request, params) => {
    await deleteInvestment(userId, params.id);
    return noContent();
  }),
};

export const properties = {
  GET: withSession(async (userId) => json({ properties: await listProperties(userId) })),
  POST: withSession(async (userId, request) => json({ property: await createProperty(userId, await readJson(request, createPropertySchema)) }, 201)),
};
export const property = {
  PATCH: withSession(async (userId, request, params) => json({ property: await updateProperty(userId, params.id, await readJson(request, updatePropertySchema)) })),
  DELETE: withSession(async (userId, _request, params) => {
    await deleteProperty(userId, params.id);
    return noContent();
  }),
};

export const retirement = {
  GET: withSession(async (userId) => json({ plans: await listRetirementPlans(userId) })),
  POST: withSession(async (userId, request) => json({ plan: await createRetirementPlan(userId, await readJson(request, createRetirementPlanSchema)) }, 201)),
};
export const retirementPlan = {
  PATCH: withSession(async (userId, request, params) => json({ plan: await updateRetirementPlan(userId, params.id, await readJson(request, updateRetirementPlanSchema)) })),
  DELETE: withSession(async (userId, _request, params) => {
    await deleteRetirementPlan(userId, params.id);
    return noContent();
  }),
};

export const worth = { GET: withSession(async (userId) => json(await netWorth(userId))) };

export const snapshots = {
  GET: withSession(async (userId, request) => json({ snapshots: await listSnapshots(userId, intParam(request, "limit") ?? 24) })),
  POST: withSession(async (userId) => json({ snapshot: await takeSnapshot(userId) }, 201)),
};
