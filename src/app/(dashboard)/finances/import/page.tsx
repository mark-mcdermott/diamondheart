import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAccounts, getCategories } from "@/app/actions/financial";
import { ImportClient } from "./import-client";

export default async function ImportPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const [accounts, categories] = await Promise.all([
    getAccounts(session.userId),
    getCategories(session.userId),
  ]);
  return <ImportClient accounts={accounts} categories={categories} />;
}
