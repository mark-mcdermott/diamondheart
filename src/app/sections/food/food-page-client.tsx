import { Link } from "@/app/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, errorMessage, keys } from "@/app/api";
import { Button } from "@/components/ui/button";
import { PageViewToggle } from "@/components/ui/view-toggle";
import { FoodClient } from "./food-client";

/**
 * The day view of the Food page, read through the API (docs/PORT-PLAN.md,
 * Phase 3): the day's log, the targets from preferences, and the favourites
 * and saved meals. `FoodClient` keeps the markup; it calls back here to refetch
 * after a write.
 */
export function FoodPageClient({ selectedDate }: { selectedDate: string }) {
  const queryClient = useQueryClient();
  const day = useQuery({ queryKey: keys.foodDay(selectedDate), queryFn: () => api.food.day(selectedDate) });
  const preferences = useQuery({ queryKey: keys.preferences, queryFn: api.preferences.get });
  const favorites = useQuery({ queryKey: keys.foodFavorites, queryFn: api.food.favorites });
  const meals = useQuery({ queryKey: keys.foodMeals, queryFn: api.food.meals });

  const queries = [day, preferences, favorites, meals];

  if (queries.some((q) => q.isPending)) {
    return (
      <div className="max-w-3xl mx-auto" aria-busy="true" aria-label="Loading food">
        <div className="mb-8">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground inline-block mb-4">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="h-3 w-16 rounded bg-muted animate-pulse mb-3" />
          <div className="h-9 w-72 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-[28px] border border-border/80 bg-card animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-lg border border-border bg-card animate-pulse" />
      </div>
    );
  }

  const failed = queries.find((q) => q.isError);
  if (failed) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground inline-block mb-4">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="rounded-lg border border-border bg-card px-4 py-6 text-center">
          <p className="text-sm font-medium" style={{ color: "var(--app-heading-color)" }}>
            Food could not be loaded
          </p>
          <p className="text-xs text-muted-foreground mt-1">{errorMessage(failed.error)}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => queries.forEach((q) => void q.refetch())}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const data = day.data!;
  const onChanged = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.foodDay(selectedDate) }),
      queryClient.invalidateQueries({ queryKey: keys.foodFavorites }),
      queryClient.invalidateQueries({ queryKey: keys.foodMeals }),
      queryClient.invalidateQueries({ queryKey: ["food", "totals"] }),
    ]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-end mb-2">
        <PageViewToggle defaultRange="day" />
      </div>
      <FoodClient
        onChanged={onChanged}
        meals={data.meals}
        totals={data.totals}
        targets={preferences.data!.targets}
        favoriteFoods={favorites.data!.map((f) => ({
          id: f.id,
          name: f.name,
          fdcId: f.fdcId,
          servingSize: f.servingSize,
          servingUnit: f.servingUnit,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
        }))}
        favoriteMeals={meals.data!.map((m) => ({ id: m.id, name: m.name }))}
        selectedDate={selectedDate}
      />
    </div>
  );
}
