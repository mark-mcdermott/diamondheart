"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Loader2, Check, Film } from "lucide-react";
import { api, errorMessage, keys, type EpisodeWatched, apiFetch } from "@/app/api";

interface Episode {
  imdbId: string;
  title: string;
  episode: number | null;
  airDate: string | null;
  imdbRating: string | null;
}

interface SeasonState {
  loading: boolean;
  episodes: Episode[] | null;
  error: string | null;
}

interface ShowEpisodeTrackerProps {
  seriesImdbId: string;
  seasonCount: number;
}

// Module-level poster cache so the same episode isn't re-fetched across modal opens.
const posterCache = new Map<string, string | null>();

const WATCH_KEY = ["entertainment", "episodes", "watch"] as const;

export function ShowEpisodeTracker({
  seriesImdbId,
  seasonCount,
}: ShowEpisodeTrackerProps) {
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [seasons, setSeasons] = useState<Map<number, SeasonState>>(new Map());
  const [posters, setPosters] = useState<Map<string, string | null>>(
    () => new Map(posterCache),
  );
  const [brokenPosters, setBrokenPosters] = useState<Set<string>>(new Set());
  const [openSeason, setOpenSeason] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // The watched set is local so a tap flips at once; the query re-syncs it
  // after the last in-flight toggle settles.
  const watchedRows = useQuery({ queryKey: keys.watchedEpisodes(seriesImdbId), queryFn: () => api.entertainment.watchedEpisodes(seriesImdbId) });
  const watchedData = watchedRows.data;
  useEffect(() => {
    if (watchedData) setWatched(new Set(watchedData.map((r) => r.episodeImdbId)));
  }, [watchedData]);

  const mark = useMutation({
    mutationKey: WATCH_KEY,
    mutationFn: (input: EpisodeWatched) => api.entertainment.setEpisodeWatched(input),
    onError: (error, input) => {
      setWatched((prev) => {
        const next = new Set(prev);
        if (input.watched) next.delete(input.episodeImdbId);
        else next.add(input.episodeImdbId);
        return next;
      });
      toast.error(errorMessage(error));
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: WATCH_KEY }) === 1) {
        void queryClient.invalidateQueries({ queryKey: keys.watchedEpisodes(seriesImdbId) });
      }
    },
  });

  async function loadPosters(episodes: Episode[]) {
    const missing = episodes.filter((e) => !posterCache.has(e.imdbId));
    await Promise.allSettled(
      missing.map(async (ep) => {
        try {
          const res = await apiFetch(`/api/omdb/${encodeURIComponent(ep.imdbId)}`);
          const url = res.ok
            ? ((await res.json()).posterUrl as string | null)
            : null;
          posterCache.set(ep.imdbId, url);
          setPosters((prev) => new Map(prev).set(ep.imdbId, url));
        } catch {
          posterCache.set(ep.imdbId, null);
          setPosters((prev) => new Map(prev).set(ep.imdbId, null));
        }
      }),
    );
  }

  async function loadSeason(season: number) {
    if (seasons.get(season)?.episodes) return;
    setSeasons((prev) => {
      const next = new Map(prev);
      next.set(season, { loading: true, episodes: null, error: null });
      return next;
    });
    try {
      const res = await apiFetch(
        `/api/omdb/season?seriesId=${encodeURIComponent(seriesImdbId)}&season=${season}`,
      );
      const data = await res.json();
      const episodes: Episode[] = data.episodes || [];
      setSeasons((prev) => {
        const next = new Map(prev);
        next.set(season, {
          loading: false,
          episodes,
          error: data.error ?? null,
        });
        return next;
      });
      loadPosters(episodes);
    } catch {
      setSeasons((prev) => {
        const next = new Map(prev);
        next.set(season, {
          loading: false,
          episodes: [],
          error: "Failed to load",
        });
        return next;
      });
    }
  }

  function toggleSeason(season: number) {
    if (openSeason === season) {
      setOpenSeason(null);
      return;
    }
    setOpenSeason(season);
    loadSeason(season);
  }

  function toggleEpisode(ep: Episode, season: number) {
    const isWatched = watched.has(ep.imdbId);
    setWatched((prev) => {
      const next = new Set(prev);
      if (isWatched) next.delete(ep.imdbId);
      else next.add(ep.imdbId);
      return next;
    });

    mark.mutate(
      isWatched
        ? { seriesImdbId, episodeImdbId: ep.imdbId, watched: false }
        : {
            seriesImdbId,
            episodeImdbId: ep.imdbId,
            watched: true,
            season,
            episode: ep.episode ?? 0,
            title: ep.title || null,
            airDate: ep.airDate || null,
          }
    );
  }

  const seasonsList = Array.from({ length: seasonCount }, (_, i) => i + 1);

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground">Episodes</h4>
      <div className="space-y-1.5">
        {seasonsList.map((season) => {
          const state = seasons.get(season);
          const isOpen = openSeason === season;
          const episodes = state?.episodes ?? [];
          const watchedInSeason = episodes.filter((e) =>
            watched.has(e.imdbId),
          ).length;
          const totalInSeason = episodes.length;

          return (
            <div
              key={season}
              className="border border-border rounded-lg overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleSeason(season)}
                className="w-full flex items-center justify-between px-3 py-2 bg-card hover:bg-muted transition-colors cursor-pointer"
              >
                <span className="text-sm font-medium">Season {season}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {totalInSeason > 0 && (
                    <span>
                      {watchedInSeason}/{totalInSeason}
                    </span>
                  )}
                  {state?.loading && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </span>
              </button>
              {isOpen && (
                <div className="divide-y divide-border border-t border-border">
                  {state?.error && (
                    <p className="px-3 py-2 text-xs text-destructive">
                      {state.error}
                    </p>
                  )}
                  {!state?.loading &&
                    episodes.length === 0 &&
                    !state?.error && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">
                        No episodes found.
                      </p>
                    )}
                  {episodes.map((ep) => {
                    const isWatched = watched.has(ep.imdbId);
                    const rawPoster = posters.get(ep.imdbId);
                    const poster =
                      rawPoster && !brokenPosters.has(ep.imdbId)
                        ? rawPoster
                        : null;
                    const posterLoading = !posters.has(ep.imdbId);
                    return (
                      <button
                        key={ep.imdbId}
                        type="button"
                        onClick={() => toggleEpisode(ep, season)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted transition-colors cursor-pointer"
                      >
                        <span
                          className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            isWatched
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border"
                          }`}
                        >
                          {isWatched && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <div
                          className={`relative w-16 aspect-video rounded overflow-hidden bg-muted flex-shrink-0 transition-opacity ${
                            isWatched ? "opacity-60" : ""
                          }`}
                        >
                          {poster ? (
                            <img
                              src={poster}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                              onError={() =>
                                setBrokenPosters((prev) =>
                                  new Set(prev).add(ep.imdbId),
                                )
                              }
                            />
                          ) : posterLoading ? (
                            <div className="absolute inset-0 animate-pulse bg-muted-foreground/10" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Film className="w-4 h-4 text-muted-foreground/60" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-mono text-muted-foreground flex-shrink-0">
                              {ep.episode !== null
                                ? `E${String(ep.episode).padStart(2, "0")}`
                                : "—"}
                            </span>
                            <span
                              className={`text-sm truncate ${
                                isWatched
                                  ? "text-muted-foreground line-through"
                                  : ""
                              }`}
                            >
                              {ep.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            {ep.airDate && <span>{ep.airDate}</span>}
                            {ep.imdbRating && (
                              <span>IMDb {ep.imdbRating}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
