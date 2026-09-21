import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TransactionsPageClient } from "./transactions-page-client";

export default async function TransactionsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  return <TransactionsPageClient />;
}
