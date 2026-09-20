"use client";

import { useTransition, useState } from "react";
import { surfaceErrors } from "@/lib/action-result";
import Link from "next/link";
import { ArrowLeft, Home, Plus, Trash2 } from "lucide-react";
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
import { addProperty, deleteProperty } from "@/app/actions/financial";
import { formatCents, PROPERTY_TYPES } from "@/lib/financial-utils";
import type { FinancialProperty } from "@/db/schema";

type Props = {
  properties: FinancialProperty[];
};

function propertyTypeLabel(type: string): string {
  return PROPERTY_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function PropertyClient({ properties }: Props) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  const totalValue = properties.reduce((sum, p) => sum + p.currentValueCents, 0);
  const totalMortgage = properties.reduce((sum, p) => sum + p.mortgageBalanceCents, 0);
  const totalEquity = totalValue - totalMortgage;

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      await surfaceErrors(addProperty(formData));
      setDialogOpen(false);
    });
  }

  function handleDelete(propertyId: string) {
    const fd = new FormData();
    fd.set("propertyId", propertyId);
    startTransition(async () => {
      await surfaceErrors(deleteProperty(fd));
    });
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/finances" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2>Property</h2>
          <p className="text-muted-foreground mt-1">Real estate tracking and equity</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Property
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Property</DialogTitle>
            </DialogHeader>
            <form action={handleAdd} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" required placeholder="Primary Residence" />
              </div>
              <div>
                <Label htmlFor="propertyType">Property Type</Label>
                <Select name="propertyType" defaultValue="primary">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" name="address" placeholder="123 Main St, City, ST 12345" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
                  <Input id="purchasePrice" name="purchasePrice" type="number" step="0.01" min="0" placeholder="0.00" />
                </div>
                <div>
                  <Label htmlFor="currentValue">Current Value ($)</Label>
                  <Input id="currentValue" name="currentValue" type="number" step="0.01" min="0" placeholder="0.00" />
                </div>
              </div>
              <div>
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input id="purchaseDate" name="purchaseDate" type="date" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="mortgageBalance">Mortgage Balance ($)</Label>
                  <Input id="mortgageBalance" name="mortgageBalance" type="number" step="0.01" min="0" placeholder="0.00" />
                </div>
                <div>
                  <Label htmlFor="mortgageRate">Mortgage Rate (%)</Label>
                  <Input id="mortgageRate" name="mortgageRate" type="number" step="0.01" min="0" placeholder="6.50" />
                </div>
              </div>
              <div>
                <Label htmlFor="mortgageMonthlyPayment">Monthly Payment ($)</Label>
                <Input id="mortgageMonthlyPayment" name="mortgageMonthlyPayment" type="number" step="0.01" min="0" placeholder="0.00" />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" placeholder="Any additional notes..." />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Adding..." : "Add Property"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      {properties.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Total Property Value</p>
              <p className="text-lg font-semibold">{formatCents(totalValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Total Mortgage Balance</p>
              <p className="text-lg font-semibold text-[#f8383f]">{formatCents(totalMortgage)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Total Equity</p>
              <p className={`text-lg font-semibold ${totalEquity >= 0 ? "text-emerald-500" : "text-[#f8383f]"}`}>
                {formatCents(totalEquity)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Property Cards */}
      {properties.length > 0 ? (
        <div className="space-y-4">
          {properties.map((property) => {
            const equity = property.currentValueCents - property.mortgageBalanceCents;
            const appreciationCents = property.currentValueCents - property.purchasePriceCents;
            const appreciationPct =
              property.purchasePriceCents > 0
                ? ((appreciationCents / property.purchasePriceCents) * 100).toFixed(1)
                : "0.0";

            return (
              <Card key={property.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>{property.name}</CardTitle>
                        <Badge variant="secondary">{propertyTypeLabel(property.propertyType)}</Badge>
                      </div>
                      {property.address && (
                        <CardDescription className="mt-1">{property.address}</CardDescription>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(property.id)}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-[#f8383f]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Purchase Price */}
                    <div>
                      <p className="text-xs text-muted-foreground">Purchase Price</p>
                      <p className="text-sm font-medium">{formatCents(property.purchasePriceCents)}</p>
                    </div>

                    {/* Current Value */}
                    <div>
                      <p className="text-xs text-muted-foreground">Current Value</p>
                      <p className="text-sm font-medium">{formatCents(property.currentValueCents)}</p>
                    </div>

                    {/* Appreciation */}
                    <div>
                      <p className="text-xs text-muted-foreground">Appreciation</p>
                      <p className={`text-sm font-medium ${appreciationCents >= 0 ? "text-emerald-500" : "text-[#f8383f]"}`}>
                        {appreciationCents >= 0 ? "+" : ""}
                        {formatCents(appreciationCents)} ({appreciationCents >= 0 ? "+" : ""}
                        {appreciationPct}%)
                      </p>
                    </div>

                    {/* Purchase Date */}
                    <div>
                      <p className="text-xs text-muted-foreground">Purchase Date</p>
                      <p className="text-sm font-medium">
                        {property.purchaseDate
                          ? new Date(property.purchaseDate).toLocaleDateString()
                          : "--"}
                      </p>
                    </div>

                    {/* Mortgage Balance */}
                    <div>
                      <p className="text-xs text-muted-foreground">Mortgage Balance</p>
                      <p className="text-sm font-medium text-[#f8383f]">
                        {formatCents(property.mortgageBalanceCents)}
                      </p>
                    </div>

                    {/* Mortgage Rate */}
                    <div>
                      <p className="text-xs text-muted-foreground">Mortgage Rate</p>
                      <p className="text-sm font-medium">
                        {property.mortgageRatePercent ? `${property.mortgageRatePercent}%` : "--"}
                      </p>
                    </div>

                    {/* Monthly Payment */}
                    <div>
                      <p className="text-xs text-muted-foreground">Monthly Payment</p>
                      <p className="text-sm font-medium">
                        {property.mortgageMonthlyPaymentCents != null
                          ? formatCents(property.mortgageMonthlyPaymentCents)
                          : "--"}
                      </p>
                    </div>

                    {/* Equity (prominent) */}
                    <div>
                      <p className="text-xs text-muted-foreground">Equity</p>
                      <p className={`text-sm font-bold ${equity >= 0 ? "text-emerald-500" : "text-[#f8383f]"}`}>
                        {formatCents(equity)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first property to start tracking real estate equity.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
