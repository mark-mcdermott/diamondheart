"use client";

import { useState, useTransition } from "react";
import { surfaceErrors } from "@/lib/action-result";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  toggleNavItemVisibility,
  reorderNavItems,
} from "@/app/actions/nav";
import { toggleNetflixUI, toggleSiteName, setWeightUnit, setFoodTargets } from "@/app/actions/preferences";
import { toast } from "sonner";
import { MACRO_KEYS, type FoodTargets, type MacroKey } from "@/lib/targets";
import { MASS_UNITS, type MassUnit } from "@/lib/units";
import { toggleMeditationFeedVisibility } from "@/app/actions/feed";
import { toggleShowNameWhenMeditating } from "@/app/actions/presence";
import type { UserNavItem } from "@/db/schema";
import { ArrowLeft, GripVertical, Lock, Download } from "lucide-react";
import { PushToggle } from "@/components/blocks/push-toggle";
import { DashboardSections } from "./dashboard-sections";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SettingsClientProps {
  navItems: UserNavItem[];
  useNetflixUI: boolean;
  showSiteName: boolean;
  showMeditationInFeed: boolean;
  weightUnit: MassUnit;
  targets: FoodTargets;
  showNameWhenMeditating: boolean;
  dashboardSections: string[];
}

function SortableNavItem({
  item,
  isPending,
  onToggle,
}: {
  item: UserNavItem;
  isPending: boolean;
  onToggle: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: item.locked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-3"
    >
      {item.locked ? (
        <Lock className="w-4 h-4 text-muted-foreground" />
      ) : (
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      {item.locked ? (
        <Checkbox checked disabled className="opacity-50" />
      ) : (
        <Checkbox
          checked={item.visible}
          onCheckedChange={() => onToggle(item.id)}
          disabled={isPending}
        />
      )}

      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-medium ${
            !item.visible ? "text-muted-foreground" : ""
          }`}
          style={item.visible ? { color: "var(--app-heading-color)" } : undefined}
        >
          {item.label}
        </span>
        {item.itemType === "metric_category" && (
          <span className="text-xs text-muted-foreground ml-2">(metric section)</span>
        )}
        {item.itemType === "tracking_section" && (
          <span className="text-xs text-muted-foreground ml-2">(tracking)</span>
        )}
      </div>

      <span className="text-xs text-muted-foreground">{item.href}</span>
    </div>
  );
}

export function SettingsClient({ navItems: serverNavItems, useNetflixUI, showSiteName: initialShowSiteName, showMeditationInFeed: initialShowInFeed, showNameWhenMeditating: initialShowName, weightUnit: initialWeightUnit, targets: initialTargets, dashboardSections }: SettingsClientProps) {
  const [netflixUI, setNetflixUI] = useState(useNetflixUI);
  const [massUnit, setMassUnit] = useState<MassUnit>(initialWeightUnit);
  // Kept as strings: an empty field means "no target", which a number cannot express.
  const [targetFields, setTargetFields] = useState<Record<MacroKey, string>>({
    calories: initialTargets.calories?.toString() ?? "",
    protein: initialTargets.protein?.toString() ?? "",
    carbs: initialTargets.carbs?.toString() ?? "",
    fat: initialTargets.fat?.toString() ?? "",
  });
  const [siteName, setSiteName] = useState(initialShowSiteName);
  const [showInFeed, setShowInFeed] = useState(initialShowInFeed);
  const [showName, setShowName] = useState(initialShowName);
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(serverNavItems);

  // Sync from server when props change
  if (serverNavItems !== items && serverNavItems.length !== items.length) {
    setItems(serverNavItems);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Split into checked (visible) and unchecked groups
  const checked = items.filter((i) => i.visible);
  const unchecked = items.filter((i) => !i.visible);
  const ordered = [...checked, ...unchecked];

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeItem = ordered.find((i) => i.id === active.id);
    if (activeItem?.locked) return;

    const oldIndex = ordered.findIndex((i) => i.id === active.id);
    const newIndex = ordered.findIndex((i) => i.id === over.id);

    // Don't allow dropping before a locked item
    const overItem = ordered[newIndex];
    if (overItem?.locked && newIndex === 0) return;

    const reordered = arrayMove(ordered, oldIndex, newIndex);

    // Ensure locked items stay at their position
    // Dashboard must stay at index 0
    const dashboardIdx = reordered.findIndex((i) => i.locked);
    if (dashboardIdx > 0) return; // Don't reorder if it would displace dashboard

    setItems(reordered);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("ids", JSON.stringify(reordered.map((i) => i.id)));
      await surfaceErrors(reorderNavItems(fd));
    });
  }

  function handleToggle(itemId: string) {
    // Optimistic update
    setItems((prev) => {
      const item = prev.find((i) => i.id === itemId);
      if (!item || item.locked) return prev;

      const newVisible = !item.visible;
      const updated = prev.map((i) =>
        i.id === itemId ? { ...i, visible: newVisible } : i
      );

      // Reorder: checked at top, unchecked at bottom
      const newChecked = updated.filter((i) => i.visible);
      const newUnchecked = updated.filter((i) => !i.visible);
      return [...newChecked, ...newUnchecked];
    });

    startTransition(async () => {
      const fd = new FormData();
      fd.set("itemId", itemId);
      await surfaceErrors(toggleNavItemVisibility(fd));
    });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2>Settings</h2>
          <p className="text-muted-foreground mt-1">
            Customize your experience
          </p>
        </div>
      </div>

      {/* Entertainment Section */}
      <section className="mb-8">
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: "var(--app-heading-color)" }}
        >
          Entertainment
        </h3>
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={netflixUI}
              onCheckedChange={() => {
                setNetflixUI((prev) => !prev);
                startTransition(async () => {
                  const fd = new FormData();
                  await surfaceErrors(toggleNetflixUI(fd));
                });
              }}
              className="mt-0.5"
            />
            <div>
              <span
                className="text-sm font-medium"
                style={{ color: "var(--app-heading-color)" }}
              >
                Use Netflix-style entertainment UI
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Show movies and TV shows with cover art in a Netflix-style grid
                instead of a simple list
              </p>
            </div>
          </label>
        </div>
      </section>

      {/* Community Section */}
      <section className="mb-8">
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: "var(--app-heading-color)" }}
        >
          Community
        </h3>
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          <label className="flex items-start gap-3 cursor-pointer px-4 py-3">
            <Checkbox
              checked={showInFeed}
              onCheckedChange={() => {
                setShowInFeed((prev) => !prev);
                startTransition(async () => {
                  const fd = new FormData();
                  await surfaceErrors(toggleMeditationFeedVisibility(fd));
                });
              }}
              className="mt-0.5"
            />
            <div>
              <span
                className="text-sm font-medium"
                style={{ color: "var(--app-heading-color)" }}
              >
                Share my meditations in the community feed
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                When on, your completed sessions show up on the Community page
                so other members can see you meditated. Uncheck to hide.
              </p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer px-4 py-3">
            <Checkbox
              checked={showName}
              onCheckedChange={() => {
                setShowName((prev) => !prev);
                startTransition(async () => {
                  const fd = new FormData();
                  await surfaceErrors(toggleShowNameWhenMeditating(fd));
                });
              }}
              className="mt-0.5"
            />
            <div>
              <span
                className="text-sm font-medium"
                style={{ color: "var(--app-heading-color)" }}
              >
                Show my name while I&rsquo;m meditating
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                When on, your name and avatar appear in the &ldquo;meditating
                now&rdquo; row while your timer is running. Turn off to appear
                anonymously &mdash; you&rsquo;re still counted, just unnamed.
              </p>
            </div>
          </label>
        </div>
      </section>

      {/* Navbar Appearance */}
      <section className="mb-8">
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: "var(--app-heading-color)" }}
        >
          Navbar Appearance
        </h3>
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={siteName}
              onCheckedChange={() => {
                setSiteName((prev) => !prev);
                startTransition(async () => {
                  const fd = new FormData();
                  await surfaceErrors(toggleSiteName(fd));
                });
              }}
              className="mt-0.5"
            />
            <div>
              <span
                className="text-sm font-medium"
                style={{ color: "var(--app-heading-color)" }}
              >
                Show site name in navbar
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Uncheck to show only the logo icon without the
                &ldquo;Diamondheart&rdquo; text
              </p>
            </div>
          </label>
        </div>
      </section>

      <section className="mb-8">
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: "var(--app-heading-color)" }}
        >
          Units
        </h3>
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span
                className="text-sm font-medium"
                style={{ color: "var(--app-heading-color)" }}
              >
                Weight
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Changes how weights are shown and entered. Existing readings are
                converted, not rewritten.
              </p>
            </div>
            <div className="flex gap-1 bg-muted rounded-lg p-1 shrink-0">
              {MASS_UNITS.map((unit) => (
                <button
                  key={unit}
                  type="button"
                  aria-pressed={massUnit === unit}
                  disabled={isPending}
                  onClick={() => {
                    if (massUnit === unit) return;
                    setMassUnit(unit);
                    startTransition(async () => {
                      const fd = new FormData();
                      fd.set("weightUnit", unit);
                      await surfaceErrors(setWeightUnit(fd));
                    });
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    massUnit === unit
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: "var(--app-heading-color)" }}
        >
          Daily targets
        </h3>
        <div className="bg-card border border-border rounded-lg px-4 py-4">
          <p className="text-xs text-muted-foreground mb-4">
            The Food page reads each day against these. Leave a field blank to
            track that number without a target.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                { key: "calories", label: "Calories", unit: "kcal", placeholder: "e.g. 2000" },
                { key: "protein", label: "Protein", unit: "g", placeholder: "e.g. 150" },
                { key: "carbs", label: "Carbs", unit: "g", placeholder: "e.g. 200" },
                { key: "fat", label: "Fat", unit: "g", placeholder: "e.g. 70" },
              ] as { key: MacroKey; label: string; unit: string; placeholder: string }[]
            ).map((f) => (
              <div key={f.key}>
                <Label htmlFor={`target-${f.key}`} className="text-xs">
                  {f.label} <span className="text-muted-foreground">({f.unit})</span>
                </Label>
                <Input
                  id={`target-${f.key}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  placeholder={f.placeholder}
                  value={targetFields[f.key]}
                  onChange={(e) => setTargetFields((t) => ({ ...t, [f.key]: e.target.value }))}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const fd = new FormData();
                  for (const key of MACRO_KEYS) fd.set(key, targetFields[key]);
                  const result = await surfaceErrors(setFoodTargets(fd));
                  // A Save button needs an acknowledgement; silence reads as failure.
                  if (result.success) toast.success("Daily targets saved");
                });
              }}
            >
              {isPending ? "Saving..." : "Save targets"}
            </Button>
          </div>
        </div>
      </section>

      {/* Notifications Section */}
      <section className="mb-10">
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: "var(--app-heading-color)" }}
        >
          Notifications
        </h3>
        <div className="bg-card border border-border rounded-lg px-4">
          <PushToggle />
        </div>
      </section>

      {/* Export Section */}
      <section className="mb-10">
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: "var(--app-heading-color)" }}
        >
          Export Data
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Download your data as CSV files.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { type: "metrics", label: "Metrics" },
            { type: "food", label: "Food" },
            { type: "meditation", label: "Meditation" },
            { type: "medical", label: "Medical" },
            { type: "workouts", label: "Workouts" },
            { type: "entertainment", label: "Entertainment" },
            { type: "tracking", label: "Tracking" },
            { type: "appointments", label: "Appointments" },
          ].map((item) => (
            <a
              key={item.type}
              href={`/api/export?type=${item.type}`}
              download
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card border border-border rounded-lg hover:bg-muted transition-colors no-underline text-foreground"
            >
              <Download className="w-4 h-4 text-primary" />
              {item.label}
            </a>
          ))}
        </div>
      </section>

      {/* Dashboard Section */}
      <section className="mb-10">
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: "var(--app-heading-color)" }}
        >
          Dashboard
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose which sections appear on your dashboard and drag to reorder.
        </p>
        <DashboardSections activeSections={dashboardSections} />
      </section>

      {/* Navbar Section */}
      <section>
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: "var(--app-heading-color)" }}
        >
          Navbar
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose which items appear in your navigation bar and drag to reorder
          them. Checked items appear in the nav. Uncheck to hide.
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={ordered.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {ordered.map((item) => (
                <SortableNavItem
                  key={item.id}
                  item={item}
                  isPending={isPending}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>
    </div>
  );
}
