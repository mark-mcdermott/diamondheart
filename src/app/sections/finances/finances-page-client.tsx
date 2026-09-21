import { useQuery } from "@tanstack/react-query";
import { api, keys } from "@/app/api";
import { QueryGate } from "@/components/ui/query-gate";
import { FinanceDashboardClient } from "./finance-dashboard-client";
import { FinancePageSkeleton } from "./finance-page-skeleton";

export function FinancesPageClient() {
  const overview = useQuery({ queryKey: keys.finances, queryFn: api.finances.overview });

  return (
    <QueryGate query={overview} title="Finances could not be loaded" skeleton={<FinancePageSkeleton cards={4} wide />}>
      {(data) => (
        <FinanceDashboardClient
          accounts={data.accounts}
          investments={data.investments}
          properties={data.properties}
          retirementPlans={data.retirementPlans}
          snapshots={data.snapshots}
          recentTransactions={data.recentTransactions}
          netWorth={data.netWorth}
          monthlySpending={data.month.spending}
          monthlyIncome={data.month.incomeCents}
          categories={data.categories}
        />
      )}
    </QueryGate>
  );
}
