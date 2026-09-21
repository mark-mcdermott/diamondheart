"use client";

import { useQuery } from "@tanstack/react-query";
import { api, keys } from "@/app/api";
import { QueryGate } from "@/components/ui/query-gate";
import { FinancePageSkeleton } from "../finance-page-skeleton";
import { RetirementClient } from "./retirement-client";

export function RetirementPageClient() {
  const plans = useQuery({ queryKey: keys.financeRetirement, queryFn: api.finances.retirement.list });
  return (
    <QueryGate query={plans} title="Retirement plans could not be loaded" skeleton={<FinancePageSkeleton cards={2} wide />}>
      {(data) => <RetirementClient plans={data} />}
    </QueryGate>
  );
}
