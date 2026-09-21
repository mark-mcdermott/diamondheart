"use client";

import { useQuery } from "@tanstack/react-query";
import { api, keys } from "@/app/api";
import { QueryGate, combineQueries } from "@/components/ui/query-gate";
import { FinancePageSkeleton } from "../finance-page-skeleton";
import { BudgetsClient } from "./budgets-client";

export function BudgetsPageClient() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const budgets = useQuery({ queryKey: keys.financeBudgets, queryFn: api.finances.budgets.list });
  const categories = useQuery({ queryKey: keys.financeCategories, queryFn: api.finances.categories.list });
  const summary = useQuery({ queryKey: keys.financeMonth(year, month), queryFn: () => api.finances.month(year, month) });
  const reads = combineQueries({ budgets, categories, summary });

  return (
    <QueryGate query={reads} title="Budgets could not be loaded" skeleton={<FinancePageSkeleton cards={4} wide />}>
      {(data) => <BudgetsClient budgets={data.budgets} categories={data.categories} monthlySpending={data.summary.spending} />}
    </QueryGate>
  );
}
