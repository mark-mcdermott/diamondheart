"use client";

import { useState, useTransition, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addEntertainment, updateEntertainment, deleteEntertainment } from "@/app/actions/entertainment";
import { EmptyState } from "@/components/ui/empty-state";
import type { EntertainmentItem } from "@/db/schema";
import { Plus, Trash2, Pencil, Tv, Film, BookOpen, Music, Gamepad2, Podcast, Star } from "lucide-react";

interface EntertainmentClientProps {
  items: EntertainmentItem[];
}

const TYPES = [
  { key: "show", label: "Shows", icon: Tv },
  { key: "movie", label: "Movies", icon: Film },
  { key: "book", label: "Books", icon: BookOpen },
  { key: "music", label: "Music", icon: Music },
  { key: "podcast", label: "Podcasts", icon: Podcast },
  { key: "game", label: "Games", icon: Gamepad2 },
];

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  watching: "In Progress",
  reading: "In Progress",
  listening: "In Progress",
  completed: "Completed",
  dropped: "Dropped",
};

const TYPE_ICONS: Record<string, typeof Tv> = {
  show: Tv, movie: Film, book: BookOpen, music: Music, podcast: Podcast, game: Gamepad2,
};

function RatingStars({ rating, onRate }: { rating: number | null; onRate?: (r: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onRate?.(i)}
          className={`cursor-pointer ${i <= (rating || 0) ? "text-accent" : "text-muted-foreground/30"}`}
        >
          <Star className="w-4 h-4" fill={i <= (rating || 0) ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

const EntertainmentChart = lazy(() => import("./entertainment-chart").then((m) => ({ default: m.EntertainmentChart })));

export function EntertainmentClient({ items }: EntertainmentClientProps) {
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<EntertainmentItem | null>(null);
  const [activeType, setActiveType] = useState("show");

  // Form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState("show");
  const [creator, setCreator] = useState("");
  const [status, setStatus] = useState("completed");
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  function resetForm() {
    setTitle(""); setCreator(""); setStatus("completed"); setRating(null); setNotes("");
  }

  function handleAdd() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", title);
      fd.set("type", type);
      fd.set("creator", creator);
      fd.set("status", status);
      if (rating) fd.set("rating", String(rating));
      fd.set("notes", notes);
      await addEntertainment(fd);
      resetForm();
      setShowAdd(false);
    });
  }

  function handleUpdate() {
    if (!editItem) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("itemId", editItem.id);
      fd.set("title", title);
      fd.set("status", status);
      if (rating) fd.set("rating", String(rating));
      fd.set("notes", notes);
      await updateEntertainment(fd);
      setEditItem(null);
      resetForm();
    });
  }

  function handleDelete(itemId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("itemId", itemId);
      await deleteEntertainment(fd);
    });
  }

  function openEdit(item: EntertainmentItem) {
    setEditItem(item);
    setTitle(item.title);
    setType(item.type);
    setCreator(item.creator || "");
    setStatus(item.status);
    setRating(item.rating);
    setNotes(item.notes || "");
  }

  const filtered = items.filter((i) => i.type === activeType);

  return (
    <>
      {/* Chart */}
      <Suspense fallback={<div className="h-48 bg-card border border-border rounded-lg animate-pulse mb-8" />}>
        <EntertainmentChart />
      </Suspense>

      {/* Type tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TYPES.map((t) => {
          const count = items.filter((i) => i.type === t.key).length;
          return (
            <Button
              key={t.key}
              size="sm"
              variant={activeType === t.key ? "default" : "secondary"}
              onClick={() => setActiveType(t.key)}
            >
              <t.icon className="w-3.5 h-3.5 mr-1" />
              {t.label} {count > 0 && `(${count})`}
            </Button>
          );
        })}
      </div>

      <div className="flex justify-end mb-4">
        <Button onClick={() => { resetForm(); setType(activeType); setShowAdd(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add {TYPES.find((t) => t.key === activeType)?.label.slice(0, -1) || "Item"}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Add your first show, movie, book, or game to start tracking."
        />
      ) : (
        <div className="bg-card rounded-lg divide-y divide-border">
          {filtered.map((item) => {
            const Icon = TYPE_ICONS[item.type] || Tv;
            return (
              <div key={item.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--app-heading-color)" }}>{item.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{STATUS_LABELS[item.status] || item.status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.creator && <span className="text-xs text-muted-foreground">{item.creator}</span>}
                      {item.rating && <RatingStars rating={item.rating} />}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-xs" onClick={() => openEdit(item)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(item.id)} disabled={isPending}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showAdd || !!editItem} onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditItem(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit" : "Add"} {TYPES.find((t) => t.key === type)?.label.slice(0, -1) || "Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Breaking Bad" className="mt-1" autoFocus />
            </div>
            {!editItem && (
              <div>
                <Label>Type</Label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-card cursor-pointer">
                  {TYPES.map((t) => (
                    <option key={t.key} value={t.key}>{t.label.slice(0, -1)}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label>Creator / Author / Director</Label>
              <Input value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="Optional" className="mt-1" />
            </div>
            <div>
              <Label>Status</Label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-card cursor-pointer">
                <option value="queued">Queued</option>
                <option value="watching">In Progress</option>
                <option value="completed">Completed</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>
            <div>
              <Label>Rating</Label>
              <div className="mt-1">
                <RatingStars rating={rating} onRate={setRating} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="mt-1" />
            </div>
            <div className="flex gap-3 pt-2 justify-end">
              <Button onClick={editItem ? handleUpdate : handleAdd} disabled={!title || isPending}>
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
