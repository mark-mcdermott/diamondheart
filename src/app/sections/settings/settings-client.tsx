"use client";

import { useState } from "react";
import { Link } from "@/app/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errorMessage, keys, type NavItem, type Preferences, type UpdatePreferences } from "@/app/api";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseTargetField, type FoodTargets, type MacroKey } from "@/lib/targets";
import { MASS_UNITS } from "@/lib/units";
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

const headingStyle = { color: "var(--app-heading-color)" };

const TARGET_FIELDS: { key: MacroKey; label: string; unit: string; placeholder: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal", placeholder: "e.g. 2000" },
  { key: "protein", label: "Protein", unit: "g", placeholder: "e.g. 150" },
  { key: "carbs", label: "Carbs", unit: "g", placeholder: "e.g. 200" },
  { key: "fat", label: "Fat", unit: "g", placeholder: "e.g. 70" },
];

const EXPORTS = [
  { type: "metrics", label: "Metrics" },
  { type: "food", label: "Food" },
  { type: "meditation", label: "Meditation" },
  { type: "medical", label: "Medical" },
  { type: "workouts", label: "Workouts" },
  { type: "entertainment", label: "Entertainment" },
  { type: "tracking", label: "Tracking" },
  { type: "appointments", label: "Appointments" },
];

/** Visible items first, in their order, then the hidden ones — the server packs the same way. */
function packVisible(items: NavItem[]): NavItem[] {
  return [...items.filter((i) => i.visible), ...items.filter((i) => !i.visible)];
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2>Settings</h2>
          <p className="text-muted-foreground mt-1">Customize your experience</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Section({ title, children, className = "mb-8" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h3 className="text-lg font-semibold mb-4" style={headingStyle}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function ToggleRow({
  checked,
  onChange,
  disabled,
  title,
  description,
  className = "",
}: {
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  title: string;
  description: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer ${className}`}>
      <Checkbox checked={checked} onCheckedChange={onChange} disabled={disabled} className="mt-0.5" />
      <div>
        <span className="text-sm font-medium" style={headingStyle}>
          {title}
        </span>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </label>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading settings">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i}>
          <div className="h-5 w-40 rounded bg-muted animate-pulse mb-4" />
          <div className="h-16 rounded-lg border border-border bg-card animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function LoadFailed({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-6 text-center">
      <p className="text-sm font-medium" style={headingStyle}>
        Settings could not be loaded
      </p>
      <p className="text-xs text-muted-foreground mt-1">{errorMessage(error)}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export function SettingsClient() {
  const preferences = useQuery({ queryKey: keys.preferences, queryFn: api.preferences.get });
  const nav = useQuery({ queryKey: keys.nav, queryFn: api.nav.list });

  if (preferences.isPending || nav.isPending) {
    return (
      <Frame>
        <SettingsSkeleton />
      </Frame>
    );
  }
  if (preferences.isError || nav.isError) {
    return (
      <Frame>
        <LoadFailed
          error={preferences.error ?? nav.error}
          onRetry={() => {
            void preferences.refetch();
            void nav.refetch();
          }}
        />
      </Frame>
    );
  }

  return (
    <Frame>
      <SettingsForm preferences={preferences.data} navItems={nav.data} />
    </Frame>
  );
}

function SortableNavItem({ item, disabled, onToggle }: { item: NavItem; disabled: boolean; onToggle: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: item.locked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 px-4 py-3">
      {item.locked ? (
        <Lock className="w-4 h-4 text-muted-foreground" />
      ) : (
        <button {...attributes} {...listeners} className="text-muted-foreground cursor-grab active:cursor-grabbing touch-none">
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      {item.locked ? (
        <Checkbox checked disabled className="opacity-50" aria-label={`${item.label} is always shown`} />
      ) : (
        <Checkbox
          checked={item.visible}
          onCheckedChange={() => onToggle(item.id)}
          disabled={disabled}
          aria-label={`Toggle ${item.label}`}
        />
      )}

      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-medium ${!item.visible ? "text-muted-foreground" : ""}`}
          style={item.visible ? headingStyle : undefined}
        >
          {item.label}
        </span>
        {item.itemType === "metric_category" && <span className="text-xs text-muted-foreground ml-2">(metric section)</span>}
        {item.itemType === "tracking_section" && <span className="text-xs text-muted-foreground ml-2">(tracking)</span>}
      </div>

      <span className="text-xs text-muted-foreground">{item.href}</span>
    </div>
  );
}

type NavChange = { type: "visible"; id: string; visible: boolean } | { type: "order"; ids: string[] };

function SettingsForm({ preferences, navItems }: { preferences: Preferences; navItems: NavItem[] }) {
  const queryClient = useQueryClient();

  // Kept as strings: an empty field means "no target", which a number cannot express.
  const [targetFields, setTargetFields] = useState<Record<MacroKey, string>>({
    calories: preferences.targets.calories?.toString() ?? "",
    protein: preferences.targets.protein?.toString() ?? "",
    carbs: preferences.targets.carbs?.toString() ?? "",
    fat: preferences.targets.fat?.toString() ?? "",
  });

  /**
   * Every preference write is one partial PATCH. The cache is patched first so
   * the control flips at once, and put back if the server disagrees.
   */
  const savePreferences = useMutation({
    mutationFn: api.preferences.update,
    onMutate: async (patch: UpdatePreferences) => {
      await queryClient.cancelQueries({ queryKey: keys.preferences });
      const previous = queryClient.getQueryData<Preferences>(keys.preferences);
      if (previous) {
        queryClient.setQueryData<Preferences>(keys.preferences, {
          ...previous,
          ...patch,
          targets: { ...previous.targets, ...(patch.targets ?? {}) } as FoodTargets,
        });
      }
      return { previous };
    },
    onError: (error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(keys.preferences, context.previous);
      toast.error(errorMessage(error));
    },
    onSuccess: (saved) => queryClient.setQueryData(keys.preferences, saved),
  });

  const saveNav = useMutation({
    mutationFn: (change: NavChange) =>
      change.type === "visible" ? api.nav.setVisible(change.id, change.visible) : api.nav.reorder(change.ids),
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: keys.nav });
      const previous = queryClient.getQueryData<NavItem[]>(keys.nav) ?? [];
      const next =
        change.type === "visible"
          ? packVisible(previous.map((i) => (i.id === change.id ? { ...i, visible: change.visible } : i)))
          : change.ids.flatMap((id) => previous.find((i) => i.id === id) ?? []);
      queryClient.setQueryData(keys.nav, next);
      return { previous };
    },
    onError: (error, _change, context) => {
      if (context?.previous) queryClient.setQueryData(keys.nav, context.previous);
      toast.error(errorMessage(error));
    },
    onSuccess: (items) => queryClient.setQueryData(keys.nav, items),
  });

  const busy = savePreferences.isPending || saveNav.isPending;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ordered = packVisible(navItems);

  function handleNavDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeItem = ordered.find((i) => i.id === active.id);
    if (activeItem?.locked) return;

    const oldIndex = ordered.findIndex((i) => i.id === active.id);
    const newIndex = ordered.findIndex((i) => i.id === over.id);
    if (ordered[newIndex]?.locked && newIndex === 0) return;

    const reordered = arrayMove(ordered, oldIndex, newIndex);
    // The locked Dashboard item stays first.
    if (reordered.findIndex((i) => i.locked) > 0) return;

    saveNav.mutate({ type: "order", ids: reordered.map((i) => i.id) });
  }

  function handleNavToggle(itemId: string) {
    const item = navItems.find((i) => i.id === itemId);
    if (!item || item.locked) return;
    saveNav.mutate({ type: "visible", id: itemId, visible: !item.visible });
  }

  function saveTargets() {
    const targets: Partial<FoodTargets> = {};
    for (const field of TARGET_FIELDS) {
      const value = parseTargetField(targetFields[field.key]);
      if (value === "invalid") {
        toast.error(`${field.label} target must be a positive number, or left blank.`);
        return;
      }
      targets[field.key] = value;
    }
    // A Save button needs an acknowledgement; silence reads as failure.
    savePreferences.mutate({ targets }, { onSuccess: () => toast.success("Daily targets saved") });
  }

  return (
    <>
      <Section title="Entertainment">
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <ToggleRow
            checked={preferences.useNetflixUI}
            onChange={() => savePreferences.mutate({ useNetflixUI: !preferences.useNetflixUI })}
            disabled={busy}
            title="Use Netflix-style entertainment UI"
            description="Show movies and TV shows with cover art in a Netflix-style grid instead of a simple list"
          />
        </div>
      </Section>

      <Section title="Community">
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          <ToggleRow
            className="px-4 py-3"
            checked={preferences.showMeditationInFeed}
            onChange={() => savePreferences.mutate({ showMeditationInFeed: !preferences.showMeditationInFeed })}
            disabled={busy}
            title="Share my meditations in the community feed"
            description="When on, your completed sessions show up on the Community page so other members can see you meditated. Uncheck to hide."
          />
          <ToggleRow
            className="px-4 py-3"
            checked={preferences.showNameWhenMeditating}
            onChange={() => savePreferences.mutate({ showNameWhenMeditating: !preferences.showNameWhenMeditating })}
            disabled={busy}
            title="Show my name while I’m meditating"
            description={
              <>
                When on, your name and avatar appear in the &ldquo;meditating now&rdquo; row while your timer is running.
                Turn off to appear anonymously &mdash; you&rsquo;re still counted, just unnamed.
              </>
            }
          />
        </div>
      </Section>

      <Section title="Navbar Appearance">
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <ToggleRow
            checked={preferences.showSiteName}
            onChange={() => savePreferences.mutate({ showSiteName: !preferences.showSiteName })}
            disabled={busy}
            title="Show site name in navbar"
            description={<>Uncheck to show only the logo icon without the &ldquo;Diamondheart&rdquo; text</>}
          />
        </div>
      </Section>

      <Section title="Units">
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-sm font-medium" style={headingStyle}>
                Weight
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Changes how weights are shown and entered. Existing readings are converted, not rewritten.
              </p>
            </div>
            <div className="flex gap-1 bg-muted rounded-lg p-1 shrink-0">
              {MASS_UNITS.map((unit) => (
                <button
                  key={unit}
                  type="button"
                  aria-pressed={preferences.weightUnit === unit}
                  disabled={busy}
                  onClick={() => {
                    if (preferences.weightUnit !== unit) savePreferences.mutate({ weightUnit: unit });
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    preferences.weightUnit === unit
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
      </Section>

      <Section title="Daily targets">
        <div className="bg-card border border-border rounded-lg px-4 py-4">
          <p className="text-xs text-muted-foreground mb-4">
            The Food page reads each day against these. Leave a field blank to track that number without a target.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TARGET_FIELDS.map((f) => (
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
            <Button size="sm" disabled={busy} onClick={saveTargets}>
              {savePreferences.isPending ? "Saving..." : "Save targets"}
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Notifications" className="mb-10">
        <div className="bg-card border border-border rounded-lg px-4">
          <PushToggle />
        </div>
      </Section>

      <Section title="Export Data" className="mb-10">
        <p className="text-sm text-muted-foreground mb-4">Download your data as CSV files.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {EXPORTS.map((item) => (
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
      </Section>

      <Section title="Dashboard" className="mb-10">
        <p className="text-sm text-muted-foreground mb-4">Choose which sections appear on your dashboard and drag to reorder.</p>
        <DashboardSections
          sections={preferences.dashboardSections}
          disabled={busy}
          onChange={(next) => savePreferences.mutate({ dashboardSections: next })}
        />
      </Section>

      <Section title="Navbar" className="">
        <p className="text-sm text-muted-foreground mb-4">
          Choose which items appear in your navigation bar and drag to reorder them. Checked items appear in the nav.
          Uncheck to hide.
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleNavDragEnd}>
          <SortableContext items={ordered.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {ordered.map((item) => (
                <SortableNavItem key={item.id} item={item} disabled={busy} onToggle={handleNavToggle} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </Section>
    </>
  );
}
