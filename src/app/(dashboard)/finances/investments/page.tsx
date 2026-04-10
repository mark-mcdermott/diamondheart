import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getInvestments, getAccounts } from "@/app/actions/financial";
import { InvestmentsClient } from "./investments-client";

export default async function InvestmentsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const [investments, accounts] = await Promise.all([
    getInvestments(session.userId),
    getAccounts(session.userId),
  ]);
  return <InvestmentsClient investments={investments} accounts={accounts} />;
}
