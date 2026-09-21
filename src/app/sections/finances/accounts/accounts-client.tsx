import { useState } from "react";
import { Link } from "@/app/link";
import { ArrowLeft, Plus, Wallet, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { api, type CreateFinanceAccount, type FinanceAccountView, type UpdateFinanceAccount } from "@/app/api";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { formatCents, accountTypeLabel, ACCOUNT_TYPES } from "@/lib/financial-utils";
import { REFETCH_FINANCES, dollarsToCents, optionalText, text } from "../finance-forms";

type Props = {
  accounts: FinanceAccountView[];
};

export function AccountsClient({ accounts }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinanceAccountView | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<FinanceAccountView | null>(null);

  const create = useApiMutation({
    mutationFn: (input: CreateFinanceAccount) => api.finances.accounts.create(input),
    invalidates: REFETCH_FINANCES,
    onSuccess: () => setAddOpen(false),
  });
  const update = useApiMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateFinanceAccount }) => api.finances.accounts.update(id, patch),
    invalidates: REFETCH_FINANCES,
    onSuccess: () => {
      setEditOpen(false);
      setEditingAccount(null);
    },
  });
  const archive = useApiMutation({
    mutationFn: (id: string) => api.finances.accounts.archive(id),
    invalidates: REFETCH_FINANCES,
    onSuccess: () => {
      setDeleteOpen(false);
      setDeletingAccount(null);
    },
  });
  const isPending = create.isPending || update.isPending || archive.isPending;

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    create.mutate({
      name: text(fd, "name"),
      accountType: text(fd, "accountType"),
      institution: optionalText(fd, "institution"),
      balanceCents: dollarsToCents(text(fd, "balance")),
      currency: "USD",
      notes: optionalText(fd, "notes"),
    });
  }

  function handleEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAccount) return;
    const fd = new FormData(event.currentTarget);
    update.mutate({
      id: editingAccount.id,
      patch: {
        name: text(fd, "name"),
        ...(text(fd, "accountType") ? { accountType: text(fd, "accountType") } : {}),
        institution: optionalText(fd, "institution"),
        balanceCents: dollarsToCents(text(fd, "balance")),
        notes: optionalText(fd, "notes"),
      },
    });
  }

  function handleDelete(account: FinanceAccountView) {
    archive.mutate(account.id);
  }

  function openEdit(account: FinanceAccountView) {
    setEditingAccount(account);
    setEditOpen(true);
  }

  function openDelete(account: FinanceAccountView) {
    setDeletingAccount(account);
    setDeleteOpen(true);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/finances" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2>Accounts</h2>
          <p className="text-muted-foreground mt-1">
            Manage your bank accounts, credit cards, and other financial accounts
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Name</Label>
                <Input id="add-name" name="name" placeholder="e.g. Chase Checking" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-accountType">Account Type</Label>
                <Select name="accountType" required>
                  <SelectTrigger id="add-accountType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-institution">Institution</Label>
                <Input id="add-institution" name="institution" placeholder="e.g. Chase Bank" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-balance">Balance ($)</Label>
                <Input
                  id="add-balance"
                  name="balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-notes">Notes</Label>
                <Textarea id="add-notes" name="notes" placeholder="Optional notes" />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Adding..." : "Add Account"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No accounts yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first financial account to start tracking balances.
            </p>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Wallet className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{account.name}</p>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {accountTypeLabel(account.accountType)}
                        </Badge>
                      </div>
                      {account.institution && (
                        <p className="text-xs text-muted-foreground">{account.institution}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p
                      className={`text-sm font-semibold ${
                        account.balanceCents >= 0 ? "" : "text-[#f8383f]"
                      }`}
                    >
                      {formatCents(account.balanceCents)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Edit ${account.name}`}
                      onClick={() => openEdit(account)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      aria-label={`Delete ${account.name}`}
                      onClick={() => openDelete(account)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingAccount(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          {editingAccount && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={editingAccount.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-accountType">Account Type</Label>
                <Select name="accountType" defaultValue={editingAccount.accountType}>
                  <SelectTrigger id="edit-accountType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-institution">Institution</Label>
                <Input
                  id="edit-institution"
                  name="institution"
                  defaultValue={editingAccount.institution ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-balance">Balance ($)</Label>
                <Input
                  id="edit-balance"
                  name="balance"
                  type="number"
                  step="0.01"
                  defaultValue={(editingAccount.balanceCents / 100).toFixed(2)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  name="notes"
                  defaultValue={editingAccount.notes ?? ""}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeletingAccount(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
          </DialogHeader>
          {deletingAccount && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <strong>{deletingAccount.name}</strong>? This
                action will archive the account and it will no longer appear in your list.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => handleDelete(deletingAccount)}
                >
                  {isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
