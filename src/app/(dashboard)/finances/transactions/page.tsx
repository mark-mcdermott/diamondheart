import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTransactions, getAccounts, getCategories } from "@/app/actions/financial";
import { TransactionsClient } from "./transactions-client";

export default async function TransactionsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const [transactions, accounts, categories] = await Promise.all([
    getTransactions(session.userId, { limit: 100 }),
    getAccounts(session.userId),
    getCategories(session.userId),
  ]);
  return (
    <TransactionsClient
      transactions={transactions.map((t) => ({
        ...t,
        date: t.date.toISOString(),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))}
      accounts={accounts}
      categories={categories}
    />
  );
}
