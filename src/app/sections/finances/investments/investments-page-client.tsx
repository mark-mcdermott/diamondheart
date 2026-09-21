"use client";

import { useQuery } from "@tanstack/react-query";
import { api, keys } from "@/app/api";
import { QueryGate, combineQueries } from "@/components/ui/query-gate";
import { FinancePageSkeleton } from "../finance-page-skeleton";
import { InvestmentsClient } from "./investments-client";

export function InvestmentsPageClient() {
  const investments = useQuery({ queryKey: keys.financeInvestments, queryFn: api.finances.investments.list });
  const accounts = useQuery({ queryKey: keys.financeAccounts, queryFn: api.finances.accounts.list });
  const reads = combineQueries({ investments, accounts });

  return (
    <QueryGate query={reads} title="Investments could not be loaded" skeleton={<FinancePageSkeleton cards={4} wide />}>
      {(data) => <InvestmentsClient investments={data.investments} accounts={data.accounts} />}
    </QueryGate>
  );
}
