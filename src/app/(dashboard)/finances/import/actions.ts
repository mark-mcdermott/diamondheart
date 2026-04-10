"use server";

import { getCurrentUser } from "@/lib/auth";
import { importTransactions } from "@/app/actions/financial";

export async function processImportAction(formData: FormData) {
  const session = await getCurrentUser();
  if (!session) return { success: false as const, error: "Unauthorized" };

  const accountId = formData.get("accountId") as string;
  const transactionsJson = formData.get("transactions") as string;

  if (!accountId || !transactionsJson) {
    return { success: false as const, error: "Missing accountId or transactions" };
  }

  try {
    const transactions = JSON.parse(transactionsJson);
    const result = await importTransactions(session.userId, accountId, transactions);
    return { success: true as const, ...result };
  } catch {
    return { success: false as const, error: "Failed to parse or import transactions" };
  }
}
