"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addEntertainment,
  updateEntertainment,
  deleteEntertainment,
} from "@/app/actions/entertainment";
import type { EntertainmentItem } from "@/db/schema";
import { ShowEpisodeTracker } from "./show-episode-tracker";
import {
  Search,
  Plus,
  Star,
  Film,
  Tv,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NetflixClientProps {
  items: EntertainmentItem[];
}

interface OmdbResult {
  imdbId: string;
  title: string;
  year: string;
  type: "movie" | "show";
  posterUrl: string | null;
}

interface OmdbDetails {
  imdbId: string;
  title: string;
  type: "movie" | "show";
  year: string | null;
  posterUrl: string | null;
  overview: string | null;
  releaseDate: string | null;
  genres: string[];
  runtime: number | null;
  seasonCount: number | null;
  imdbRating: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: "queued", label: "Want to Watch" },
  { value: "watching", label: "Watching" },
  { value: "completed", label: "Completed" },
  { value: "dropped", label: "Dropped" },
];

const STATUS_LABELS: Record<string, string> = {
  queued: "Want to Watch",
  watching: "Currently Watching",
  completed: "Completed",
  dropped: "Dropped",
};

const TYPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "movie", label: "Movies" },
  { key: "show", label: "Shows" },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RatingStars({
  rating,
  onRate,
  size = "sm",
}: {
  rating: number | null;
  onRate?: (r: number) => void;
  size?: "sm" | "md";
}) {
  const iconClass = size === "md" ? "w-5 h-5" : "w-4 h-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onRate?.(i)}
          className={`cursor-pointer transition-colors ${
            i <= (rating || 0)
              ? "text-accent"
              : "text-muted-foreground/30 hover:text-muted-foreground/60"
          }`}
        >
          <Star
            className={iconClass}
            fill={i <= (rating || 0) ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );
}

function PosterCard({
  posterUrl,
  title,
  onClick,
  overlay,
}: {
  posterUrl: string | null;
  title: string;
  onClick?: () => void;
  overlay?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex-shrink-0 w-[140px] sm:w-[160px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted transition-transform duration-200 group-hover:scale-105">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            sizes="160px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-muted-foreground">
            <Film className="w-8 h-8" />
            <span className="text-xs text-center leading-tight line-clamp-3">
              {title}
            </span>
          </div>
        )}
        {/* Title overlay on hover */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-white text-xs font-medium leading-tight line-clamp-2">
            {title}
          </p>
        </div>
        {overlay}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1 text-left">
        {title}
      </p>
    </button>
  );
}

function ScrollRow({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [scrollRef, setScrollRef] = useState<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (!scrollRef) return;
    setCanScrollLeft(scrollRef.scrollLeft > 0);
    setCanScrollRight(
      scrollRef.scrollLeft < scrollRef.scrollWidth - scrollRef.clientWidth - 1
    );
  }, [scrollRef]);

  useEffect(() => {
    checkScroll();
    const el = scrollRef;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [scrollRef, checkScroll]);

  function scroll(direction: "left" | "right") {
    if (!scrollRef) return;
    const amount = scrollRef.clientWidth * 0.75;
    scrollRef.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  return (
    <section className="mb-8">
      <h3
        className="text-lg font-semibold mb-3 px-1"
        style={{ color: "var(--app-heading-color)" }}
      >
        {title}
      </h3>
      <div className="relative group/row">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-0 top-0 bottom-6 z-10 w-10 flex items-center justify-center bg-gradient-to-r from-background/90 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        <div
          ref={setScrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {children}
        </div>
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-0 top-0 bottom-6 z-10 w-10 flex items-center justify-center bg-gradient-to-l from-background/90 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function NetflixClient({ items: serverItems }: NetflixClientProps) {
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(serverItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OmdbResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeType, setActiveType] = useState("all");

  // Detail modal state
  const [selectedItem, setSelectedItem] = useState<EntertainmentItem | null>(
    null
  );
  const [detailRating, setDetailRating] = useState<number | null>(null);
  const [detailStatus, setDetailStatus] = useState("completed");
  const [detailNotes, setDetailNotes] = useState("");

  // Add dialog state (from OMDB search result)
  const [addingResult, setAddingResult] = useState<OmdbResult | null>(null);
  const [addStatus, setAddStatus] = useState("queued");
  const [addDetails, setAddDetails] = useState<OmdbDetails | null>(null);

  // Sync server items into local state
  useEffect(() => {
    setItems(serverItems);
  }, [serverItems]);

  // Debounced OMDB search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [movieRes, showRes] = await Promise.all([
          fetch(
            `/api/omdb/search?query=${encodeURIComponent(searchQuery)}&type=movie`
          ),
          fetch(
            `/api/omdb/search?query=${encodeURIComponent(searchQuery)}&type=show`
          ),
        ]);
        const movieData = await movieRes.json();
        const showData = await showRes.json();
        const combined: OmdbResult[] = [
          ...(movieData.results || []),
          ...(showData.results || []),
        ];
        // Prefer results with posters
        combined.sort((a, b) => {
          if (!!a.posterUrl === !!b.posterUrl) return 0;
          return a.posterUrl ? -1 : 1;
        });
        setSearchResults(combined);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Fetch OMDB details when opening add dialog
  useEffect(() => {
    if (!addingResult) {
      setAddDetails(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/omdb/${encodeURIComponent(addingResult.imdbId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setAddDetails(data);
      } catch {
        /* gracefully ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addingResult]);

  // ------- Handlers -------

  function handleAddFromOmdb() {
    if (!addingResult) return;
    const result = addingResult;
    const details = addDetails;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", result.title);
      fd.set("type", result.type);
      fd.set("status", addStatus);
      fd.set("imdbId", result.imdbId);
      if (result.posterUrl) fd.set("posterUrl", result.posterUrl);
      if (details?.overview) fd.set("overview", details.overview);
      if (details?.releaseDate) fd.set("releaseDate", details.releaseDate);
      else if (result.year) fd.set("releaseDate", result.year);
      if (details?.imdbRating) fd.set("voteAverage", details.imdbRating);
      if (details?.genres?.length) fd.set("genres", details.genres.join(", "));
      if (details?.runtime) fd.set("runtime", String(details.runtime));
      if (details?.seasonCount)
        fd.set("seasonCount", String(details.seasonCount));

      await addEntertainment(fd);
      setAddingResult(null);
      setAddStatus("queued");
      setSearchQuery("");
      setSearchResults([]);
    });
  }

  function openDetail(item: EntertainmentItem) {
    setSelectedItem(item);
    setDetailRating(item.rating);
    setDetailStatus(item.status);
    setDetailNotes(item.notes || "");
  }

  function handleSaveDetail() {
    if (!selectedItem) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("itemId", selectedItem.id);
      fd.set("title", selectedItem.title);
      fd.set("status", detailStatus);
      if (detailRating) fd.set("rating", String(detailRating));
      fd.set("notes", detailNotes);
      await updateEntertainment(fd);
      setSelectedItem(null);
    });
  }

  function handleDeleteDetail() {
    if (!selectedItem) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("itemId", selectedItem.id);
      await deleteEntertainment(fd);
      setSelectedItem(null);
    });
  }

  // ------- Filtered items -------

  const filteredItems =
    activeType === "all"
      ? items
      : items.filter((i) => i.type === activeType);

  const watching = filteredItems.filter((i) => i.status === "watching");
  const queued = filteredItems.filter((i) => i.status === "queued");
  const completed = filteredItems.filter((i) => i.status === "completed");
  const dropped = filteredItems.filter((i) => i.status === "dropped");

  const isSearchActive = searchQuery.trim().length > 0;

  // Check if an OMDB result is already in library
  const libraryImdbIds = new Set(
    items.filter((i) => i.imdbId).map((i) => i.imdbId)
  );

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search movies and TV shows..."
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSearchResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-2 mb-6">
        {TYPE_FILTERS.map((t) => {
          const count =
            t.key === "all"
              ? items.length
              : items.filter((i) => i.type === t.key).length;
          return (
            <Button
              key={t.key}
              size="sm"
              variant={activeType === t.key ? "default" : "secondary"}
              onClick={() => setActiveType(t.key)}
            >
              {t.key === "movie" && <Film className="w-3.5 h-3.5 mr-1" />}
              {t.key === "show" && <Tv className="w-3.5 h-3.5 mr-1" />}
              {t.label} {count > 0 && `(${count})`}
            </Button>
          );
        })}
      </div>

      {/* Search results */}
      {isSearchActive && (
        <div className="mb-8">
          <h3
            className="text-lg font-semibold mb-3 px-1"
            style={{ color: "var(--app-heading-color)" }}
          >
            Search Results
            {isSearching && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                Searching...
              </span>
            )}
          </h3>
          {searchResults.length === 0 && !isSearching ? (
            <div className="border border-dashed border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">
                No results found. Try a different search term.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {searchResults.slice(0, 18).map((result) => {
                const inLibrary = libraryImdbIds.has(result.imdbId);
                return (
                  <div key={result.imdbId} className="relative">
                    <PosterCard
                      posterUrl={result.posterUrl}
                      title={result.title}
                      onClick={() => {
                        if (!inLibrary) {
                          setAddingResult(result);
                          setAddStatus("queued");
                        }
                      }}
                      overlay={
                        inLibrary ? (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded">
                            In Library
                          </div>
                        ) : undefined
                      }
                    />
                    {!inLibrary && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddingResult(result);
                          setAddStatus("queued");
                        }}
                        className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                        style={{ opacity: 1 }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="flex items-center gap-1 mt-0.5 px-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {result.year?.slice(0, 4) || "N/A"}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {result.type === "show" ? "TV" : "Movie"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Library rows */}
      {!isSearchActive && (
        <>
          {watching.length === 0 &&
            queued.length === 0 &&
            completed.length === 0 &&
            dropped.length === 0 && (
              <div className="border border-dashed border-border rounded-lg p-12 text-center">
                <Film className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-1">
                  Your library is empty.
                </p>
                <p className="text-sm text-muted-foreground">
                  Search for movies and TV shows above to start building your
                  collection.
                </p>
              </div>
            )}

          {watching.length > 0 && (
            <ScrollRow title={STATUS_LABELS.watching}>
              {watching.map((item) => (
                <PosterCard
                  key={item.id}
                  posterUrl={item.posterUrl}
                  title={item.title}
                  onClick={() => openDetail(item)}
                />
              ))}
            </ScrollRow>
          )}

          {queued.length > 0 && (
            <ScrollRow title={STATUS_LABELS.queued}>
              {queued.map((item) => (
                <PosterCard
                  key={item.id}
                  posterUrl={item.posterUrl}
                  title={item.title}
                  onClick={() => openDetail(item)}
                />
              ))}
            </ScrollRow>
          )}

          {completed.length > 0 && (
            <ScrollRow title={STATUS_LABELS.completed}>
              {completed.map((item) => (
                <PosterCard
                  key={item.id}
                  posterUrl={item.posterUrl}
                  title={item.title}
                  onClick={() => openDetail(item)}
                />
              ))}
            </ScrollRow>
          )}

          {dropped.length > 0 && (
            <ScrollRow title={STATUS_LABELS.dropped}>
              {dropped.map((item) => (
                <PosterCard
                  key={item.id}
                  posterUrl={item.posterUrl}
                  title={item.title}
                  onClick={() => openDetail(item)}
                />
              ))}
            </ScrollRow>
          )}
        </>
      )}

      {/* Add from OMDB dialog */}
      <Dialog
        open={!!addingResult}
        onOpenChange={(open) => {
          if (!open) setAddingResult(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Library</DialogTitle>
          </DialogHeader>
          {addingResult && (
            <div className="space-y-4 mt-2">
              <div className="flex gap-4">
                {addingResult.posterUrl ? (
                  <div className="relative w-20 aspect-[2/3] rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={addingResult.posterUrl}
                      alt={addingResult.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-20 aspect-[2/3] rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <Film className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <h4
                    className="font-semibold text-sm"
                    style={{ color: "var(--app-heading-color)" }}
                  >
                    {addingResult.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {addingResult.year?.slice(0, 4) || "N/A"} &middot;{" "}
                    {addingResult.type === "show" ? "TV Show" : "Movie"}
                  </p>
                  {addDetails?.genres && addDetails.genres.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {addDetails.genres.join(", ")}
                    </p>
                  )}
                  {addDetails?.imdbRating && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      IMDb: {addDetails.imdbRating}/10
                    </p>
                  )}
                </div>
              </div>

              {addDetails?.overview && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {addDetails.overview}
                </p>
              )}

              <div>
                <Label>Status</Label>
                <select
                  value={addStatus}
                  onChange={(e) => setAddStatus(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-card cursor-pointer text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2 justify-end">
                <Button
                  onClick={handleAddFromOmdb}
                  disabled={isPending}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add to Library
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAddingResult(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail modal */}
      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
      >
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          {selectedItem && (
            <>
              {/* Hero (uses poster as backdrop since OMDB has no separate backdrop) */}
              {selectedItem.posterUrl ? (
                <div className="relative w-full h-48 sm:h-56 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-center bg-cover blur-xl scale-110 opacity-60"
                    style={{ backgroundImage: `url(${selectedItem.posterUrl})` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div className="relative h-full aspect-[2/3]">
                      <Image
                        src={selectedItem.posterUrl}
                        alt={selectedItem.title}
                        fill
                        sizes="(max-width: 640px) 40vw, 180px"
                        className="object-contain drop-shadow-lg"
                        unoptimized
                      />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white drop-shadow-md">
                      {selectedItem.title}
                    </h3>
                  </div>
                </div>
              ) : (
                <div className="px-6 pt-6">
                  <DialogHeader>
                    <DialogTitle>{selectedItem.title}</DialogTitle>
                  </DialogHeader>
                </div>
              )}

              <div className="px-6 pb-6 space-y-4">
                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {selectedItem.releaseDate && (
                    <span>{selectedItem.releaseDate.slice(0, 4)}</span>
                  )}
                  {selectedItem.genres && <span>{selectedItem.genres}</span>}
                  {selectedItem.runtime && (
                    <span>{selectedItem.runtime} min</span>
                  )}
                  {selectedItem.seasonCount && (
                    <span>
                      {selectedItem.seasonCount} season
                      {selectedItem.seasonCount > 1 ? "s" : ""}
                    </span>
                  )}
                  {selectedItem.voteAverage && (
                    <span>IMDb: {selectedItem.voteAverage}/10</span>
                  )}
                </div>

                {/* Overview */}
                {selectedItem.overview && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedItem.overview}
                  </p>
                )}

                {/* Status */}
                <div>
                  <Label>Status</Label>
                  <select
                    value={detailStatus}
                    onChange={(e) => setDetailStatus(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-card cursor-pointer text-sm"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rating */}
                <div>
                  <Label>Your Rating</Label>
                  <div className="mt-1">
                    <RatingStars
                      rating={detailRating}
                      onRate={setDetailRating}
                      size="md"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={detailNotes}
                    onChange={(e) => setDetailNotes(e.target.value)}
                    placeholder="Your thoughts..."
                    className="mt-1 text-sm"
                    rows={3}
                  />
                </div>

                {/* Episode tracker (shows only) */}
                {selectedItem.type === "show" &&
                  selectedItem.imdbId &&
                  selectedItem.seasonCount &&
                  selectedItem.seasonCount > 0 && (
                    <ShowEpisodeTracker
                      seriesImdbId={selectedItem.imdbId}
                      seasonCount={selectedItem.seasonCount}
                    />
                  )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteDetail}
                    disabled={isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedItem(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveDetail}
                      disabled={isPending}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
