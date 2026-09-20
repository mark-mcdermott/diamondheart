"use client";

import { useState, useTransition } from "react";
import { surfaceErrors } from "@/lib/action-result";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { addTransaction, deleteTransaction } from "@/app/actions/financial";
import { formatCents } from "@/lib/financial-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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
import type { FinancialAccount, FinancialCategory } from "@/db/schema";

type SerializedTransaction = {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string | null;
  type: string;
  amountCents: number;
  description: string;
  merchant: string | null;
  date: string;
  notes: string | null;
  isRecurring: boolean;
  importSource: string | null;
  importId: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  transactions: SerializedTransaction[];
  accounts: FinancialAccount[];
  categories: FinancialCategory[];
};

export function TransactionsClient({ transactions, accounts, categories }: Props) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filter state
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Form state
  const [formType, setFormType] = useState<string>("expense");

  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Filter categories by the selected form type
  const filteredFormCategories = categories.filter((c) => c.type === formType);

  // Apply client-side filters
  const filtered = transactions.filter((t) => {
    if (filterAccount !== "all" && t.accountId !== filterAccount) return false;
    if (filterCategory !== "all" && t.categoryId !== filterCategory) return false;
    if (filterType !== "all" && t.type !== filterType) return false;
    return true;
  });

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const result = await surfaceErrors(addTransaction(formData));
      if (result.success) {
        setDialogOpen(false);
      }
    });
  }

  function handleDelete(transactionId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("transactionId", transactionId);
      await surfaceErrors(deleteTransaction(fd));
    });
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/finances" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2>Transactions</h2>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Transaction</DialogTitle>
            </DialogHeader>
            <form action={handleAdd} className="space-y-4">
              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select name="type" value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Account */}
              <div className="space-y-2">
                <Label htmlFor="accountId">Account</Label>
                <Select name="accountId" required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select name="categoryId">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredFormCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input name="description" type="text" placeholder="What was this for?" required />
              </div>

              {/* Merchant */}
              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant</Label>
                <Input name="merchant" type="text" placeholder="Store or payee" />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input name="date" type="date" defaultValue={today} />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea name="notes" placeholder="Optional notes" rows={2} />
              </div>

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Adding..." : "Add Transaction"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger>
            <SelectValue placeholder="All Accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger>
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No transactions found.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((tx) => {
              const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : null;
              const account = accountMap.get(tx.accountId);
              return (
                <TableRow key={tx.id}>
                  <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{tx.description}</TableCell>
                  <TableCell className="text-muted-foreground">{tx.merchant ?? "-"}</TableCell>
                  <TableCell>
                    {cat ? (
                      <Badge variant="secondary">{cat.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{account?.name ?? "-"}</TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      tx.amountCents >= 0 ? "text-emerald-500" : "text-[#f8383f]"
                    }`}
                  >
                    {tx.amountCents >= 0 ? "+" : ""}
                    {formatCents(tx.amountCents)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleDelete(tx.id)}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
