import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAccounts } from "@/app/actions/financial";
import { AccountsClient } from "./accounts-client";

export default async function AccountsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const accounts = await getAccounts(session.userId);
  return <AccountsClient accounts={accounts} />;
}
