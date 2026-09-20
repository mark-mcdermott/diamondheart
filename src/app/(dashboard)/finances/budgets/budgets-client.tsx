"use client";

import { useState, useTransition } from "react";
import { surfaceErrors } from "@/lib/action-result";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setBudget, deleteBudget } from "@/app/actions/financial";
import { formatCents } from "@/lib/financial-utils";
import type { FinancialBudget, FinancialCategory } from "@/db/schema";

type MonthlySpendingRow = {
  categoryId: string | null;
  totalCents: number;
  count: number;
};

type Props = {
  budgets: FinancialBudget[];
  categories: FinancialCategory[];
  monthlySpending: MonthlySpendingRow[];
};

function budgetColor(pct: number): string {
  if (pct >= 100) return "text-[#f8383f]";
  if (pct >= 75) return "text-yellow-500";
  return "text-emerald-500";
}

function progressColor(pct: number): string {
  if (pct >= 100) return "[&_[data-slot=progress-indicator]]:bg-red-500";
  if (pct >= 75) return "[&_[data-slot=progress-indicator]]:bg-yellow-500";
  return "[&_[data-slot=progress-indicator]]:bg-emerald-500";
}

export function BudgetsClient({ budgets, categories, monthlySpending }: Props) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const spendingMap = new Map(
    monthlySpending.map((row) => [row.categoryId, row.totalCents])
  );

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const budgetedCategoryIds = new Set(budgets.map((b) => b.categoryId));
  const unbudgetedExpenseCategories = expenseCategories.filter(
    (c) => !budgetedCategoryIds.has(c.id)
  );

  function handleSetBudget(formData: FormData) {
    startTransition(async () => {
      await surfaceErrors(setBudget(formData));
      setDialogOpen(false);
      setSelectedCategoryId("");
    });
  }

  function handleDeleteBudget(budgetId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("budgetId", budgetId);
      await surfaceErrors(deleteBudget(fd));
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/finances" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2>Budgets</h2>
          <p className="text-muted-foreground mt-1">Monthly spending limits by category</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Budget</DialogTitle>
            </DialogHeader>
            <form action={handleSetBudget} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select
                  name="categoryId"
                  value={selectedCategoryId}
                  onValueChange={setSelectedCategoryId}
                >
                  <SelectTrigger id="categoryId">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="categoryId" value={selectedCategoryId} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Monthly Limit ($)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending || !selectedCategoryId}>
                {isPending ? "Saving..." : "Save Budget"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Budget Cards */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {budgets.map((budget) => {
            const category = categoryMap.get(budget.categoryId);
            const spent = spendingMap.get(budget.categoryId) ?? 0;
            const pct = budget.amountCents > 0 ? (spent / budget.amountCents) * 100 : 0;

            return (
              <Card key={budget.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {category?.name ?? "Unknown Category"}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {formatCents(budget.amountCents)}/mo
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-[#f8383f]"
                        disabled={isPending}
                        onClick={() => handleDeleteBudget(budget.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress
                    value={Math.min(pct, 100)}
                    className={`h-2 mb-2 ${progressColor(pct)}`}
                  />
                  <div className="flex justify-between text-sm">
                    <span className={budgetColor(pct)}>
                      {formatCents(spent)} / {formatCents(budget.amountCents)}
                    </span>
                    <span className={budgetColor(pct)}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {budgets.length === 0 && (
        <Card className="mb-8">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-2">No budgets set yet.</p>
            <p className="text-sm text-muted-foreground">
              Click &quot;Add Budget&quot; to set monthly spending limits for your expense categories.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Unbudgeted Categories */}
      {unbudgetedExpenseCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unbudgeted Categories</CardTitle>
            <CardDescription>
              Expense categories without a monthly budget
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unbudgetedExpenseCategories.map((cat) => {
                const spent = spendingMap.get(cat.id) ?? 0;
                return (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <span>{cat.name}</span>
                    {spent > 0 && (
                      <span className="text-muted-foreground">
                        ({formatCents(spent)} this month)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
