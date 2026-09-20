"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import * as finances from "@/server/api/finances";
import { asResult, type ActionResult } from "./api-result";

/**
 * Thin wrappers over `src/server/api/finances.ts`, kept until Phase 3. The
 * forms speak dollars and date strings; the API speaks integer cents and
 * ISO dates, so the conversion happens here, once.
 */

export type { ActionResult };

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function dollarsToCents(raw: string, fallback = 0): number {
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? Math.round(n * 100) : fallback;
}

function optionalCents(formData: FormData, key: string): number | null {
  const raw = text(formData, key);
  return raw ? dollarsToCents(raw) : null;
}

function optionalDate(formData: FormData, key: string): Date | null {
  const raw = text(formData, key);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function optionalInt(formData: FormData, key: string): number | null {
  const raw = text(formData, key);
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) ? n : null;
}

async function run(work: (userId: string) => Promise<unknown>): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };
  const result = await asResult(() => work(session.userId));
  revalidatePath("/finances");
  return result;
}

// --- reads the pages still do on the server ---

export async function getAccounts(userId: string) {
  return finances.listAccounts(userId);
}
export async function getCategories(userId: string) {
  return finances.listCategories(userId);
}
export async function ensureDefaultCategories(userId: string) {
  await finances.listCategories(userId);
}
export async function getTransactions(userId: string, filters?: { accountId?: string; categoryId?: string; type?: string; startDate?: Date; endDate?: Date; limit?: number; offset?: number }) {
  return finances.listTransactions(userId, { ...filters, from: filters?.startDate, to: filters?.endDate });
}
export async function getMonthlySpending(userId: string, year: number, month: number) {
  return (await finances.monthSummary(userId, year, month)).spending;
}
export async function getMonthlyIncome(userId: string, year: number, month: number) {
  return (await finances.monthSummary(userId, year, month)).incomeCents;
}
export async function getBudgets(userId: string) {
  return finances.listBudgets(userId);
}
export async function getInvestments(userId: string) {
  return finances.listInvestments(userId);
}
export async function getProperties(userId: string) {
  return finances.listProperties(userId);
}
export async function getRetirementPlans(userId: string) {
  return finances.listRetirementPlans(userId);
}
export async function calculateNetWorth(userId: string) {
  return finances.netWorth(userId);
}
export async function getSnapshots(userId: string, limit = 24) {
  return finances.listSnapshots(userId, limit);
}
export async function importTransactions(userId: string, accountId: string, transactions: Array<{ date: string; description: string; amount: number; type: "income" | "expense"; merchant?: string; categoryId?: string }>) {
  return finances.importTransactions(userId, { accountId, transactions });
}

// --- accounts ---

export async function addAccount(formData: FormData): Promise<ActionResult> {
  const name = text(formData, "name");
  const accountType = text(formData, "accountType");
  if (!name || !accountType) return { success: false, error: "Name and account type are required" };
  return run((userId) =>
    finances.createAccount(userId, {
      name,
      accountType,
      institution: text(formData, "institution") || null,
      balanceCents: dollarsToCents(text(formData, "balance")),
      currency: text(formData, "currency") || "USD",
      notes: text(formData, "notes") || null,
    })
  );
}

export async function updateAccount(formData: FormData): Promise<ActionResult> {
  const accountId = text(formData, "accountId");
  const name = text(formData, "name");
  if (!accountId || !name) return { success: false, error: "Account ID and name are required" };
  return run((userId) =>
    finances.updateAccount(userId, accountId, {
      name,
      ...(text(formData, "accountType") ? { accountType: text(formData, "accountType") } : {}),
      institution: text(formData, "institution") || null,
      balanceCents: dollarsToCents(text(formData, "balance")),
      notes: text(formData, "notes") || null,
    })
  );
}

export async function deleteAccount(formData: FormData): Promise<ActionResult> {
  const accountId = text(formData, "accountId");
  if (!accountId) return { success: false, error: "Account ID is required" };
  return run((userId) => finances.archiveAccount(userId, accountId));
}

// --- categories ---

export async function addCategory(formData: FormData): Promise<ActionResult> {
  const name = text(formData, "name");
  if (!name) return { success: false, error: "Name is required" };
  const type = text(formData, "type");
  return run((userId) =>
    finances.createCategory(userId, {
      name,
      type: type === "income" || type === "transfer" ? type : "expense",
      icon: text(formData, "icon") || null,
    })
  );
}

// --- transactions ---

export async function addTransaction(formData: FormData): Promise<ActionResult> {
  const accountId = text(formData, "accountId");
  const type = text(formData, "type");
  const amount = text(formData, "amount");
  const description = text(formData, "description");
  if (!accountId || !type || !amount || !description) return { success: false, error: "Account, type, amount, and description are required" };
  if (type !== "income" && type !== "expense" && type !== "transfer") return { success: false, error: "Unknown transaction type" };
  const amountCents = Math.abs(dollarsToCents(amount));
  if (amountCents === 0) return { success: false, error: "Amount is required" };
  return run((userId) =>
    finances.createTransaction(userId, {
      accountId,
      categoryId: text(formData, "categoryId") || null,
      type,
      amountCents,
      description,
      merchant: text(formData, "merchant") || null,
      date: optionalDate(formData, "date") ?? undefined,
      notes: text(formData, "notes") || null,
      isRecurring: text(formData, "isRecurring") === "true",
    })
  );
}

export async function updateTransaction(formData: FormData): Promise<ActionResult> {
  const txId = text(formData, "transactionId");
  if (!txId) return { success: false, error: "Transaction ID is required" };
  return run((userId) =>
    finances.updateTransaction(userId, txId, {
      categoryId: text(formData, "categoryId") || null,
      ...(text(formData, "description") ? { description: text(formData, "description") } : {}),
      merchant: text(formData, "merchant") || null,
      notes: text(formData, "notes") || null,
    })
  );
}

export async function deleteTransaction(formData: FormData): Promise<ActionResult> {
  const txId = text(formData, "transactionId");
  if (!txId) return { success: false, error: "Transaction ID is required" };
  return run((userId) => finances.deleteTransaction(userId, txId));
}

// --- budgets ---

export async function setBudget(formData: FormData): Promise<ActionResult> {
  const categoryId = text(formData, "categoryId");
  const amount = text(formData, "amount");
  if (!categoryId || !amount) return { success: false, error: "Category and amount are required" };
  const period = text(formData, "period");
  return run((userId) =>
    finances.setBudget(userId, {
      categoryId,
      amountCents: Math.abs(dollarsToCents(amount)),
      period: period === "weekly" || period === "yearly" ? period : "monthly",
    })
  );
}

export async function deleteBudget(formData: FormData): Promise<ActionResult> {
  const budgetId = text(formData, "budgetId");
  if (!budgetId) return { success: false, error: "Budget ID is required" };
  return run((userId) => finances.deleteBudget(userId, budgetId));
}

// --- investments ---

export async function addInvestment(formData: FormData): Promise<ActionResult> {
  const symbol = text(formData, "symbol");
  const name = text(formData, "name");
  const investmentType = text(formData, "investmentType");
  if (!symbol || !name || !investmentType) return { success: false, error: "Symbol, name, and type are required" };
  return run((userId) =>
    finances.createInvestment(userId, {
      symbol,
      name,
      investmentType,
      accountId: text(formData, "accountId") || null,
      shares: text(formData, "shares") || "0",
      costBasisCents: dollarsToCents(text(formData, "costBasis")),
      currentPriceCents: dollarsToCents(text(formData, "currentPrice")),
      vestingDate: optionalDate(formData, "vestingDate"),
      expirationDate: optionalDate(formData, "expirationDate"),
      strikePriceCents: optionalCents(formData, "strikePrice"),
      grantDate: optionalDate(formData, "grantDate"),
      notes: text(formData, "notes") || null,
    })
  );
}

export async function updateInvestment(formData: FormData): Promise<ActionResult> {
  const investmentId = text(formData, "investmentId");
  if (!investmentId) return { success: false, error: "Investment ID is required" };
  return run((userId) =>
    finances.updateInvestment(userId, investmentId, {
      ...(formData.get("shares") !== null ? { shares: text(formData, "shares") } : {}),
      ...(text(formData, "currentPrice") ? { currentPriceCents: dollarsToCents(text(formData, "currentPrice")) } : {}),
      ...(formData.get("notes") !== null ? { notes: text(formData, "notes") || null } : {}),
    })
  );
}

export async function deleteInvestment(formData: FormData): Promise<ActionResult> {
  const investmentId = text(formData, "investmentId");
  if (!investmentId) return { success: false, error: "Investment ID is required" };
  return run((userId) => finances.deleteInvestment(userId, investmentId));
}

// --- properties ---

export async function addProperty(formData: FormData): Promise<ActionResult> {
  const name = text(formData, "name");
  if (!name) return { success: false, error: "Name is required" };
  return run((userId) =>
    finances.createProperty(userId, {
      name,
      address: text(formData, "address") || null,
      purchasePriceCents: dollarsToCents(text(formData, "purchasePrice")),
      currentValueCents: dollarsToCents(text(formData, "currentValue")),
      purchaseDate: optionalDate(formData, "purchaseDate"),
      mortgageBalanceCents: dollarsToCents(text(formData, "mortgageBalance")),
      mortgageRatePercent: text(formData, "mortgageRate") || null,
      mortgageMonthlyPaymentCents: optionalCents(formData, "mortgageMonthlyPayment"),
      propertyType: text(formData, "propertyType") || "primary",
      notes: text(formData, "notes") || null,
    })
  );
}

export async function updateProperty(formData: FormData): Promise<ActionResult> {
  const propertyId = text(formData, "propertyId");
  if (!propertyId) return { success: false, error: "Property ID is required" };
  return run((userId) =>
    finances.updateProperty(userId, propertyId, {
      ...(text(formData, "currentValue") ? { currentValueCents: dollarsToCents(text(formData, "currentValue")) } : {}),
      ...(text(formData, "mortgageBalance") ? { mortgageBalanceCents: dollarsToCents(text(formData, "mortgageBalance")) } : {}),
      ...(formData.get("notes") !== null ? { notes: text(formData, "notes") || null } : {}),
    })
  );
}

export async function deleteProperty(formData: FormData): Promise<ActionResult> {
  const propertyId = text(formData, "propertyId");
  if (!propertyId) return { success: false, error: "Property ID is required" };
  return run((userId) => finances.deleteProperty(userId, propertyId));
}

// --- retirement plans ---

export async function addRetirementPlan(formData: FormData): Promise<ActionResult> {
  const name = text(formData, "name");
  const planType = text(formData, "planType");
  if (!name || !planType) return { success: false, error: "Name and plan type are required" };
  return run((userId) =>
    finances.createRetirementPlan(userId, {
      name,
      planType,
      institution: text(formData, "institution") || null,
      balanceCents: dollarsToCents(text(formData, "balance")),
      employerMatch: text(formData, "employerMatch") || null,
      contributionYtdCents: dollarsToCents(text(formData, "contributionYtd")),
      contributionLimitCents: optionalCents(formData, "contributionLimit"),
      targetRetirementAge: optionalInt(formData, "targetRetirementAge"),
      monthlyContributionCents: optionalCents(formData, "monthlyContribution"),
      expectedReturnPercent: text(formData, "expectedReturn") || null,
      notes: text(formData, "notes") || null,
    })
  );
}

export async function updateRetirementPlan(formData: FormData): Promise<ActionResult> {
  const planId = text(formData, "planId");
  if (!planId) return { success: false, error: "Plan ID is required" };
  return run((userId) =>
    finances.updateRetirementPlan(userId, planId, {
      ...(text(formData, "balance") ? { balanceCents: dollarsToCents(text(formData, "balance")) } : {}),
      ...(text(formData, "contributionYtd") ? { contributionYtdCents: dollarsToCents(text(formData, "contributionYtd")) } : {}),
      ...(text(formData, "monthlyContribution") ? { monthlyContributionCents: dollarsToCents(text(formData, "monthlyContribution")) } : {}),
      ...(text(formData, "expectedReturn") ? { expectedReturnPercent: text(formData, "expectedReturn") } : {}),
      ...(formData.get("notes") !== null ? { notes: text(formData, "notes") || null } : {}),
    })
  );
}

export async function deleteRetirementPlan(formData: FormData): Promise<ActionResult> {
  const planId = text(formData, "planId");
  if (!planId) return { success: false, error: "Plan ID is required" };
  return run((userId) => finances.deleteRetirementPlan(userId, planId));
}

// --- snapshots ---

export async function takeSnapshot(): Promise<ActionResult> {
  return run((userId) => finances.takeSnapshot(userId));
}
