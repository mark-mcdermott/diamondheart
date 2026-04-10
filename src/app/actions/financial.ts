"use server";

import { db } from "@/db";
import {
  financialAccounts,
  financialCategories,
  financialTransactions,
  financialBudgets,
  financialInvestments,
  financialProperties,
  financialRetirementPlans,
  financialSnapshots,
} from "@/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  success: boolean;
  error?: string;
};

// ============================================
// Financial Accounts
// ============================================

export async function addAccount(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const name = formData.get("name") as string;
  const accountType = formData.get("accountType") as string;
  const institution = formData.get("institution") as string;
  const balanceStr = formData.get("balance") as string;
  const currency = (formData.get("currency") as string) || "USD";
  const notes = formData.get("notes") as string;

  if (!name || !accountType) {
    return { success: false, error: "Name and account type are required" };
  }

  const balanceCents = Math.round(parseFloat(balanceStr || "0") * 100);

  await db.insert(financialAccounts).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    name,
    accountType,
    institution: institution || null,
    balanceCents,
    currency,
    notes: notes || null,
  });

  revalidatePath("/finances");
  return { success: true };
}

export async function updateAccount(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const accountId = formData.get("accountId") as string;
  const name = formData.get("name") as string;
  const accountType = formData.get("accountType") as string;
  const institution = formData.get("institution") as string;
  const balanceStr = formData.get("balance") as string;
  const notes = formData.get("notes") as string;

  if (!accountId || !name) return { success: false, error: "Account ID and name are required" };

  const balanceCents = Math.round(parseFloat(balanceStr || "0") * 100);

  await db
    .update(financialAccounts)
    .set({
      name,
      accountType,
      institution: institution || null,
      balanceCents,
      notes: notes || null,
      updatedAt: new Date(),
    })
    .where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.userId, session.userId)));

  revalidatePath("/finances");
  return { success: true };
}

export async function deleteAccount(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const accountId = formData.get("accountId") as string;
  if (!accountId) return { success: false, error: "Account ID is required" };

  await db
    .update(financialAccounts)
    .set({ archived: true, updatedAt: new Date() })
    .where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.userId, session.userId)));

  revalidatePath("/finances");
  return { success: true };
}

export async function getAccounts(userId: string) {
  return db
    .select()
    .from(financialAccounts)
    .where(and(eq(financialAccounts.userId, userId), eq(financialAccounts.archived, false)))
    .orderBy(financialAccounts.name);
}

// ============================================
// Financial Categories
// ============================================

const DEFAULT_CATEGORIES = [
  { name: "Salary", slug: "salary", type: "income", icon: "briefcase" },
  { name: "Freelance", slug: "freelance", type: "income", icon: "laptop" },
  { name: "Dividends", slug: "dividends", type: "income", icon: "trending-up" },
  { name: "Other Income", slug: "other-income", type: "income", icon: "plus-circle" },
  { name: "Housing", slug: "housing", type: "expense", icon: "home" },
  { name: "Groceries", slug: "groceries", type: "expense", icon: "shopping-cart" },
  { name: "Transportation", slug: "transportation", type: "expense", icon: "car" },
  { name: "Utilities", slug: "utilities", type: "expense", icon: "zap" },
  { name: "Insurance", slug: "insurance", type: "expense", icon: "shield" },
  { name: "Healthcare", slug: "healthcare", type: "expense", icon: "heart" },
  { name: "Dining Out", slug: "dining-out", type: "expense", icon: "utensils" },
  { name: "Entertainment", slug: "entertainment", type: "expense", icon: "film" },
  { name: "Shopping", slug: "shopping", type: "expense", icon: "shopping-bag" },
  { name: "Subscriptions", slug: "subscriptions", type: "expense", icon: "repeat" },
  { name: "Education", slug: "education", type: "expense", icon: "book-open" },
  { name: "Personal Care", slug: "personal-care", type: "expense", icon: "scissors" },
  { name: "Savings", slug: "savings", type: "transfer", icon: "piggy-bank" },
  { name: "Investment", slug: "investment", type: "transfer", icon: "trending-up" },
  { name: "Debt Payment", slug: "debt-payment", type: "expense", icon: "credit-card" },
  { name: "Taxes", slug: "taxes", type: "expense", icon: "file-text" },
  { name: "Gifts & Donations", slug: "gifts-donations", type: "expense", icon: "gift" },
  { name: "Travel", slug: "travel", type: "expense", icon: "plane" },
  { name: "Pets", slug: "pets", type: "expense", icon: "paw-print" },
  { name: "Miscellaneous", slug: "miscellaneous", type: "expense", icon: "more-horizontal" },
];

export async function ensureDefaultCategories(userId: string) {
  const existing = await db
    .select()
    .from(financialCategories)
    .where(eq(financialCategories.userId, userId))
    .limit(1);

  if (existing.length > 0) return;

  for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    const cat = DEFAULT_CATEGORIES[i];
    await db.insert(financialCategories).values({
      id: crypto.randomUUID(),
      userId,
      name: cat.name,
      slug: cat.slug,
      type: cat.type,
      icon: cat.icon,
      isDefault: true,
      sortOrder: i,
    });
  }
}

export async function getCategories(userId: string) {
  await ensureDefaultCategories(userId);
  return db
    .select()
    .from(financialCategories)
    .where(eq(financialCategories.userId, userId))
    .orderBy(financialCategories.sortOrder);
}

export async function addCategory(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const name = formData.get("name") as string;
  const type = (formData.get("type") as string) || "expense";
  const icon = formData.get("icon") as string;

  if (!name) return { success: false, error: "Name is required" };

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  await db.insert(financialCategories).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    name,
    slug,
    type,
    icon: icon || null,
    isDefault: false,
  });

  revalidatePath("/finances");
  return { success: true };
}

// ============================================
// Financial Transactions
// ============================================

export async function addTransaction(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const accountId = formData.get("accountId") as string;
  const categoryId = formData.get("categoryId") as string;
  const type = formData.get("type") as string;
  const amountStr = formData.get("amount") as string;
  const description = formData.get("description") as string;
  const merchant = formData.get("merchant") as string;
  const dateStr = formData.get("date") as string;
  const notes = formData.get("notes") as string;
  const isRecurring = formData.get("isRecurring") === "true";

  if (!accountId || !type || !amountStr || !description) {
    return { success: false, error: "Account, type, amount, and description are required" };
  }

  const amountCents = Math.round(parseFloat(amountStr) * 100);
  const signedAmount = type === "expense" ? -Math.abs(amountCents) : Math.abs(amountCents);

  await db.insert(financialTransactions).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    accountId,
    categoryId: categoryId || null,
    type,
    amountCents: signedAmount,
    description,
    merchant: merchant || null,
    date: dateStr ? new Date(dateStr) : new Date(),
    notes: notes || null,
    isRecurring,
    importSource: "manual",
  });

  // Update account balance
  await db
    .update(financialAccounts)
    .set({
      balanceCents: sql`${financialAccounts.balanceCents} + ${signedAmount}`,
      updatedAt: new Date(),
    })
    .where(eq(financialAccounts.id, accountId));

  revalidatePath("/finances");
  return { success: true };
}

export async function updateTransaction(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const txId = formData.get("transactionId") as string;
  const categoryId = formData.get("categoryId") as string;
  const description = formData.get("description") as string;
  const merchant = formData.get("merchant") as string;
  const notes = formData.get("notes") as string;

  if (!txId) return { success: false, error: "Transaction ID is required" };

  await db
    .update(financialTransactions)
    .set({
      categoryId: categoryId || null,
      description: description || undefined,
      merchant: merchant || null,
      notes: notes || null,
      updatedAt: new Date(),
    })
    .where(and(eq(financialTransactions.id, txId), eq(financialTransactions.userId, session.userId)));

  revalidatePath("/finances");
  return { success: true };
}

export async function deleteTransaction(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const txId = formData.get("transactionId") as string;
  if (!txId) return { success: false, error: "Transaction ID is required" };

  // Get the transaction to reverse the balance
  const [tx] = await db
    .select()
    .from(financialTransactions)
    .where(and(eq(financialTransactions.id, txId), eq(financialTransactions.userId, session.userId)))
    .limit(1);

  if (!tx) return { success: false, error: "Transaction not found" };

  // Reverse the balance change
  await db
    .update(financialAccounts)
    .set({
      balanceCents: sql`${financialAccounts.balanceCents} - ${tx.amountCents}`,
      updatedAt: new Date(),
    })
    .where(eq(financialAccounts.id, tx.accountId));

  await db
    .delete(financialTransactions)
    .where(eq(financialTransactions.id, txId));

  revalidatePath("/finances");
  return { success: true };
}

export async function getTransactions(
  userId: string,
  filters?: {
    accountId?: string;
    categoryId?: string;
    type?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
) {
  const conditions = [eq(financialTransactions.userId, userId)];

  if (filters?.accountId) conditions.push(eq(financialTransactions.accountId, filters.accountId));
  if (filters?.categoryId) conditions.push(eq(financialTransactions.categoryId, filters.categoryId));
  if (filters?.type) conditions.push(eq(financialTransactions.type, filters.type));
  if (filters?.startDate) conditions.push(gte(financialTransactions.date, filters.startDate));
  if (filters?.endDate) conditions.push(lte(financialTransactions.date, filters.endDate));

  const query = db
    .select()
    .from(financialTransactions)
    .where(and(...conditions))
    .orderBy(desc(financialTransactions.date))
    .limit(filters?.limit ?? 50)
    .offset(filters?.offset ?? 0);

  return query;
}

export async function getMonthlySpending(userId: string, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  return db
    .select({
      categoryId: financialTransactions.categoryId,
      totalCents: sql<number>`COALESCE(SUM(ABS(${financialTransactions.amountCents})), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(financialTransactions)
    .where(
      and(
        eq(financialTransactions.userId, userId),
        eq(financialTransactions.type, "expense"),
        gte(financialTransactions.date, startDate),
        lte(financialTransactions.date, endDate)
      )
    )
    .groupBy(financialTransactions.categoryId);
}

export async function getMonthlyIncome(userId: string, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const [result] = await db
    .select({
      totalCents: sql<number>`COALESCE(SUM(${financialTransactions.amountCents}), 0)`,
    })
    .from(financialTransactions)
    .where(
      and(
        eq(financialTransactions.userId, userId),
        eq(financialTransactions.type, "income"),
        gte(financialTransactions.date, startDate),
        lte(financialTransactions.date, endDate)
      )
    );

  return result?.totalCents ?? 0;
}

// ============================================
// Budgets
// ============================================

export async function setBudget(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const categoryId = formData.get("categoryId") as string;
  const amountStr = formData.get("amount") as string;
  const period = (formData.get("period") as string) || "monthly";

  if (!categoryId || !amountStr) {
    return { success: false, error: "Category and amount are required" };
  }

  const amountCents = Math.round(parseFloat(amountStr) * 100);

  // Upsert: update if exists, insert if not
  const [existing] = await db
    .select()
    .from(financialBudgets)
    .where(and(eq(financialBudgets.userId, session.userId), eq(financialBudgets.categoryId, categoryId)))
    .limit(1);

  if (existing) {
    await db
      .update(financialBudgets)
      .set({ amountCents, period, updatedAt: new Date() })
      .where(eq(financialBudgets.id, existing.id));
  } else {
    await db.insert(financialBudgets).values({
      id: crypto.randomUUID(),
      userId: session.userId,
      categoryId,
      amountCents,
      period,
    });
  }

  revalidatePath("/finances");
  return { success: true };
}

export async function deleteBudget(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const budgetId = formData.get("budgetId") as string;
  if (!budgetId) return { success: false, error: "Budget ID is required" };

  await db
    .delete(financialBudgets)
    .where(and(eq(financialBudgets.id, budgetId), eq(financialBudgets.userId, session.userId)));

  revalidatePath("/finances");
  return { success: true };
}

export async function getBudgets(userId: string) {
  return db
    .select()
    .from(financialBudgets)
    .where(eq(financialBudgets.userId, userId));
}

// ============================================
// Investments
// ============================================

export async function addInvestment(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const symbol = formData.get("symbol") as string;
  const name = formData.get("name") as string;
  const investmentType = formData.get("investmentType") as string;
  const shares = formData.get("shares") as string;
  const costBasisStr = formData.get("costBasis") as string;
  const currentPriceStr = formData.get("currentPrice") as string;
  const accountId = formData.get("accountId") as string;
  const vestingDateStr = formData.get("vestingDate") as string;
  const expirationDateStr = formData.get("expirationDate") as string;
  const strikePriceStr = formData.get("strikePrice") as string;
  const grantDateStr = formData.get("grantDate") as string;
  const notes = formData.get("notes") as string;

  if (!symbol || !name || !investmentType) {
    return { success: false, error: "Symbol, name, and type are required" };
  }

  await db.insert(financialInvestments).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    accountId: accountId || null,
    symbol: symbol.toUpperCase(),
    name,
    investmentType,
    shares: shares || "0",
    costBasisCents: Math.round(parseFloat(costBasisStr || "0") * 100),
    currentPriceCents: Math.round(parseFloat(currentPriceStr || "0") * 100),
    vestingDate: vestingDateStr ? new Date(vestingDateStr) : null,
    expirationDate: expirationDateStr ? new Date(expirationDateStr) : null,
    strikePriceCents: strikePriceStr ? Math.round(parseFloat(strikePriceStr) * 100) : null,
    grantDate: grantDateStr ? new Date(grantDateStr) : null,
    notes: notes || null,
  });

  revalidatePath("/finances");
  return { success: true };
}

export async function updateInvestment(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const investmentId = formData.get("investmentId") as string;
  const shares = formData.get("shares") as string;
  const currentPriceStr = formData.get("currentPrice") as string;
  const notes = formData.get("notes") as string;

  if (!investmentId) return { success: false, error: "Investment ID is required" };

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (shares !== null) updates.shares = shares;
  if (currentPriceStr) updates.currentPriceCents = Math.round(parseFloat(currentPriceStr) * 100);
  if (notes !== undefined) updates.notes = notes || null;

  await db
    .update(financialInvestments)
    .set(updates)
    .where(and(eq(financialInvestments.id, investmentId), eq(financialInvestments.userId, session.userId)));

  revalidatePath("/finances");
  return { success: true };
}

export async function deleteInvestment(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const investmentId = formData.get("investmentId") as string;
  if (!investmentId) return { success: false, error: "Investment ID is required" };

  await db
    .delete(financialInvestments)
    .where(and(eq(financialInvestments.id, investmentId), eq(financialInvestments.userId, session.userId)));

  revalidatePath("/finances");
  return { success: true };
}

export async function getInvestments(userId: string) {
  return db
    .select()
    .from(financialInvestments)
    .where(eq(financialInvestments.userId, userId))
    .orderBy(financialInvestments.symbol);
}

// ============================================
// Properties
// ============================================

export async function addProperty(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const purchasePriceStr = formData.get("purchasePrice") as string;
  const currentValueStr = formData.get("currentValue") as string;
  const purchaseDateStr = formData.get("purchaseDate") as string;
  const mortgageBalanceStr = formData.get("mortgageBalance") as string;
  const mortgageRatePercent = formData.get("mortgageRate") as string;
  const mortgageMonthlyStr = formData.get("mortgageMonthlyPayment") as string;
  const propertyType = (formData.get("propertyType") as string) || "primary";
  const notes = formData.get("notes") as string;

  if (!name) return { success: false, error: "Name is required" };

  await db.insert(financialProperties).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    name,
    address: address || null,
    purchasePriceCents: Math.round(parseFloat(purchasePriceStr || "0") * 100),
    currentValueCents: Math.round(parseFloat(currentValueStr || "0") * 100),
    purchaseDate: purchaseDateStr ? new Date(purchaseDateStr) : null,
    mortgageBalanceCents: Math.round(parseFloat(mortgageBalanceStr || "0") * 100),
    mortgageRatePercent: mortgageRatePercent || null,
    mortgageMonthlyPaymentCents: mortgageMonthlyStr ? Math.round(parseFloat(mortgageMonthlyStr) * 100) : null,
    propertyType,
    notes: notes || null,
  });

  revalidatePath("/finances");
  return { success: true };
}

export async function updateProperty(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const propertyId = formData.get("propertyId") as string;
  const currentValueStr = formData.get("currentValue") as string;
  const mortgageBalanceStr = formData.get("mortgageBalance") as string;
  const notes = formData.get("notes") as string;

  if (!propertyId) return { success: false, error: "Property ID is required" };

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (currentValueStr) updates.currentValueCents = Math.round(parseFloat(currentValueStr) * 100);
  if (mortgageBalanceStr) updates.mortgageBalanceCents = Math.round(parseFloat(mortgageBalanceStr) * 100);
  if (notes !== undefined) updates.notes = notes || null;

  await db
    .update(financialProperties)
    .set(updates)
    .where(and(eq(financialProperties.id, propertyId), eq(financialProperties.userId, session.userId)));

  revalidatePath("/finances");
  return { success: true };
}

export async function deleteProperty(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const propertyId = formData.get("propertyId") as string;
  if (!propertyId) return { success: false, error: "Property ID is required" };

  await db
    .delete(financialProperties)
    .where(and(eq(financialProperties.id, propertyId), eq(financialProperties.userId, session.userId)));

  revalidatePath("/finances");
  return { success: true };
}

export async function getProperties(userId: string) {
  return db
    .select()
    .from(financialProperties)
    .where(eq(financialProperties.userId, userId))
    .orderBy(financialProperties.name);
}

// ============================================
// Retirement Plans
// ============================================

export async function addRetirementPlan(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const name = formData.get("name") as string;
  const planType = formData.get("planType") as string;
  const institution = formData.get("institution") as string;
  const balanceStr = formData.get("balance") as string;
  const employerMatch = formData.get("employerMatch") as string;
  const contributionYtdStr = formData.get("contributionYtd") as string;
  const contributionLimitStr = formData.get("contributionLimit") as string;
  const targetRetirementAgeStr = formData.get("targetRetirementAge") as string;
  const monthlyContributionStr = formData.get("monthlyContribution") as string;
  const expectedReturnPercent = formData.get("expectedReturn") as string;
  const notes = formData.get("notes") as string;

  if (!name || !planType) {
    return { success: false, error: "Name and plan type are required" };
  }

  await db.insert(financialRetirementPlans).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    name,
    planType,
    institution: institution || null,
    balanceCents: Math.round(parseFloat(balanceStr || "0") * 100),
    employerMatch: employerMatch || null,
    contributionYtdCents: Math.round(parseFloat(contributionYtdStr || "0") * 100),
    contributionLimitCents: contributionLimitStr ? Math.round(parseFloat(contributionLimitStr) * 100) : null,
    targetRetirementAge: targetRetirementAgeStr ? parseInt(targetRetirementAgeStr, 10) : null,
    monthlyContributionCents: monthlyContributionStr ? Math.round(parseFloat(monthlyContributionStr) * 100) : null,
    expectedReturnPercent: expectedReturnPercent || null,
    notes: notes || null,
  });

  revalidatePath("/finances");
  return { success: true };
}

export async function updateRetirementPlan(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const planId = formData.get("planId") as string;
  const balanceStr = formData.get("balance") as string;
  const contributionYtdStr = formData.get("contributionYtd") as string;
  const monthlyContributionStr = formData.get("monthlyContribution") as string;
  const expectedReturnPercent = formData.get("expectedReturn") as string;
  const notes = formData.get("notes") as string;

  if (!planId) return { success: false, error: "Plan ID is required" };

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (balanceStr) updates.balanceCents = Math.round(parseFloat(balanceStr) * 100);
  if (contributionYtdStr) updates.contributionYtdCents = Math.round(parseFloat(contributionYtdStr) * 100);
  if (monthlyContributionStr) updates.monthlyContributionCents = Math.round(parseFloat(monthlyContributionStr) * 100);
  if (expectedReturnPercent) updates.expectedReturnPercent = expectedReturnPercent;
  if (notes !== undefined) updates.notes = notes || null;

  await db
    .update(financialRetirementPlans)
    .set(updates)
    .where(and(eq(financialRetirementPlans.id, planId), eq(financialRetirementPlans.userId, session.userId)));

  revalidatePath("/finances");
  return { success: true };
}

export async function deleteRetirementPlan(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const planId = formData.get("planId") as string;
  if (!planId) return { success: false, error: "Plan ID is required" };

  await db
    .delete(financialRetirementPlans)
    .where(and(eq(financialRetirementPlans.id, planId), eq(financialRetirementPlans.userId, session.userId)));

  revalidatePath("/finances");
  return { success: true };
}

export async function getRetirementPlans(userId: string) {
  return db
    .select()
    .from(financialRetirementPlans)
    .where(eq(financialRetirementPlans.userId, userId))
    .orderBy(financialRetirementPlans.name);
}

// ============================================
// Snapshots & Net Worth
// ============================================

export async function calculateNetWorth(userId: string) {
  const accounts = await getAccounts(userId);
  const investments = await getInvestments(userId);
  const properties = await getProperties(userId);
  const retirementPlans = await getRetirementPlans(userId);

  let totalAssets = 0;
  let totalLiabilities = 0;

  // Cash accounts (checking, savings)
  for (const acct of accounts) {
    if (acct.balanceCents >= 0) {
      totalAssets += acct.balanceCents;
    } else {
      totalLiabilities += Math.abs(acct.balanceCents);
    }
  }

  // Investments (total market value)
  for (const inv of investments) {
    const shares = parseFloat(inv.shares) || 0;
    const value = shares * inv.currentPriceCents;
    totalAssets += Math.round(value);
  }

  // Properties (current value minus mortgage)
  for (const prop of properties) {
    totalAssets += prop.currentValueCents;
    totalLiabilities += prop.mortgageBalanceCents;
  }

  // Retirement accounts
  for (const plan of retirementPlans) {
    totalAssets += plan.balanceCents;
  }

  return {
    netWorthCents: totalAssets - totalLiabilities,
    totalAssetsCents: totalAssets,
    totalLiabilitiesCents: totalLiabilities,
  };
}

export async function takeSnapshot(): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const { netWorthCents, totalAssetsCents, totalLiabilitiesCents } = await calculateNetWorth(session.userId);

  // Build breakdown
  const accounts = await getAccounts(session.userId);
  const breakdown: Record<string, number> = {};
  for (const acct of accounts) {
    breakdown[acct.name] = acct.balanceCents;
  }

  await db.insert(financialSnapshots).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    date: new Date(),
    netWorthCents,
    totalAssetsCents,
    totalLiabilitiesCents,
    breakdown,
  });

  revalidatePath("/finances");
  return { success: true };
}

export async function getSnapshots(userId: string, limit = 24) {
  return db
    .select()
    .from(financialSnapshots)
    .where(eq(financialSnapshots.userId, userId))
    .orderBy(desc(financialSnapshots.date))
    .limit(limit);
}

// ============================================
// CSV Import
// ============================================

export async function importTransactions(
  userId: string,
  accountId: string,
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: "income" | "expense";
    merchant?: string;
    categoryId?: string;
  }>
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (const tx of transactions) {
    const importId = `csv-${accountId}-${tx.date}-${tx.description}-${tx.amount}`;

    // Check for duplicate
    const [existing] = await db
      .select()
      .from(financialTransactions)
      .where(and(eq(financialTransactions.userId, userId), eq(financialTransactions.importId, importId)))
      .limit(1);

    if (existing) {
      skipped++;
      continue;
    }

    const amountCents = Math.round(tx.amount * 100);
    const signedAmount = tx.type === "expense" ? -Math.abs(amountCents) : Math.abs(amountCents);

    await db.insert(financialTransactions).values({
      id: crypto.randomUUID(),
      userId,
      accountId,
      categoryId: tx.categoryId || null,
      type: tx.type,
      amountCents: signedAmount,
      description: tx.description,
      merchant: tx.merchant || null,
      date: new Date(tx.date),
      importSource: "csv",
      importId,
    });

    imported++;
  }

  // Recalculate account balance from all transactions
  const [balanceResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${financialTransactions.amountCents}), 0)` })
    .from(financialTransactions)
    .where(eq(financialTransactions.accountId, accountId));

  await db
    .update(financialAccounts)
    .set({ balanceCents: balanceResult?.total ?? 0, updatedAt: new Date() })
    .where(eq(financialAccounts.id, accountId));

  revalidatePath("/finances");
  return { imported, skipped };
}

// ============================================
// Retirement Projections
// ============================================

export function calculateRetirementProjection(params: {
  currentBalance: number; // in dollars
  monthlyContribution: number; // in dollars
  employerMatchPercent: number; // as decimal (0.06 = 6%)
  annualReturnPercent: number; // as decimal (0.07 = 7%)
  currentAge: number;
  retirementAge: number;
  inflationRate?: number; // default 3%
}) {
  const {
    currentBalance,
    monthlyContribution,
    employerMatchPercent,
    annualReturnPercent,
    currentAge,
    retirementAge,
    inflationRate = 0.03,
  } = params;

  const yearsToRetirement = retirementAge - currentAge;
  if (yearsToRetirement <= 0) return { projectedBalance: currentBalance, yearlyProjections: [] };

  const monthlyReturn = annualReturnPercent / 12;
  const totalMonthlyContribution = monthlyContribution * (1 + employerMatchPercent);

  let balance = currentBalance;
  const yearlyProjections: Array<{ age: number; balance: number; balanceInflationAdjusted: number }> = [];

  for (let year = 1; year <= yearsToRetirement; year++) {
    for (let month = 0; month < 12; month++) {
      balance = balance * (1 + monthlyReturn) + totalMonthlyContribution;
    }
    const inflationAdjusted = balance / Math.pow(1 + inflationRate, year);
    yearlyProjections.push({
      age: currentAge + year,
      balance: Math.round(balance * 100) / 100,
      balanceInflationAdjusted: Math.round(inflationAdjusted * 100) / 100,
    });
  }

  return {
    projectedBalance: Math.round(balance * 100) / 100,
    yearlyProjections,
  };
}
