import { useQuery } from "@tanstack/react-query";
import { api, keys } from "@/app/api";
import { QueryGate } from "@/components/ui/query-gate";
import { FinancePageSkeleton } from "../finance-page-skeleton";
import { AccountsClient } from "./accounts-client";

export function AccountsPageClient() {
  const accounts = useQuery({ queryKey: keys.financeAccounts, queryFn: api.finances.accounts.list });
  return (
    <QueryGate query={accounts} title="Accounts could not be loaded" skeleton={<FinancePageSkeleton />}>
      {(data) => <AccountsClient accounts={data} />}
    </QueryGate>
  );
}
