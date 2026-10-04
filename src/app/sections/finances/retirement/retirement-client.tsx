import { useState } from "react";
import { Link } from "@/app/link";
import { ArrowLeft, Plus, PiggyBank, Trash2, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatCents, RETIREMENT_PLAN_TYPES, calculateRetirementProjection } from "@/lib/financial-utils";
import { api, type CreateRetirementPlan, type RetirementPlanView, type UpdateRetirementPlan } from "@/app/api";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { REFETCH_FINANCES, dollarsToCents, optionalCents, optionalInt, optionalText, text } from "../finance-forms";

function planTypeLabel(type: string): string {
  return RETIREMENT_PLAN_TYPES.find((t) => t.value === type)?.label ?? type;
}

type Props = {
  plans: RetirementPlanView[];
};

export function RetirementClient({ plans }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<RetirementPlanView | null>(null);

  const create = useApiMutation({
    mutationFn: (input: CreateRetirementPlan) => api.finances.retirement.create(input),
    invalidates: REFETCH_FINANCES,
    onSuccess: () => setAddOpen(false),
  });
  const update = useApiMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateRetirementPlan }) => api.finances.retirement.update(id, patch),
    invalidates: REFETCH_FINANCES,
    onSuccess: () => setEditingPlan(null),
  });
  const remove = useApiMutation({ mutationFn: (id: string) => api.finances.retirement.remove(id), invalidates: REFETCH_FINANCES });
  const isPending = create.isPending || update.isPending || remove.isPending;

  // Projection calculator state
  const [projCurrentAge, setProjCurrentAge] = useState("");
  const [projRetirementAge, setProjRetirementAge] = useState("");
  const [projBalance, setProjBalance] = useState("");
  const [projMonthly, setProjMonthly] = useState("");
  const [projEmployerMatch, setProjEmployerMatch] = useState("");
  const [projReturn, setProjReturn] = useState("7");
  const [projectionResult, setProjectionResult] = useState<{
    projectedBalance: number;
    yearlyProjections: Array<{ age: number; balance: number; balanceInflationAdjusted: number }>;
  } | null>(null);

  const totalBalance = plans.reduce((sum, p) => sum + p.balanceCents, 0);

  // Pre-fill projection fields from plan data
  const totalMonthlyContribution = plans.reduce(
    (sum, p) => sum + (p.monthlyContributionCents ?? 0),
    0
  );

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    create.mutate({
      name: text(fd, "name"),
      planType: text(fd, "planType"),
      institution: optionalText(fd, "institution"),
      balanceCents: dollarsToCents(text(fd, "balance")),
      employerMatch: optionalText(fd, "employerMatch"),
      contributionYtdCents: dollarsToCents(text(fd, "contributionYtd")),
      contributionLimitCents: optionalCents(fd, "contributionLimit"),
      targetRetirementAge: optionalInt(fd, "targetRetirementAge"),
      monthlyContributionCents: optionalCents(fd, "monthlyContribution"),
      expectedReturnPercent: optionalText(fd, "expectedReturn"),
      notes: optionalText(fd, "notes"),
    });
  }

  function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingPlan) return;
    const fd = new FormData(event.currentTarget);
    // A blank money field leaves that column alone; notes always save, so they can be cleared.
    update.mutate({
      id: editingPlan.id,
      patch: {
        ...(text(fd, "balance") ? { balanceCents: dollarsToCents(text(fd, "balance")) } : {}),
        ...(text(fd, "contributionYtd") ? { contributionYtdCents: dollarsToCents(text(fd, "contributionYtd")) } : {}),
        ...(text(fd, "monthlyContribution") ? { monthlyContributionCents: dollarsToCents(text(fd, "monthlyContribution")) } : {}),
        ...(text(fd, "expectedReturn") ? { expectedReturnPercent: text(fd, "expectedReturn") } : {}),
        notes: optionalText(fd, "notes"),
      },
    });
  }

  function handleDelete(planId: string) {
    if (!confirm("Delete this retirement plan?")) return;
    remove.mutate(planId);
  }

  function runProjection() {
    const currentAge = parseInt(projCurrentAge, 10);
    const retirementAge = parseInt(projRetirementAge, 10);
    const balance = parseFloat(projBalance) || totalBalance / 100;
    const monthly = parseFloat(projMonthly) || totalMonthlyContribution / 100;
    const employerMatch = parseFloat(projEmployerMatch) || 0;
    const annualReturn = parseFloat(projReturn) || 7;

    if (!currentAge || !retirementAge || retirementAge <= currentAge) return;

    const result = calculateRetirementProjection({
      currentBalance: balance,
      monthlyContribution: monthly,
      employerMatchPercent: employerMatch / 100,
      annualReturnPercent: annualReturn / 100,
      currentAge,
      retirementAge,
    });
    setProjectionResult(result);
  }

  function formatDollars(value: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/finances" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2>Retirement Planning</h2>
            <p className="text-muted-foreground mt-1">401k, IRA, and retirement projections</p>
          </div>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="w-4 h-4 mr-1" />
            Add Plan
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Retirement Plan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <Label htmlFor="add-name">Plan Name *</Label>
                <Input id="add-name" name="name" required placeholder="e.g. Company 401(k)" />
              </div>
              <div>
                <Label htmlFor="add-planType">Plan Type *</Label>
                <Select name="planType" required>
                  <SelectTrigger id="add-planType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RETIREMENT_PLAN_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="add-institution">Institution</Label>
                <Input id="add-institution" name="institution" placeholder="e.g. Fidelity" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="add-balance">Balance ($)</Label>
                  <Input
                    id="add-balance"
                    name="balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="add-monthly">Monthly Contribution ($)</Label>
                  <Input
                    id="add-monthly"
                    name="monthlyContribution"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="add-ytd">YTD Contributions ($)</Label>
                  <Input
                    id="add-ytd"
                    name="contributionYtd"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="add-limit">Annual Limit ($)</Label>
                  <Input
                    id="add-limit"
                    name="contributionLimit"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 23500"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="add-match">Employer Match</Label>
                <Input
                  id="add-match"
                  name="employerMatch"
                  placeholder='e.g. 100% up to 6%'
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="add-return">Expected Annual Return (%)</Label>
                  <Input
                    id="add-return"
                    name="expectedReturn"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 7"
                  />
                </div>
                <div>
                  <Label htmlFor="add-retirement-age">Target Retirement Age</Label>
                  <Input
                    id="add-retirement-age"
                    name="targetRetirementAge"
                    type="number"
                    placeholder="e.g. 65"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="add-notes">Notes</Label>
                <Textarea id="add-notes" name="notes" rows={2} />
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Adding..." : "Add Plan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Total Retirement Balance Hero */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Retirement Balance</p>
            <p className="text-4xl font-bold text-emerald-500">{formatCents(totalBalance)}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {plans.length} {plans.length === 1 ? "plan" : "plans"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Plans List */}
      {plans.length === 0 && (
        <Card className="mb-6">
          <CardContent className="py-12 text-center">
            <PiggyBank className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No retirement plans yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your 401(k), IRA, or other retirement accounts to start tracking.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {plans.map((plan) => {
          const ytd = plan.contributionYtdCents;
          const limit = plan.contributionLimitCents;
          const ytdProgress = limit && limit > 0 ? Math.min((ytd / limit) * 100, 100) : 0;

          return (
            <Card key={plan.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{planTypeLabel(plan.planType)}</Badge>
                      {plan.institution && (
                        <span className="text-xs text-muted-foreground">{plan.institution}</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit ${plan.name}`}
                      onClick={() => setEditingPlan(plan)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${plan.name}`}
                      onClick={() => handleDelete(plan.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Current Balance</p>
                  <p className="text-xl font-semibold">{formatCents(plan.balanceCents)}</p>
                </div>

                {limit && limit > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>YTD Contributions</span>
                      <span>
                        {formatCents(ytd)} / {formatCents(limit)}
                      </span>
                    </div>
                    <Progress value={ytdProgress} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {plan.monthlyContributionCents != null && plan.monthlyContributionCents > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Monthly Contribution</p>
                      <p className="font-medium">{formatCents(plan.monthlyContributionCents)}</p>
                    </div>
                  )}
                  {plan.employerMatch && (
                    <div>
                      <p className="text-xs text-muted-foreground">Employer Match</p>
                      <p className="font-medium">{plan.employerMatch}</p>
                    </div>
                  )}
                  {plan.expectedReturnPercent && (
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Return</p>
                      <p className="font-medium">{plan.expectedReturnPercent}%</p>
                    </div>
                  )}
                  {plan.targetRetirementAge && (
                    <div>
                      <p className="text-xs text-muted-foreground">Target Retirement Age</p>
                      <p className="font-medium">{plan.targetRetirementAge}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingPlan?.name}</DialogTitle>
          </DialogHeader>
          {editingPlan && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Label htmlFor="edit-balance">Balance ($)</Label>
                <Input
                  id="edit-balance"
                  name="balance"
                  type="number"
                  step="0.01"
                  defaultValue={(editingPlan.balanceCents / 100).toFixed(2)}
                />
              </div>
              <div>
                <Label htmlFor="edit-ytd">YTD Contributions ($)</Label>
                <Input
                  id="edit-ytd"
                  name="contributionYtd"
                  type="number"
                  step="0.01"
                  defaultValue={(editingPlan.contributionYtdCents / 100).toFixed(2)}
                />
              </div>
              <div>
                <Label htmlFor="edit-monthly">Monthly Contribution ($)</Label>
                <Input
                  id="edit-monthly"
                  name="monthlyContribution"
                  type="number"
                  step="0.01"
                  defaultValue={
                    editingPlan.monthlyContributionCents
                      ? (editingPlan.monthlyContributionCents / 100).toFixed(2)
                      : ""
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-return">Expected Annual Return (%)</Label>
                <Input
                  id="edit-return"
                  name="expectedReturn"
                  type="number"
                  step="0.01"
                  defaultValue={editingPlan.expectedReturnPercent ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  name="notes"
                  rows={2}
                  defaultValue={editingPlan.notes ?? ""}
                />
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Retirement Projection Calculator */}
      <Card>
        <CardHeader>
          <CardTitle>Retirement Projection Calculator</CardTitle>
          <CardDescription>
            Estimate your retirement balance based on contributions and expected growth
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="proj-age">Current Age</Label>
              <Input
                id="proj-age"
                type="number"
                value={projCurrentAge}
                onChange={(e) => setProjCurrentAge(e.target.value)}
                placeholder="e.g. 30"
              />
            </div>
            <div>
              <Label htmlFor="proj-retire">Target Retirement Age</Label>
              <Input
                id="proj-retire"
                type="number"
                value={projRetirementAge}
                onChange={(e) => setProjRetirementAge(e.target.value)}
                placeholder="e.g. 65"
              />
            </div>
            <div>
              <Label htmlFor="proj-balance">Current Total Balance ($)</Label>
              <Input
                id="proj-balance"
                type="number"
                step="0.01"
                value={projBalance}
                onChange={(e) => setProjBalance(e.target.value)}
                placeholder={(totalBalance / 100).toFixed(2)}
              />
            </div>
            <div>
              <Label htmlFor="proj-monthly">Monthly Contribution ($)</Label>
              <Input
                id="proj-monthly"
                type="number"
                step="0.01"
                value={projMonthly}
                onChange={(e) => setProjMonthly(e.target.value)}
                placeholder={(totalMonthlyContribution / 100).toFixed(2)}
              />
            </div>
            <div>
              <Label htmlFor="proj-match">Employer Match (%)</Label>
              <Input
                id="proj-match"
                type="number"
                step="0.01"
                value={projEmployerMatch}
                onChange={(e) => setProjEmployerMatch(e.target.value)}
                placeholder="e.g. 6"
              />
            </div>
            <div>
              <Label htmlFor="proj-return">Expected Annual Return (%)</Label>
              <Input
                id="proj-return"
                type="number"
                step="0.01"
                value={projReturn}
                onChange={(e) => setProjReturn(e.target.value)}
                placeholder="7"
              />
            </div>
          </div>

          <Button onClick={runProjection}>Calculate</Button>

          {projectionResult && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Projected Balance at Retirement</p>
                    <p className="text-2xl font-bold text-emerald-500">
                      {formatDollars(projectionResult.projectedBalance)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Inflation-Adjusted Balance</p>
                    <p className="text-2xl font-bold text-blue-500">
                      {projectionResult.yearlyProjections.length > 0
                        ? formatDollars(
                            projectionResult.yearlyProjections[
                              projectionResult.yearlyProjections.length - 1
                            ].balanceInflationAdjusted
                          )
                        : formatDollars(projectionResult.projectedBalance)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {projectionResult.yearlyProjections.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Year-by-Year Projection (every 5 years)</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Age</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Inflation-Adjusted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectionResult.yearlyProjections
                        .filter((row) => {
                          const startAge = parseInt(projCurrentAge, 10);
                          const yearsIn = row.age - startAge;
                          const isLast =
                            row.age ===
                            projectionResult.yearlyProjections[
                              projectionResult.yearlyProjections.length - 1
                            ].age;
                          return yearsIn % 5 === 0 || isLast;
                        })
                        .map((row) => (
                          <TableRow key={row.age}>
                            <TableCell className="font-medium">{row.age}</TableCell>
                            <TableCell className="text-right">{formatDollars(row.balance)}</TableCell>
                            <TableCell className="text-right">
                              {formatDollars(row.balanceInflationAdjusted)}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
