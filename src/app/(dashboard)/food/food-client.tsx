"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addFood, removeFood } from "@/app/actions/food";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Apple,
} from "lucide-react";

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

interface FoodClientProps {
  meals: Record<string, FoodItem[]>;
  totals: { calories: number; protein: number; carbs: number; fat: number };
}

const MEAL_TYPES = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
];

export function FoodClient({ meals, totals }: FoodClientProps) {
  const [isPending, startTransition] = useTransition();
  const [activeMeal, setActiveMeal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.foods || []);
      }
    } catch {
      // silent
    }
    setSearching(false);
  }, []);

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    // Debounce
    const timeout = setTimeout(() => doSearch(q), 300);
    return () => clearTimeout(timeout);
  }

  function handleAddFood(food: SearchResult) {
    if (!activeMeal) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("mealType", activeMeal);
      fd.set("name", food.description);
      fd.set("fdcId", food.fdcId);
      fd.set("servingSize", String(food.servingSize));
      fd.set("servingUnit", food.servingUnit);
      fd.set("calories", String(food.calories));
      fd.set("protein", String(food.protein));
      fd.set("carbs", String(food.carbs));
      fd.set("fat", String(food.fat));
      fd.set("quantity", "1");
      await addFood(fd);
      setSearchQuery("");
      setSearchResults([]);
      setActiveMeal(null);
    });
  }

  function handleRemoveFood(itemId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("itemId", itemId);
      await removeFood(fd);
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2>Food Tracking</h2>
          <p className="text-muted-foreground mt-1">Log meals and track your macros</p>
        </div>
      </div>

      {/* Daily Totals */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: "Calories", value: totals.calories, unit: "kcal" },
          { label: "Protein", value: totals.protein, unit: "g" },
          { label: "Carbs", value: totals.carbs, unit: "g" },
          { label: "Fat", value: totals.fat, unit: "g" },
        ].map((item) => (
          <div
            key={item.label}
            className="border border-border rounded-lg p-4 text-center"
          >
            <p className="text-2xl font-semibold">{item.value}</p>
            <p className="text-xs text-muted-foreground">
              {item.label} ({item.unit})
            </p>
          </div>
        ))}
      </div>

      {/* Meals */}
      {MEAL_TYPES.map(({ key, label }) => (
        <section key={key} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveMeal(activeMeal === key ? null : key)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add
            </Button>
          </div>

          {/* Search panel */}
          {activeMeal === key && (
            <div className="border border-border rounded-lg p-4 mb-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search USDA foods..."
                  className="pl-9"
                  autoFocus
                />
              </div>
              {searching && (
                <p className="text-xs text-muted-foreground">Searching...</p>
              )}
              {searchResults.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {searchResults.map((food) => (
                    <button
                      key={food.fdcId}
                      onClick={() => handleAddFood(food)}
                      disabled={isPending}
                      className="w-full text-left px-3 py-2 rounded hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-sm font-medium truncate">{food.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {food.calories} cal &middot; {food.protein}p &middot; {food.carbs}c &middot; {food.fat}f
                        &middot; per {food.servingSize}{food.servingUnit}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Meal items */}
          {meals[key] && meals[key].length > 0 ? (
            <div className="border border-border rounded-lg divide-y divide-border">
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
    </div>
  );
}
