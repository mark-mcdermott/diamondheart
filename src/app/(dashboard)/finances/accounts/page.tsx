import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AccountsPageClient } from "./accounts-page-client";

export default async function AccountsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  return <AccountsPageClient />;
}
