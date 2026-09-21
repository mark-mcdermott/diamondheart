import { useQuery } from "@tanstack/react-query";
import { api, keys } from "@/app/api";
import { QueryGate, combineQueries } from "@/components/ui/query-gate";
import { FinancePageSkeleton } from "../finance-page-skeleton";
import { ImportClient } from "./import-client";

export function ImportPageClient() {
  const accounts = useQuery({ queryKey: keys.financeAccounts, queryFn: api.finances.accounts.list });
  const categories = useQuery({ queryKey: keys.financeCategories, queryFn: api.finances.categories.list });
  const reads = combineQueries({ accounts, categories });

  return (
    <QueryGate query={reads} title="Import could not be loaded" skeleton={<FinancePageSkeleton cards={2} wide />}>
      {(data) => <ImportClient accounts={data.accounts} categories={data.categories} />}
    </QueryGate>
  );
}
