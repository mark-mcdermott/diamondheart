import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errorMessage, keys, type CreateTrackingItem, type TrackingItemView } from "@/app/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Minus, Pencil, Trash2, Package } from "lucide-react";
import { TrackingChart } from "./tracking-chart";
import { getCategoryColorMap } from "./tracking-utils";

interface TrackingClientProps {
  items: TrackingItemView[];
}

const ADJUST_KEY = ["tracking", "adjust"] as const;

export function TrackingClient({ items }: TrackingClientProps) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<TrackingItemView | null>(null);

  // Add form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [count, setCount] = useState("0");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: keys.tracking });
  const surface = (error: unknown) => toast.error(errorMessage(error));

  /**
   * Count taps patch the cached list straight away and only refetch once the
   * last tap in a burst has settled, so a quick +1 +1 never snaps back to +1
   * while the second call is still in flight.
   */
  const adjust = useMutation({
    mutationKey: ADJUST_KEY,
    mutationFn: ({ id, delta }: { id: string; delta: number }) => api.tracking.adjust(id, delta),
    onMutate: async ({ id, delta }) => {
      await queryClient.cancelQueries({ queryKey: keys.tracking });
      const previous = queryClient.getQueryData<TrackingItemView[]>(keys.tracking);
      queryClient.setQueryData<TrackingItemView[]>(keys.tracking, (current) =>
        current?.map((item) => (item.id === id ? { ...item, count: item.count + delta } : item))
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(keys.tracking, context.previous);
      surface(error);
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: ADJUST_KEY }) === 1) void invalidate();
    },
  });

  const save = useMutation({
    mutationFn: ({ id, values }: { id: string | null; values: CreateTrackingItem }) =>
      id ? api.tracking.update(id, values) : api.tracking.create(values),
    onSuccess: closeDialog,
    onError: surface,
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.tracking.remove(id),
    onError: surface,
    onSettled: invalidate,
  });

  function resetForm() {
    setName(""); setCategory(""); setCount("0"); setUnit(""); setNotes("");
  }

  function closeDialog() {
    setShowAdd(false);
    setEditItem(null);
    resetForm();
  }

  function handleSave() {
    save.mutate({
      id: editItem?.id ?? null,
      values: {
        name: name.trim(),
        category: category.trim() || null,
        count: Number.parseInt(count, 10) || 0,
        unit: unit.trim() || null,
        notes: notes.trim() || null,
      },
    });
  }

  function openEdit(item: TrackingItemView) {
    setEditItem(item);
    setName(item.name);
    setCategory(item.category || "");
    setCount(String(item.count));
    setUnit(item.unit || "");
    setNotes(item.notes || "");
  }

  // Group items by category
  const categories = new Map<string, TrackingItemView[]>();
  for (const item of items) {
    const cat = item.category || "Uncategorized";
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(item);
  }

  const categoryColors = getCategoryColorMap(items);
  const adjustingId = adjust.isPending ? adjust.variables.id : null;
  const removingId = remove.isPending ? remove.variables : null;

  return (
    <>
      {/* Chart */}
      <TrackingChart items={items.map((i) => ({ name: i.name, count: i.count, category: i.category }))} />

      <div className="flex justify-end mb-6">
        <Button onClick={() => { resetForm(); setShowAdd(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No items tracked yet"
          description="Start adding items to track your collections, hobbies, and more."
        />
      ) : (
        <div className="space-y-8">
          {Array.from(categories.entries()).map(([cat, catItems]) => {
            const catColor = categoryColors.get(cat) ?? "var(--app-primary)";
            return (
            <section key={cat}>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: catColor }}
                />
                {cat}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg p-4 border"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${catColor} 7%, var(--app-surface-warm))`,
                      borderColor: `color-mix(in srgb, ${catColor} 20%, var(--app-border))`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" style={{ color: catColor }} />
                        <span className="text-sm font-semibold" style={{ color: "var(--app-heading-color)" }}>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" aria-label={`Edit ${item.name}`} onClick={() => openEdit(item)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Delete ${item.name}`}
                          disabled={removingId === item.id}
                          onClick={() => remove.mutate(item.id)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-2xl font-bold mb-1" style={{ color: "var(--app-heading-color)" }}>
                      {item.count}
                      {item.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{item.unit}</span>}
                    </p>
                    {item.notes && <p className="text-xs text-muted-foreground mb-2">{item.notes}</p>}
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon-xs"
                        variant="secondary"
                        aria-label={`Decrease ${item.name}`}
                        disabled={adjustingId === item.id || item.count <= 0}
                        onClick={() => adjust.mutate({ id: item.id, delta: -1 })}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="secondary"
                        aria-label={`Increase ${item.name}`}
                        onClick={() => adjust.mutate({ id: item.id, delta: 1 })}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showAdd || !!editItem} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pokemon Cards" className="mt-1" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Collections" className="mt-1" />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. cards, items" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Current Count</Label>
              <Input type="number" value={count} onChange={(e) => setCount(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="mt-1" />
            </div>
            <div className="flex gap-3 pt-2 justify-end">
              <Button onClick={handleSave} disabled={!name.trim() || save.isPending}>
                {editItem ? "Save" : "Add"}
              </Button>
              <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
