"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addTrackingItem, updateTrackingCount, updateTrackingItem, deleteTrackingItem } from "@/app/actions/tracking";
import type { TrackingItem } from "@/db/schema";
import { Plus, Minus, Pencil, Trash2, Package } from "lucide-react";

interface TrackingClientProps {
  items: TrackingItem[];
}

export function TrackingClient({ items }: TrackingClientProps) {
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<TrackingItem | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Add form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [count, setCount] = useState("0");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setName(""); setCategory(""); setCount("0"); setUnit(""); setNotes("");
  }

  function handleAdd() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("category", category);
      fd.set("count", count);
      fd.set("unit", unit);
      fd.set("notes", notes);
      await addTrackingItem(fd);
      resetForm();
      setShowAdd(false);
    });
  }

  function handleIncrement(itemId: string, delta: number) {
    setPendingId(itemId);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("itemId", itemId);
      fd.set("delta", String(delta));
      await updateTrackingCount(fd);
      setPendingId(null);
    });
  }

  function handleUpdate() {
    if (!editItem) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("itemId", editItem.id);
      fd.set("name", name);
      fd.set("category", category);
      fd.set("count", count);
      fd.set("unit", unit);
      fd.set("notes", notes);
      await updateTrackingItem(fd);
      setEditItem(null);
      resetForm();
    });
  }

  function handleDelete(itemId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("itemId", itemId);
      await deleteTrackingItem(fd);
    });
  }

  function openEdit(item: TrackingItem) {
    setEditItem(item);
    setName(item.name);
    setCategory(item.category || "");
    setCount(String(item.count));
    setUnit(item.unit || "");
    setNotes(item.notes || "");
  }

  // Group items by category
  const categories = new Map<string, TrackingItem[]>();
  for (const item of items) {
    const cat = item.category || "Uncategorized";
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(item);
  }

  return (
    <>
      <div className="flex justify-end mb-6">
        <Button onClick={() => { resetForm(); setShowAdd(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">No items tracked yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(categories.entries()).map(([cat, catItems]) => (
            <section key={cat}>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">{cat}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {catItems.map((item) => (
                  <div key={item.id} className="bg-card rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold" style={{ color: "var(--app-heading-color)" }}>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => openEdit(item)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(item.id)}>
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
                        disabled={pendingId === item.id || item.count <= 0}
                        onClick={() => handleIncrement(item.id, -1)}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="secondary"
                        disabled={pendingId === item.id}
                        onClick={() => handleIncrement(item.id, 1)}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showAdd || !!editItem} onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditItem(null); resetForm(); } }}>
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
              <Button onClick={editItem ? handleUpdate : handleAdd} disabled={!name || isPending}>
                {editItem ? "Save" : "Add"}
              </Button>
              <Button variant="secondary" onClick={() => { setShowAdd(false); setEditItem(null); resetForm(); }}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
