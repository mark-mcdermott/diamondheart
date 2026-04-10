import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getAccounts,
  getInvestments,
  getProperties,
  getRetirementPlans,
  getSnapshots,
  getTransactions,
  calculateNetWorth,
  getMonthlySpending,
  getMonthlyIncome,
  getCategories,
} from "@/app/actions/financial";
import { FinanceDashboardClient } from "./finance-dashboard-client";

export default async function FinancesPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [
    accounts,
    investments,
    properties,
    retirementPlans,
    snapshots,
    recentTransactions,
    netWorth,
    monthlySpending,
    monthlyIncome,
    categories,
  ] = await Promise.all([
    getAccounts(session.userId),
    getInvestments(session.userId),
    getProperties(session.userId),
    getRetirementPlans(session.userId),
    getSnapshots(session.userId, 12),
    getTransactions(session.userId, { limit: 10 }),
    calculateNetWorth(session.userId),
    getMonthlySpending(session.userId, year, month),
    getMonthlyIncome(session.userId, year, month),
    getCategories(session.userId),
  ]);

  return (
    <FinanceDashboardClient
      accounts={accounts}
      investments={investments}
      properties={properties}
      retirementPlans={retirementPlans}
      snapshots={snapshots.map((s) => ({
        ...s,
        date: s.date.toISOString(),
        createdAt: s.createdAt.toISOString(),
      }))}
      recentTransactions={recentTransactions.map((t) => ({
        ...t,
        date: t.date.toISOString(),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))}
      netWorth={netWorth}
      monthlySpending={monthlySpending}
      monthlyIncome={monthlyIncome}
      categories={categories}
    />
  );
}
