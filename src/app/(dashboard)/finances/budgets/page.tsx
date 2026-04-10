import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getBudgets, getCategories, getMonthlySpending } from "@/app/actions/financial";
import { BudgetsClient } from "./budgets-client";

export default async function BudgetsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const now = new Date();
  const [budgets, categories, monthlySpending] = await Promise.all([
    getBudgets(session.userId),
    getCategories(session.userId),
    getMonthlySpending(session.userId, now.getFullYear(), now.getMonth() + 1),
  ]);
  return (
    <BudgetsClient
      budgets={budgets}
      categories={categories}
      monthlySpending={monthlySpending}
    />
  );
}
