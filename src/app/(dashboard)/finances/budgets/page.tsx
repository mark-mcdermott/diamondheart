import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BudgetsPageClient } from "./budgets-page-client";

export default async function BudgetsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  return <BudgetsPageClient />;
}
