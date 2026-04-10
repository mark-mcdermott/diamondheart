"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  addMetric,
  deleteMetric,
  toggleHidden,
  reorderMetrics,
} from "@/app/actions/tracker";
import {
  createCategory,
  renameCategory,
  deleteCategory,
} from "@/app/actions/categories";
import { toggleCategoryInNav, toggleTrackingSectionInNav } from "@/app/actions/nav";
import type { TrackerCategory, TrackerMetric } from "@/db/schema";
import { TRACKING_SECTIONS } from "@/lib/nav-utils";
import { TrackingSectionCard } from "./tracking-section-card";
import {
  ArrowLeft,
  Plus,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  GripVertical,
  Check,
  X,
  Brain,
  UtensilsCrossed,
  Package,
  Stethoscope,
  Calendar,
  Tv,
  Dumbbell,
} from "lucide-react";
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

const SECTION_ICONS: Record<string, typeof Brain> = {
  meditate: Brain,
  food: UtensilsCrossed,
  tracking: Package,
  medical: Stethoscope,
  appointments: Calendar,
  entertainment: Tv,
  workout: Dumbbell,
};

interface MetricsClientProps {
  categories: TrackerCategory[];
  metrics: TrackerMetric[];
  categoryNavStatus: Record<string, boolean>;
  sectionStatus: Record<string, boolean>;
  sectionSummaries: Record<string, string>;
}

const VALUE_TYPES = [
  { value: "none", label: "None (just log it)" },
  { value: "int", label: "Integer" },
  { value: "float", label: "Decimal" },
  { value: "text", label: "Text" },
  { value: "bool", label: "Yes/No" },
];

function SortableMetricRow({
  metric,
  isPending,
  onToggleHidden,
  onDelete,
}: {
  metric: TrackerMetric;
  isPending: boolean;
  onToggleHidden: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: metric.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 px-4 py-3"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <button
        onClick={() => onToggleHidden(metric.id)}
        className="text-primary hover:text-accent cursor-pointer"
        title={metric.hidden ? "Show metric" : "Hide metric"}
      >
        {metric.hidden ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <Link
          href={`/metrics/${metric.id}`}
          className="text-sm font-medium hover:underline"
          style={{ color: "var(--app-heading-color)" }}
        >
          {metric.name}
        </Link>
        <p className="text-xs text-muted-foreground">
          {metric.valueType}
          {metric.unit ? ` (${metric.unit})` : ""} &middot; Goal:{" "}
          {metric.dailyGoal ?? 1}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/metrics/${metric.id}/edit`}>
            <Pencil className="w-4 h-4" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(metric.id)}
          disabled={isPending}
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function CategoryHeader({
  category,
  isInNav,
  isPending,
  onRename,
  onDelete,
  onToggleNav,
}: {
  category: TrackerCategory;
  isInNav: boolean;
  isPending: boolean;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onToggleNav: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);

  function handleSave() {
    if (editName.trim() && editName.trim() !== category.name) {
      onRename(category.id, editName.trim());
    }
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-3 mb-2">
      {editing ? (
        <div className="flex items-center gap-2 flex-1">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-8 text-sm max-w-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <Button variant="ghost" size="sm" onClick={handleSave} disabled={isPending}>
            <Check className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <>
          <h3 className="text-lg font-semibold" style={{ color: "var(--app-heading-color)" }}>
            {category.name}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditName(category.name);
              setEditing(true);
            }}
            className="h-7 w-7 p-0"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          {category.slug !== "default" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(category.id)}
              disabled={isPending}
              className="h-7 w-7 p-0"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          )}
          <div className="flex-1" />
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <Checkbox
              checked={isInNav}
              onCheckedChange={() => onToggleNav(category.id)}
              disabled={isPending}
            />
            Show in nav
          </label>
        </>
      )}
    </div>
  );
}

export function MetricsClient({
  categories: serverCategories,
  metrics: serverMetrics,
  categoryNavStatus: serverNavStatus,
  sectionStatus: serverSectionStatus,
  sectionSummaries,
}: MetricsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("none");
  const [newUnit, setNewUnit] = useState("");
  const [newGoal, setNewGoal] = useState("1");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [metrics, setMetrics] = useState(serverMetrics);
  const [navStatus, setNavStatus] = useState(serverNavStatus);
  const [sectionStatus, setSectionStatus] = useState(serverSectionStatus);

  // Sync from server when props change
  if (serverMetrics !== metrics && serverMetrics.length !== metrics.length) {
    setMetrics(serverMetrics);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group metrics by category
  const categoryMap = new Map<string, TrackerCategory>();
  for (const cat of serverCategories) {
    categoryMap.set(cat.id, cat);
  }

  const grouped = new Map<string, TrackerMetric[]>();
  for (const cat of serverCategories) {
    grouped.set(cat.id, []);
  }
  for (const metric of metrics) {
    const list = grouped.get(metric.categoryId);
    if (list) {
      list.push(metric);
    } else {
      // Fallback: put in first category
      const first = serverCategories[0];
      if (first) grouped.get(first.id)?.push(metric);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = metrics.findIndex((m) => m.id === active.id);
    const newIndex = metrics.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(metrics, oldIndex, newIndex);
    setMetrics(reordered);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("ids", JSON.stringify(reordered.map((m) => m.id)));
      await reorderMetrics(fd);
    });
  }

  function handleAdd() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", newName);
      fd.set("valueType", newType);
      fd.set("unit", newUnit);
      fd.set("dailyGoal", newGoal);
      const result = await addMetric(fd);
      if (result.success) {
        setNewName("");
        setNewType("none");
        setNewUnit("");
        setNewGoal("1");
        setShowAddForm(false);
      }
    });
  }

  function handleDelete(metricId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("metricId", metricId);
      await deleteMetric(fd);
    });
  }

  function handleToggleHidden(metricId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("metricId", metricId);
      await toggleHidden(fd);
    });
  }

  function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", newCategoryName.trim());
      const result = await createCategory(fd);
      if (result.success) {
        setNewCategoryName("");
        setShowAddCategory(false);
      }
    });
  }

  function handleRenameCategory(categoryId: string, name: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("categoryId", categoryId);
      fd.set("name", name);
      await renameCategory(fd);
    });
  }

  function handleDeleteCategory(categoryId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("categoryId", categoryId);
      await deleteCategory(fd);
    });
  }

  function handleToggleNav(categoryId: string) {
    setNavStatus((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
    startTransition(async () => {
      const fd = new FormData();
      fd.set("categoryId", categoryId);
      await toggleCategoryInNav(fd);
    });
  }

  function handleToggleSection(sectionKey: string) {
    setSectionStatus((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
    const section = TRACKING_SECTIONS.find((s) => s.key === sectionKey);
    if (!section) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("sectionHref", section.href);
      await toggleTrackingSectionInNav(fd);
    });
  }

  // Build a flat list of all metric IDs for DnD (preserving order across categories)
  const allMetricIds = metrics.map((m) => m.id);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2>Metrics</h2>
          <p className="text-muted-foreground mt-1">
            Manage your tracking metrics
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowAddCategory(!showAddCategory)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Section
        </Button>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Metric
        </Button>
      </div>

      {/* Add Category Form */}
      {showAddCategory && (
        <div className="border border-border rounded-lg p-4 mb-6 flex items-center gap-3">
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Section name (e.g. Nutrition)"
            className="max-w-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateCategory();
              if (e.key === "Escape") setShowAddCategory(false);
            }}
          />
          <Button
            onClick={handleCreateCategory}
            disabled={!newCategoryName.trim() || isPending}
            size="sm"
          >
            {isPending ? "Saving..." : "Create"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAddCategory(false)}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Add Metric Form */}
      {showAddForm && (
        <div className="border border-border rounded-lg p-6 mb-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Water intake"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {VALUE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Unit (optional)
              </label>
              <Input
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="e.g. glasses, min, kg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Daily Goal
              </label>
              <Input
                type="number"
                min={1}
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleAdd} disabled={!newName || isPending}>
              {isPending ? "Saving..." : "Save Metric"}
            </Button>
            <Button variant="secondary" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Tracking Systems */}
      <section className="mb-10">
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: "var(--app-heading-color)" }}
        >
          Tracking Systems
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TRACKING_SECTIONS.map((section) => (
            <TrackingSectionCard
              key={section.key}
              title={section.label}
              description={section.description}
              href={section.href}
              icon={SECTION_ICONS[section.key] || Package}
              enabled={sectionStatus[section.key] ?? true}
              summaryLine={sectionSummaries[section.key] ?? ""}
              onToggle={() => handleToggleSection(section.key)}
              isPending={isPending}
            />
          ))}
        </div>
      </section>

      {/* Metrics grouped by category */}
      {metrics.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No metrics yet. Add your first metric to start tracking.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={allMetricIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-8">
              {serverCategories.map((category) => {
                const categoryMetrics = grouped.get(category.id) || [];
                if (categoryMetrics.length === 0) return null;

                return (
                  <div key={category.id} id={category.slug}>
                    <CategoryHeader
                      category={category}
                      isInNav={navStatus[category.id] ?? false}
                      isPending={isPending}
                      onRename={handleRenameCategory}
                      onDelete={handleDeleteCategory}
                      onToggleNav={handleToggleNav}
                    />
                    <div className="bg-card border border-border rounded-lg divide-y divide-border">
                      {categoryMetrics.map((metric) => (
                        <SortableMetricRow
                          key={metric.id}
                          metric={metric}
                          isPending={isPending}
                          onToggleHidden={handleToggleHidden}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
