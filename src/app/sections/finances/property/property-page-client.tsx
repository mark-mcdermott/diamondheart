"use client";

import { useQuery } from "@tanstack/react-query";
import { api, keys } from "@/app/api";
import { QueryGate } from "@/components/ui/query-gate";
import { FinancePageSkeleton } from "../finance-page-skeleton";
import { PropertyClient } from "./property-client";

export function PropertyPageClient() {
  const properties = useQuery({ queryKey: keys.financeProperties, queryFn: api.finances.properties.list });
  return (
    <QueryGate query={properties} title="Property could not be loaded" skeleton={<FinancePageSkeleton cards={2} wide />}>
      {(data) => <PropertyClient properties={data} />}
    </QueryGate>
  );
}
