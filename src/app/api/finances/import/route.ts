import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { importTransactions } from "@/app/actions/financial";

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { accountId, transactions } = body;

  if (!accountId || !transactions || !Array.isArray(transactions)) {
    return NextResponse.json(
      { error: "accountId and transactions array are required" },
      { status: 400 },
    );
  }

  for (const tx of transactions) {
    if (!tx.date || !tx.description || tx.amount === undefined || !tx.type) {
      return NextResponse.json(
        { error: "Each transaction must have date, description, amount, and type" },
        { status: 400 },
      );
    }
    if (!["income", "expense"].includes(tx.type)) {
      return NextResponse.json(
        { error: "type must be 'income' or 'expense'" },
        { status: 400 },
      );
    }
  }

  const result = await importTransactions(session.userId, accountId, transactions);
  return NextResponse.json(result);
}
