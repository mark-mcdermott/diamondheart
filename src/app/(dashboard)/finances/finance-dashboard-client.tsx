"use client";

import Link from "next/link";
import { ArrowLeft, Wallet, TrendingUp, Home, PiggyBank, ArrowUpDown, Receipt, Target, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCents, formatCentsCompact, accountTypeLabel } from "@/lib/financial-utils";
import type {
  FinancialAccount,
  FinancialInvestment,
  FinancialProperty,
  FinancialRetirementPlan,
  FinancialCategory,
} from "@/db/schema";

type SerializedSnapshot = {
  id: string;
  date: string;
  netWorthCents: number;
  totalAssetsCents: number;
  totalLiabilitiesCents: number;
};

type SerializedTransaction = {
  id: string;
  type: string;
  amountCents: number;
  description: string;
  merchant: string | null;
  date: string;
  categoryId: string | null;
};

type MonthlySpendingRow = {
  categoryId: string | null;
  totalCents: number;
  count: number;
};

type Props = {
  accounts: FinancialAccount[];
  investments: FinancialInvestment[];
  properties: FinancialProperty[];
  retirementPlans: FinancialRetirementPlan[];
  snapshots: SerializedSnapshot[];
  recentTransactions: SerializedTransaction[];
  netWorth: {
    netWorthCents: number;
    totalAssetsCents: number;
    totalLiabilitiesCents: number;
  };
  monthlySpending: MonthlySpendingRow[];
  monthlyIncome: number;
  categories: FinancialCategory[];
};

const NAV_LINKS = [
  { href: "/finances/accounts", label: "Accounts", icon: Wallet, description: "Manage bank & credit accounts" },
  { href: "/finances/transactions", label: "Transactions", icon: ArrowUpDown, description: "Income & expenses" },
  { href: "/finances/budgets", label: "Budgets", icon: Target, description: "Monthly spending limits" },
  { href: "/finances/investments", label: "Investments", icon: TrendingUp, description: "Stocks, RSUs, ISOs & more" },
  { href: "/finances/retirement", label: "Retirement", icon: PiggyBank, description: "401k, IRA & projections" },
  { href: "/finances/property", label: "Property", icon: Home, description: "Real estate & equity" },
  { href: "/finances/import", label: "Import", icon: Upload, description: "CSV import & API" },
];

export function FinanceDashboardClient({
  accounts,
  investments,
  properties,
  retirementPlans,
  recentTransactions,
  netWorth,
  monthlySpending,
  monthlyIncome,
  categories,
}: Props) {
  const totalMonthlyExpenses = monthlySpending.reduce((sum, row) => sum + Number(row.totalCents), 0);
  const income = Number(monthlyIncome);
  const savingsRate = income > 0 ? ((income - totalMonthlyExpenses) / income) * 100 : 0;

  const investmentValue = investments.reduce((sum, inv) => {
    const shares = parseFloat(inv.shares) || 0;
    return sum + Math.round(shares * inv.currentPriceCents);
  }, 0);

  const propertyEquity = properties.reduce(
    (sum, prop) => sum + (prop.currentValueCents - prop.mortgageBalanceCents),
    0
  );

  const retirementTotal = retirementPlans.reduce((sum, plan) => sum + plan.balanceCents, 0);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2>Finances</h2>
          <p className="text-muted-foreground mt-1">Track spending, investments, and net worth</p>
        </div>
      </div>

      {/* Net Worth Hero */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Net Worth</p>
            <p className={`text-4xl font-bold ${netWorth.netWorthCents >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {formatCents(netWorth.netWorthCents)}
            </p>
            <div className="flex justify-center gap-8 mt-4 text-sm">
              <div>
                <span className="text-muted-foreground">Assets </span>
                <span className="text-emerald-500 font-medium">{formatCentsCompact(netWorth.totalAssetsCents)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Liabilities </span>
                <span className="text-red-500 font-medium">{formatCentsCompact(netWorth.totalLiabilitiesCents)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Income this month</p>
            <p className="text-lg font-semibold text-emerald-500">{formatCentsCompact(income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Spending this month</p>
            <p className="text-lg font-semibold text-red-500">{formatCentsCompact(totalMonthlyExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Savings rate</p>
            <p className={`text-lg font-semibold ${savingsRate >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {savingsRate.toFixed(0)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Accounts</p>
            <p className="text-lg font-semibold">{accounts.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Breakdown */}
      {(investmentValue > 0 || propertyEquity > 0 || retirementTotal > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {investmentValue > 0 && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Investments</p>
                </div>
                <p className="text-lg font-semibold">{formatCentsCompact(investmentValue)}</p>
                <p className="text-xs text-muted-foreground">{investments.length} holdings</p>
              </CardContent>
            </Card>
          )}
          {propertyEquity > 0 && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Home className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Property Equity</p>
                </div>
                <p className="text-lg font-semibold">{formatCentsCompact(propertyEquity)}</p>
                <p className="text-xs text-muted-foreground">{properties.length} properties</p>
              </CardContent>
            </Card>
          )}
          {retirementTotal > 0 && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <PiggyBank className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Retirement</p>
                </div>
                <p className="text-lg font-semibold">{formatCentsCompact(retirementTotal)}</p>
                <p className="text-xs text-muted-foreground">{retirementPlans.length} plans</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Accounts Overview */}
      {accounts.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
            <CardDescription>
              <Link href="/finances/accounts" className="text-sm hover:underline">
                Manage accounts →
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {accountTypeLabel(account.accountType)}
                        {account.institution ? ` · ${account.institution}` : ""}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-medium ${account.balanceCents >= 0 ? "" : "text-red-500"}`}>
                    {formatCents(account.balanceCents)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Spending Categories */}
      {monthlySpending.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Spending This Month</CardTitle>
            <CardDescription>
              <Link href="/finances/budgets" className="text-sm hover:underline">
                View budgets →
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {monthlySpending
                .sort((a, b) => b.totalCents - a.totalCents)
                .slice(0, 8)
                .map((row) => {
                  const cat = row.categoryId ? categoryMap.get(row.categoryId) : null;
                  const pct = totalMonthlyExpenses > 0 ? (row.totalCents / totalMonthlyExpenses) * 100 : 0;
                  return (
                    <div key={row.categoryId ?? "uncategorized"} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{cat?.name ?? "Uncategorized"}</span>
                          <span className="text-muted-foreground">{formatCents(row.totalCents)}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              <Link href="/finances/transactions" className="text-sm hover:underline">
                View all →
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.map((tx) => {
                const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : null;
                return (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Receipt className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.date).toLocaleDateString()}
                          {cat ? ` · ${cat.name}` : ""}
                        </p>
                      </div>
                    </div>
                    <p className={`text-sm font-medium ${tx.amountCents >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {tx.amountCents >= 0 ? "+" : ""}
                      {formatCents(tx.amountCents)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-4 pb-4 flex flex-col items-center text-center gap-2">
                <link.icon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{link.label}</p>
                  <p className="text-xs text-muted-foreground">{link.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {accounts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Get started with finances</h3>
            <p className="text-muted-foreground mb-4">
              Add your first account to start tracking your financial life.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/finances/accounts"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
              >
                <Wallet className="w-4 h-4" />
                Add Account
              </Link>
              <Link
                href="/finances/import"
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-muted"
              >
                <Upload className="w-4 h-4" />
                Import CSV
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
