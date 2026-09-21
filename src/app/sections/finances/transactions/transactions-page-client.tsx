"use client";

import { useQuery } from "@tanstack/react-query";
import { api, keys } from "@/app/api";
import { QueryGate, combineQueries } from "@/components/ui/query-gate";
import { FinancePageSkeleton } from "../finance-page-skeleton";
import { TransactionsClient } from "./transactions-client";

const PAGE_SIZE = 100;

export function TransactionsPageClient() {
  const transactions = useQuery({ queryKey: keys.financeTransactions(PAGE_SIZE), queryFn: () => api.finances.transactions.list(PAGE_SIZE) });
  const accounts = useQuery({ queryKey: keys.financeAccounts, queryFn: api.finances.accounts.list });
  const categories = useQuery({ queryKey: keys.financeCategories, queryFn: api.finances.categories.list });
  const reads = combineQueries({ transactions, accounts, categories });

  return (
    <QueryGate query={reads} title="Transactions could not be loaded" skeleton={<FinancePageSkeleton cards={6} wide />}>
      {(data) => <TransactionsClient transactions={data.transactions} accounts={data.accounts} categories={data.categories} />}
    </QueryGate>
  );
}
