"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { addInvestment, deleteInvestment } from "@/app/actions/financial";
import { formatCents, INVESTMENT_TYPES, investmentTypeLabel } from "@/lib/financial-utils";
import type { FinancialInvestment, FinancialAccount } from "@/db/schema";

const EQUITY_TYPES = ["rsu", "iso", "nso"];

type Props = {
  investments: FinancialInvestment[];
  accounts: FinancialAccount[];
};

export function InvestmentsClient({ investments, accounts }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [investmentType, setInvestmentType] = useState("stock");
  const [isPending, startTransition] = useTransition();

  // Summary calculations
  const totalMarketValue = investments.reduce((sum, inv) => {
    const shares = parseFloat(inv.shares) || 0;
    return sum + Math.round(shares * inv.currentPriceCents);
  }, 0);

  const totalCostBasis = investments.reduce((sum, inv) => sum + inv.costBasisCents, 0);
  const totalGainLoss = totalMarketValue - totalCostBasis;
  const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      await addInvestment(formData);
      setDialogOpen(false);
      setInvestmentType("stock");
    });
  }

  function handleDelete(investmentId: string) {
    const fd = new FormData();
    fd.set("investmentId", investmentId);
    startTransition(async () => {
      await deleteInvestment(fd);
    });
  }

  const showEquityFields = EQUITY_TYPES.includes(investmentType);

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/finances" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Investments</h1>
          <p className="text-sm text-muted-foreground">
            Track stocks, RSUs, ISOs, ETFs, and more
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-xl font-bold">{formatCents(totalMarketValue)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cost Basis</p>
              <p className="text-xl font-bold">{formatCents(totalCostBasis)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gain / Loss</p>
              <p className={`text-xl font-bold ${totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                {totalGainLoss >= 0 ? "+" : ""}
                {formatCents(totalGainLoss)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Return</p>
              <p className={`text-xl font-bold ${totalGainLossPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                {totalGainLossPercent >= 0 ? "+" : ""}
                {totalGainLossPercent.toFixed(2)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Investment Button + Dialog */}
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Investment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Investment</DialogTitle>
            </DialogHeader>
            <form action={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input id="symbol" name="symbol" placeholder="AAPL" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" placeholder="Apple Inc." required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="investmentType">Type</Label>
                  <Select
                    name="investmentType"
                    value={investmentType}
                    onValueChange={setInvestmentType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {INVESTMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountId">Account (optional)</Label>
                  <Select name="accountId">
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
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
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shares">Shares</Label>
                  <Input
                    id="shares"
                    name="shares"
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costBasis">Cost Basis ($)</Label>
                  <Input
                    id="costBasis"
                    name="costBasis"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentPrice">Price / Share ($)</Label>
                  <Input
                    id="currentPrice"
                    name="currentPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {showEquityFields && (
                <div className="space-y-4 rounded-md border p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Equity Compensation Details
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="grantDate">Grant Date</Label>
                      <Input id="grantDate" name="grantDate" type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vestingDate">Vesting Date</Label>
                      <Input id="vestingDate" name="vestingDate" type="date" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expirationDate">Expiration Date</Label>
                      <Input id="expirationDate" name="expirationDate" type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="strikePrice">Strike Price ($)</Label>
                      <Input
                        id="strikePrice"
                        name="strikePrice"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" placeholder="Optional notes..." />
              </div>

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Adding..." : "Add Investment"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Investments Table */}
      {investments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No investments yet. Add your first investment to start tracking your portfolio.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">Cost Basis</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Market Value</TableHead>
              <TableHead className="text-right">Gain / Loss</TableHead>
              <TableHead className="text-right">Gain %</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {investments.map((inv) => {
              const shares = parseFloat(inv.shares) || 0;
              const marketValue = Math.round(shares * inv.currentPriceCents);
              const gainLoss = marketValue - inv.costBasisCents;
              const gainPercent =
                inv.costBasisCents > 0 ? (gainLoss / inv.costBasisCents) * 100 : 0;
              const isEquity = EQUITY_TYPES.includes(inv.investmentType);

              return (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">
                    {inv.symbol}
                    {isEquity && inv.strikePriceCents != null && (
                      <span className="block text-xs text-muted-foreground">
                        Strike: {formatCents(inv.strikePriceCents)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {inv.name}
                    {isEquity && (inv.grantDate || inv.vestingDate) && (
                      <span className="block text-xs text-muted-foreground">
                        {inv.grantDate && (
                          <>Grant: {new Date(inv.grantDate).toLocaleDateString()}</>
                        )}
                        {inv.grantDate && inv.vestingDate && " | "}
                        {inv.vestingDate && (
                          <>Vest: {new Date(inv.vestingDate).toLocaleDateString()}</>
                        )}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{investmentTypeLabel(inv.investmentType)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{shares.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}</TableCell>
                  <TableCell className="text-right">{formatCents(inv.costBasisCents)}</TableCell>
                  <TableCell className="text-right">{formatCents(inv.currentPriceCents)}</TableCell>
                  <TableCell className="text-right">{formatCents(marketValue)}</TableCell>
                  <TableCell className={`text-right font-medium ${gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {gainLoss >= 0 ? "+" : ""}
                    {formatCents(gainLoss)}
                  </TableCell>
                  <TableCell className={`text-right ${gainPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {gainPercent >= 0 ? "+" : ""}
                    {gainPercent.toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={isPending}
                      onClick={() => handleDelete(inv.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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
