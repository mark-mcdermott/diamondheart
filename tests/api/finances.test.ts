import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as finances from "@/server/api/finances";
import { call, createUser, deleteUser, type TestUser } from "./support";

type Failure = { error: string; fields?: Record<string, string[]> };
const P = "/api/finances";

describe("finances", () => {
  let user: TestUser;
  let other: TestUser;

  beforeAll(async () => {
    user = await createUser();
    other = await createUser();
  });

  afterAll(async () => {
    await deleteUser(user);
    await deleteUser(other);
  });

  it("answers 401 without a session", async () => {
    expect((await call(finances.GET, P)).status).toBe(401);
    expect((await call(finances.transactions.POST, `${P}/transactions`, { method: "POST", body: {} })).status).toBe(401);
  });

  it("seeds the default categories on first read, once", async () => {
    const first = (await call(finances.categories.GET, `${P}/categories`, { as: user })).json as { categories: finances.FinanceCategory[] };
    expect(first.categories).toHaveLength(24);
    expect(first.categories[0]).toMatchObject({ name: "Salary", type: "income", isDefault: true });
    const again = (await call(finances.categories.GET, `${P}/categories`, { as: user })).json as { categories: unknown[] };
    expect(again.categories).toHaveLength(24);
  });

  it("transactions move the owner's balance both ways and never touch another user's account", async () => {
    const created = await call(finances.accounts.POST, `${P}/accounts`, { method: "POST", as: user, body: { name: "Checking", accountType: "checking", balanceCents: 10000 } });
    expect(created.status).toBe(201);
    const account = (created.json as { account: finances.FinanceAccount }).account;
    expect(account).toMatchObject({ currency: "USD", balanceCents: 10000 });

    const foreign = await call(finances.transactions.POST, `${P}/transactions`, { method: "POST", as: other, body: { accountId: account.id, type: "income", amountCents: 500, description: "Sneaky" } });
    expect(foreign.status).toBe(404);

    const expense = await call(finances.transactions.POST, `${P}/transactions`, { method: "POST", as: user, body: { accountId: account.id, type: "expense", amountCents: 2500, description: "Groceries" } });
    expect(expense.status).toBe(201);
    const tx = (expense.json as { transaction: finances.Transaction }).transaction;
    expect(tx.amountCents).toBe(-2500);

    const income = await call(finances.transactions.POST, `${P}/transactions`, { method: "POST", as: user, body: { accountId: account.id, type: "income", amountCents: 100000, description: "Salary" } });
    expect((income.json as { transaction: finances.Transaction }).transaction.amountCents).toBe(100000);

    let [acct] = (await finances.listAccounts(user.id)).filter((a) => a.id === account.id);
    expect(acct.balanceCents).toBe(10000 - 2500 + 100000);

    expect((await call(finances.transaction.DELETE, `${P}/transactions/x`, { method: "DELETE", as: other, params: { id: tx.id } })).status).toBe(404);
    expect((await call(finances.transaction.DELETE, `${P}/transactions/x`, { method: "DELETE", as: user, params: { id: tx.id } })).status).toBe(204);
    [acct] = (await finances.listAccounts(user.id)).filter((a) => a.id === account.id);
    expect(acct.balanceCents).toBe(10000 + 100000);

    const list = (await call(finances.transactions.GET, `${P}/transactions?type=income&limit=5`, { as: user })).json as { transactions: finances.Transaction[] };
    expect(list.transactions.map((t) => t.description)).toEqual(["Salary"]);
    expect((await call(finances.transactions.GET, `${P}/transactions?limit=-1`, { as: user })).status).toBe(422);
  });

  it("imports a CSV once, skipping repeats, and recomputes the balance", async () => {
    const account = await finances.createAccount(user.id, { name: "Card", accountType: "credit_card" });
    const rows = [
      { date: "2026-09-01", description: "Coffee", amount: 4.5, type: "expense" as const },
      { date: "2026-09-02", description: "Refund", amount: 20, type: "income" as const },
    ];
    const first = (await call(finances.transactionImport.POST, `${P}/transactions/import`, { method: "POST", as: user, body: { accountId: account.id, transactions: rows } })).json;
    expect(first).toEqual({ imported: 2, skipped: 0 });
    const second = (await call(finances.transactionImport.POST, `${P}/transactions/import`, { method: "POST", as: user, body: { accountId: account.id, transactions: rows } })).json;
    expect(second).toEqual({ imported: 0, skipped: 2 });
    const [acct] = (await finances.listAccounts(user.id)).filter((a) => a.id === account.id);
    expect(acct.balanceCents).toBe(-450 + 2000);
    expect((await call(finances.transactionImport.POST, `${P}/transactions/import`, { method: "POST", as: other, body: { accountId: account.id, transactions: rows } })).status).toBe(404);
  });

  it("budgets are one per category and validated", async () => {
    const [category] = await finances.listCategories(user.id);
    const set = await call(finances.budgets.PUT, `${P}/budgets`, { method: "PUT", as: user, body: { categoryId: category.id, amountCents: 50000 } });
    expect(set.status).toBe(200);
    const budget = (set.json as { budget: finances.Budget }).budget;
    expect(budget).toMatchObject({ period: "monthly", amountCents: 50000 });

    const updated = (await call(finances.budgets.PUT, `${P}/budgets`, { method: "PUT", as: user, body: { categoryId: category.id, amountCents: 60000, period: "weekly" } })).json as { budget: finances.Budget };
    expect(updated.budget.id).toBe(budget.id);
    expect(updated.budget).toMatchObject({ amountCents: 60000, period: "weekly" });

    const foreign = await call(finances.budgets.PUT, `${P}/budgets`, { method: "PUT", as: other, body: { categoryId: category.id, amountCents: 1 } });
    expect(foreign.status).toBe(404);
    const negative = await call(finances.budgets.PUT, `${P}/budgets`, { method: "PUT", as: user, body: { categoryId: category.id, amountCents: -1 } });
    expect(negative.status).toBe(422);
    expect(Object.keys((negative.json as Failure).fields ?? {})).toEqual(["amountCents"]);
    expect((await call(finances.budget.DELETE, `${P}/budgets/x`, { method: "DELETE", as: user, params: { id: budget.id } })).status).toBe(204);
  });

  it("net worth adds up accounts, investments, properties and plans, and a snapshot records it", async () => {
    const worthUser = await createUser();
    try {
      await finances.createAccount(worthUser.id, { name: "Cash", accountType: "checking", balanceCents: 100_00 });
      await finances.createAccount(worthUser.id, { name: "Loan", accountType: "loan", balanceCents: -40_00 });
      const inv = await call(finances.investments.POST, `${P}/investments`, { method: "POST", as: worthUser, body: { symbol: "vti", name: "Total Market", investmentType: "etf", shares: "2.5", currentPriceCents: 200_00 } });
      expect((inv.json as { investment: finances.Investment }).investment.symbol).toBe("VTI");
      await finances.createProperty(worthUser.id, { name: "Home", currentValueCents: 1000_00, mortgageBalanceCents: 600_00 });
      await finances.createRetirementPlan(worthUser.id, { name: "401k", planType: "401k", balanceCents: 300_00 });

      const worth = (await call(finances.worth.GET, `${P}/net-worth`, { as: worthUser })).json as finances.NetWorth;
      expect(worth).toEqual({ totalAssetsCents: 100_00 + 500_00 + 1000_00 + 300_00, totalLiabilitiesCents: 40_00 + 600_00, netWorthCents: 1900_00 - 640_00 });

      const snap = await call(finances.snapshots.POST, `${P}/snapshots`, { method: "POST", as: worthUser });
      expect(snap.status).toBe(201);
      expect((snap.json as { snapshot: finances.Snapshot }).snapshot).toMatchObject({ netWorthCents: worth.netWorthCents, breakdown: { Cash: 100_00, Loan: -40_00 } });

      const overview = (await call(finances.GET, P, { as: worthUser })).json as finances.FinanceOverview;
      expect(overview.snapshots).toHaveLength(1);
      expect(overview.netWorth.netWorthCents).toBe(worth.netWorthCents);
      expect(overview.categories).toHaveLength(24);
    } finally {
      await deleteUser(worthUser);
    }
  });

  it("archiving an account hides it rather than deleting it", async () => {
    const account = await finances.createAccount(user.id, { name: "Old", accountType: "savings" });
    expect((await call(finances.account.DELETE, `${P}/accounts/x`, { method: "DELETE", as: other, params: { id: account.id } })).status).toBe(404);
    expect((await call(finances.account.DELETE, `${P}/accounts/x`, { method: "DELETE", as: user, params: { id: account.id } })).status).toBe(204);
    expect((await finances.listAccounts(user.id)).some((a) => a.id === account.id)).toBe(false);
    expect((await call(finances.account.PATCH, `${P}/accounts/x`, { method: "PATCH", as: user, params: { id: account.id }, body: { archived: false } })).status).toBe(200);
    expect((await finances.listAccounts(user.id)).some((a) => a.id === account.id)).toBe(true);
  });
});
