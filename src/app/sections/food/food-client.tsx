"use client";

import { useState, useTransition, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import { toast } from "sonner";
import { api, errorMessage, apiFetch } from "@/app/api";
import { targetProgress, type FoodTargets, type MacroKey } from "@/lib/targets";
import { Link } from "@/app/link";
import { useRouter } from "@/app/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { DatePickerCalendar } from "@/components/ui/date-picker-calendar";
import { toISODate } from "@/lib/dates";
import { parseNumberField, parsePositiveNumberField } from "@/lib/numbers";
import type { MealType } from "@/server/api/_lib/schemas";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Apple,
  Flame,
  Beef,
  Wheat,
  Droplet,
  Star,
  StarOff,
  BookOpen,
  Save,
  PenLine,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";

interface StagedFood {
  name: string;
  fdcId?: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
}

interface SearchResult {
  fdcId: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
}

interface FavFood {
  id: string;
  name: string;
  fdcId: string | null;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FavMeal {
  id: string;
  name: string;
}

interface FoodClientProps {
  /** Refetches the day (and whatever else changed) after a write lands. */
  onChanged: () => Promise<unknown>;
  meals: Record<string, FoodItem[]>;
  totals: { calories: number; protein: number; carbs: number; fat: number };
  targets: FoodTargets;
  favoriteFoods: FavFood[];
  favoriteMeals: FavMeal[];
  selectedDate: string;
}

const MEAL_TYPES = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
];

const FoodChart = lazy(() => import("./food-chart").then((m) => ({ default: m.FoodChart })));

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function FoodClient({ onChanged, meals, totals, targets, favoriteFoods, favoriteMeals, selectedDate }: FoodClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeMeal, setActiveMeal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [savingMeal, setSavingMeal] = useState<string | null>(null);
  const [mealName, setMealName] = useState("");
  const [stagedFood, setStagedFood] = useState<StagedFood | null>(null);
  const [stagedQty, setStagedQty] = useState("1");
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCal, setCustomCal] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFat, setCustomFat] = useState("");
  const [customServing, setCustomServing] = useState("1");
  const [customUnit, setCustomUnit] = useState("serving");
  const searchRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [year, month, day] = selectedDate.split("-").map(Number);
  const viewDate = new Date(year, month - 1, day);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isToday = viewDate.getTime() === todayMidnight.getTime();
  const isFuture = viewDate > todayMidnight;
  const yesterdayMidnight = new Date(todayMidnight);
  yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1);
  const isYesterday = viewDate.getTime() === yesterdayMidnight.getTime();
  const dateLabel = isToday ? "Today" : isYesterday ? "Yesterday" : formatDate(viewDate).split(",")[0];

  function navDate(offset: number) {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + offset);
    router.push(`/food?date=${toISODate(d)}`);
  }

  function handleDatePick(dateISO: string) {
    setCalendarOpen(false);
    if (dateISO) router.push(`/food?date=${dateISO}`);
    else router.push("/food");
  }

  // Close search when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      // The custom-food dialog is a portal, so it lives outside searchRef and
      // every click inside it reads as an outside click. Clearing activeMeal
      // here is why "Add Food" silently did nothing: handleCreateCustom needs
      // a selected meal and the first mousedown in the dialog removed it.
      if (showCustom) return;

      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setActiveMeal(null);
        setSearchQuery("");
        setSearchResults([]);
        setSearchError(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showCustom]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    setSearching(true);
    try {
      const res = await apiFetch(`/api/food/search?q=${encodeURIComponent(q)}`);
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSearchResults(data.foods ?? []);
        setSearchError(null);
      } else {
        // Swallowing this used to render as "no matches", which is a different
        // thing entirely and left people retyping a search that could not work.
        setSearchResults([]);
        setSearchError(data.error ?? "Food search is unavailable right now.");
      }
    } catch {
      setSearchResults([]);
      setSearchError("Couldn't reach food search. Check your connection.");
    }
    setSearching(false);
  }, []);

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => doSearch(q), 300);
  }

  function stageSearchResult(food: SearchResult) {
    setStagedFood({
      name: food.description,
      fdcId: food.fdcId,
      servingSize: food.servingSize,
      servingUnit: food.servingUnit,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    });
    setStagedQty("1");
  }

  function stageFavoriteFood(fav: FavFood) {
    setStagedFood({
      name: fav.name,
      fdcId: fav.fdcId || undefined,
      servingSize: fav.servingSize,
      servingUnit: fav.servingUnit,
      calories: fav.calories,
      protein: fav.protein,
      carbs: fav.carbs,
      fat: fav.fat,
    });
    setStagedQty("1");
  }

  /** Runs a write, surfaces its failure, and refetches. Kept inside a transition so `isPending` still gates the buttons. */
  function write(work: () => Promise<unknown>, after?: () => void) {
    startTransition(async () => {
      try {
        await work();
        after?.();
      } catch (error) {
        toast.error(errorMessage(error));
      }
      await onChanged();
    });
  }

  function confirmStagedFood() {
    if (!activeMeal || !stagedFood) return;
    const meal = activeMeal as MealType;
    write(
      () =>
        api.food.log({
          mealType: meal,
          date: selectedDate,
          name: stagedFood.name,
          fdcId: stagedFood.fdcId || null,
          servingSize: stagedFood.servingSize,
          servingUnit: stagedFood.servingUnit,
          calories: stagedFood.calories,
          protein: stagedFood.protein,
          carbs: stagedFood.carbs,
          fat: stagedFood.fat,
          quantity: parsePositiveNumberField(stagedQty, 1),
        }),
      () => {
        setStagedFood(null);
        setSearchQuery("");
        setSearchResults([]);
        setActiveMeal(null);
      }
    );
  }

  function handleCreateCustom() {
    if (!activeMeal || !customName) return;
    const meal = activeMeal as MealType;
    const macros = {
      calories: parseNumberField(customCal, 0),
      protein: parseNumberField(customProtein, 0),
      carbs: parseNumberField(customCarbs, 0),
      fat: parseNumberField(customFat, 0),
      servingSize: parsePositiveNumberField(customServing, 1),
      servingUnit: customUnit || "serving",
    };
    write(
      async () => {
        // Save it as a custom food, then add it to the selected day's meal.
        await api.food.createCustom({ name: customName, ...macros });
        await api.food.log({ mealType: meal, date: selectedDate, name: customName, quantity: 1, ...macros });
      },
      () => {
        setShowCustom(false);
        setCustomName("");
        setCustomCal("");
        setCustomProtein("");
        setCustomCarbs("");
        setCustomFat("");
        setCustomServing("1");
        setCustomUnit("serving");
        setActiveMeal(null);
      }
    );
  }

  function handleRemoveFood(itemId: string) {
    write(() => api.food.removeItem(itemId));
  }

  function handleStarFood(food: SearchResult) {
    write(() =>
      api.food.favorite({
        name: food.description,
        fdcId: food.fdcId,
        servingSize: food.servingSize,
        servingUnit: food.servingUnit,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      })
    );
  }

  function handleUnstarFood(favId: string) {
    write(() => api.food.unfavorite(favId));
  }

  function handleSaveMeal(mealType: string) {
    if (!mealName.trim()) return;
    write(
      () => api.food.saveMeal({ name: mealName.trim(), mealType: mealType as MealType, date: selectedDate }),
      () => {
        setSavingMeal(null);
        setMealName("");
      }
    );
  }

  function handleLogFavMeal(mealId: string, mealType: string) {
    write(() => api.food.logMeal(mealId, { mealType: mealType as MealType, date: selectedDate }));
  }

  function handleDeleteFavMeal(mealId: string) {
    write(() => api.food.deleteMeal(mealId));
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground inline-block mb-4">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <p className="text-sm text-muted-foreground font-medium mb-1 tracking-wide uppercase" style={{ fontSize: "11px", letterSpacing: "0.08em" }}>
          {dateLabel}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navDate(-1)}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer -translate-y-[7px]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-3xl sm:text-4xl font-display leading-none" style={{ fontWeight: 500 }}>
            {formatDate(viewDate)}
          </h2>
          <button
            type="button"
            onClick={() => navDate(1)}
            disabled={isFuture || isToday}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent -translate-y-[7px]"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer ml-1 -translate-y-[7px]"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={8}>
              <DatePickerCalendar
                value={selectedDate}
                max={toISODate(todayMidnight)}
                onChange={handleDatePick}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Daily Totals */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {(
          [
            { key: "calories", label: "Calories", value: totals.calories, unit: "kcal", icon: Flame, color: "#C4653A" },
            { key: "protein", label: "Protein", value: totals.protein, unit: "g", icon: Beef, color: "#5B8C5A" },
            { key: "carbs", label: "Carbs", value: totals.carbs, unit: "g", icon: Wheat, color: "#D4964A" },
            { key: "fat", label: "Fat", value: totals.fat, unit: "g", icon: Droplet, color: "#C75B4A" },
          ] as { key: MacroKey; label: string; value: number; unit: string; icon: typeof Flame; color: string }[]
        ).map((item) => {
          // null until the user sets a target — the tile then reads exactly as it
          // did before targets existed, rather than inventing a goal.
          const progress = targetProgress(item.value, targets[item.key]);
          const target = targets[item.key];
          return (
            <div key={item.key} className="bg-card rounded-[28px] border border-border/80 px-4 py-7 text-center card-texture">
              <item.icon className="mx-auto mb-5 h-4 w-4" strokeWidth={1.8} style={{ color: item.color }} />
              <p
                data-testid={`total-${item.key}`}
                className="font-mono text-[2rem] font-semibold leading-none"
                style={{ color: progress?.over ? "var(--color-destructive)" : item.color }}
              >
                {item.value}
              </p>
              {progress && target !== null ? (
                <>
                  <p
                    data-testid={`target-${item.key}`}
                    className="mt-1 text-[11px] text-muted-foreground"
                  >
                    of {target} {item.unit}
                  </p>
                  <div className="mx-auto mt-3 h-1 w-3/4 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{
                        width: `${Math.min(progress.ratio, 1) * 100}%`,
                        backgroundColor: progress.over ? "var(--color-destructive)" : item.color,
                      }}
                    />
                  </div>
                </>
              ) : null}
              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
            </div>
          );
        })}
      </div>

      {/* Saved Meals */}
      {favoriteMeals.length > 0 && (
        <section className="mb-8">
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 cursor-pointer hover:text-foreground"
          >
            <BookOpen className="w-4 h-4" />
            Saved Meals ({favoriteMeals.length})
          </button>
          {showFavorites && (
            <div className="bg-card rounded-lg divide-y divide-border">
              {favoriteMeals.map((meal) => (
                <div key={meal.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium" style={{ color: "var(--app-heading-color)" }}>{meal.name}</span>
                  <div className="flex items-center gap-2">
                    {MEAL_TYPES.map((mt) => (
                      <Button
                        key={mt.key}
                        size="xs"
                        variant="secondary"
                        disabled={isPending}
                        onClick={() => handleLogFavMeal(meal.id, mt.key)}
                      >
                        + {mt.label}
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDeleteFavMeal(meal.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Meals */}
      {MEAL_TYPES.map(({ key, label }) => (
        <section key={key} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </h3>
            <div className="flex items-center gap-2">
              {meals[key] && meals[key].length > 0 && (
                <>
                  {savingMeal === key ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={mealName}
                        onChange={(e) => setMealName(e.target.value)}
                        placeholder="Meal name..."
                        className="w-36 h-8 text-xs"
                        autoFocus
                      />
                      <Button size="xs" onClick={() => handleSaveMeal(key)} disabled={!mealName.trim() || isPending}>
                        <Save className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button size="xs" variant="secondary" onClick={() => { setSavingMeal(null); setMealName(""); }}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => { setSavingMeal(key); setMealName(""); }}
                    >
                      <Star className="w-3.5 h-3.5 mr-1" />
                      Save Meal
                    </Button>
                  )}
                </>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setActiveMeal(activeMeal === key ? null : key)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Search panel */}
          {activeMeal === key && (
            <div ref={searchRef} className="bg-card rounded-lg p-4 mb-3 space-y-3">
              {/* Staged food — quantity picker */}
              {stagedFood ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium" style={{ color: "var(--app-heading-color)" }}>{stagedFood.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {stagedFood.calories} cal &middot; {stagedFood.protein}p &middot; {stagedFood.carbs}c &middot; {stagedFood.fat}f
                    &middot; per {stagedFood.servingSize} {stagedFood.servingUnit}
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={stagedQty}
                      onChange={(e) => setStagedQty(e.target.value)}
                      className="w-20"
                      autoFocus
                    />
                    <span className="text-sm text-muted-foreground">{stagedFood.servingUnit}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" data-testid="confirm-staged-food" onClick={confirmStagedFood} disabled={isPending}>Add</Button>
                    <Button size="sm" variant="secondary" onClick={() => setStagedFood(null)}>Back</Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Favorite foods quick-add */}
                  {favoriteFoods.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Favorites</p>
                      <div className="flex flex-wrap gap-2">
                        {favoriteFoods.map((fav) => (
                          <button
                            key={fav.id}
                            onClick={() => stageFavoriteFood(fav)}
                            disabled={isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <Star className="w-3 h-3 text-accent" />
                            {fav.name}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleUnstarFood(fav.id); }}
                              className="ml-1 text-muted-foreground hover:text-destructive cursor-pointer"
                            >
                              <StarOff className="w-3 h-3" />
                            </button>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search USDA foods..."
                        className="pl-9"
                        autoFocus
                      />
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => setShowCustom(true)}>
                      <PenLine className="w-3.5 h-3.5 mr-1" />
                      Custom
                    </Button>
                  </div>
                  {searching && (
                    <p className="text-xs text-muted-foreground">Searching...</p>
                  )}

                  {!searching && searchError && (
                    <p
                      data-testid="search-error"
                      className="text-xs text-destructive"
                      role="status"
                    >
                      {searchError}
                    </p>
                  )}
                  {searchResults.length > 0 && (
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {searchResults.map((food) => (
                        <div key={food.fdcId} className="flex items-center justify-between px-3 py-2 rounded hover:bg-muted/50 transition-colors">
                          <button
                            onClick={() => stageSearchResult(food)}
                            disabled={isPending}
                            className="flex-1 text-left cursor-pointer"
                          >
                            <p className="text-sm font-medium truncate">{food.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {food.calories} cal &middot; {food.protein}p &middot; {food.carbs}c &middot; {food.fat}f
                              &middot; per {food.servingSize}{food.servingUnit}
                            </p>
                          </button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleStarFood(food)}
                            disabled={isPending}
                            title="Add to favorites"
                          >
                            <Star className="w-3.5 h-3.5 text-accent" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Meal items */}
          {meals[key] && meals[key].length > 0 ? (
            <div className="bg-card rounded-lg divide-y divide-border">
              {meals[key].map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Apple className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.calories * item.quantity} cal &middot;{" "}
                        {item.protein * item.quantity}p &middot;{" "}
                        {item.carbs * item.quantity}c &middot;{" "}
                        {item.fat * item.quantity}f
                        {item.quantity > 1 && ` (x${item.quantity})`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFood(item.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-2">
              No items logged
            </div>
          )}
        </section>
      ))}

      {/* Charts — placed last as trend context */}
      <Suspense fallback={<div className="h-64 bg-card border border-border rounded-lg animate-pulse mt-8" />}>
        <div className="mt-8">
          <FoodChart totals={totals} />
        </div>
      </Suspense>

      {/* Custom Food Modal */}
      <Dialog open={showCustom} onOpenChange={setShowCustom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Food</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="custom-name">Name</Label>
              <Input id="custom-name" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Honeycomb Cereal" className="mt-1" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="custom-serving">Serving Size</Label>
                <Input id="custom-serving" type="number" step="0.5" value={customServing} onChange={(e) => setCustomServing(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="custom-unit">Unit</Label>
                <Input id="custom-unit" value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} placeholder="cup, slice, oz..." className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label htmlFor="custom-cal">Calories</Label>
                <Input id="custom-cal" type="number" step="0.1" value={customCal} onChange={(e) => setCustomCal(e.target.value)} placeholder="0" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="custom-protein">Protein</Label>
                <Input id="custom-protein" type="number" step="0.1" value={customProtein} onChange={(e) => setCustomProtein(e.target.value)} placeholder="0" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="custom-carbs">Carbs</Label>
                <Input id="custom-carbs" type="number" step="0.1" value={customCarbs} onChange={(e) => setCustomCarbs(e.target.value)} placeholder="0" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="custom-fat">Fat</Label>
                <Input id="custom-fat" type="number" step="0.1" value={customFat} onChange={(e) => setCustomFat(e.target.value)} placeholder="0" className="mt-1" />
              </div>
            </div>
            <div className="flex gap-3 pt-2 justify-end">
              <Button onClick={handleCreateCustom} disabled={!customName || isPending}>
                Add Food
              </Button>
              <Button variant="secondary" onClick={() => setShowCustom(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
