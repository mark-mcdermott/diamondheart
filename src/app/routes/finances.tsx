import { FinancesPageClient } from "@/app/sections/finances/finances-page-client";
import { AccountsPageClient } from "@/app/sections/finances/accounts/accounts-page-client";
import { TransactionsPageClient } from "@/app/sections/finances/transactions/transactions-page-client";
import { BudgetsPageClient } from "@/app/sections/finances/budgets/budgets-page-client";
import { InvestmentsPageClient } from "@/app/sections/finances/investments/investments-page-client";
import { RetirementPageClient } from "@/app/sections/finances/retirement/retirement-page-client";
import { PropertyPageClient } from "@/app/sections/finances/property/property-page-client";
import { ImportPageClient } from "@/app/sections/finances/import/import-page-client";

export function FinancesRoute() {
  return <FinancesPageClient />;
}
export function FinanceAccountsRoute() {
  return <AccountsPageClient />;
}
export function FinanceTransactionsRoute() {
  return <TransactionsPageClient />;
}
export function FinanceBudgetsRoute() {
  return <BudgetsPageClient />;
}
export function FinanceInvestmentsRoute() {
  return <InvestmentsPageClient />;
}
export function FinanceRetirementRoute() {
  return <RetirementPageClient />;
}
export function FinancePropertyRoute() {
  return <PropertyPageClient />;
}
export function FinanceImportRoute() {
  return <ImportPageClient />;
}
