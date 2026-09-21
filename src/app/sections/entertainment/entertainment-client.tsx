"use client";

import { useState, lazy, Suspense } from "react";
import { api, type CreateEntertainmentInput, type EntertainmentItemView, type UpdateEntertainmentInput } from "@/app/api";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Trash2, Pencil, Tv, Film, BookOpen, Music, Gamepad2, Podcast, Star } from "lucide-react";
import { useViewRange } from "@/lib/use-view-range";
import { viewRangeBounds, viewRangeLabel } from "@/lib/view-range";

interface EntertainmentClientProps {
  items: EntertainmentItemView[];
}

/** The list and the chart's totals both live under "entertainment". */
const AFTER_WRITE = [["entertainment"]] as const;

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
  const { view, anchor } = useViewRange("week");
  const bounds = viewRangeBounds(view, anchor ?? new Date());
  const periodLabel = viewRangeLabel(view, anchor);
  const rangedItems = items.filter((i) => {
    const d = typeof i.updatedAt === "string" ? new Date(i.updatedAt) : i.updatedAt;
    return d >= bounds.start && d < bounds.end;
  });

  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<EntertainmentItemView | null>(null);
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

  function closeDialog() {
    setShowAdd(false);
    setEditItem(null);
    resetForm();
  }

  const create = useApiMutation({
    mutationFn: (input: CreateEntertainmentInput) => api.entertainment.create(input),
    invalidates: AFTER_WRITE,
    onSuccess: closeDialog,
  });
  const update = useApiMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateEntertainmentInput }) => api.entertainment.update(id, patch),
    invalidates: AFTER_WRITE,
    onSuccess: closeDialog,
  });
  const remove = useApiMutation({ mutationFn: (id: string) => api.entertainment.remove(id), invalidates: AFTER_WRITE });
  const isPending = create.isPending || update.isPending || remove.isPending;

  function handleAdd() {
    create.mutate({ title: title.trim(), type, creator: creator.trim() || null, status, rating, notes: notes.trim() || null });
  }

  function handleUpdate() {
    if (!editItem) return;
    update.mutate({ id: editItem.id, patch: { title: title.trim(), status, rating, notes: notes.trim() || null } });
  }

  function handleDelete(itemId: string) {
    remove.mutate(itemId);
  }

  function openEdit(item: EntertainmentItemView) {
    setEditItem(item);
    setTitle(item.title);
    setType(item.type);
    setCreator(item.creator || "");
    setStatus(item.status);
    setRating(item.rating);
    setNotes(item.notes || "");
  }

  const filtered = rangedItems.filter((i) => i.type === activeType);

  return (
    <>
      {/* Chart */}
      <Suspense fallback={<div className="h-48 bg-card border border-border rounded-lg animate-pulse mb-8" />}>
        <EntertainmentChart />
      </Suspense>

      {/* Type tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TYPES.map((t) => {
          const count = rangedItems.filter((i) => i.type === t.key).length;
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
          title={`No activity in ${periodLabel.toLowerCase()}`}
          description="Switch to a wider range or add something new to your library."
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
                  <Button variant="ghost" size="icon-xs" aria-label={`Edit ${item.title}`} onClick={() => openEdit(item)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" aria-label={`Delete ${item.title}`} onClick={() => handleDelete(item.id)} disabled={isPending}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showAdd || !!editItem} onOpenChange={(open) => { if (!open) closeDialog(); }}>
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
              <Button onClick={editItem ? handleUpdate : handleAdd} disabled={!title.trim() || isPending}>
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
