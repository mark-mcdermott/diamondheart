import { useState } from "react";
import { Link } from "@/app/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errorMessage, keys, type Category, type Metric, type Overview } from "@/app/api";
import { VALUE_TYPES } from "@/lib/metric-types";
import { goalLabel } from "@/lib/metric-display";
import { DEFAULT_MASS_UNIT, displayUnitFor, type MassUnit } from "@/lib/units";
import { TRACKING_SECTIONS } from "@/lib/nav-utils";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
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

const headingStyle = { color: "var(--app-heading-color)" };

const SECTION_ICONS: Record<string, typeof Brain> = {
  meditate: Brain,
  food: UtensilsCrossed,
  tracking: Package,
  medical: Stethoscope,
  appointments: Calendar,
  entertainment: Tv,
  workout: Dumbbell,
};

function Frame({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h2>Metrics</h2>
          <p className="text-muted-foreground mt-1">Manage your tracking metrics</p>
        </div>
        {actions && <div className="flex w-full gap-2 sm:w-auto">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading metrics">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-lg border border-border bg-card animate-pulse" />
        ))}
      </div>
      <div className="h-40 rounded-lg border border-border bg-card animate-pulse" />
    </div>
  );
}

function LoadFailed({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-6 text-center">
      <p className="text-sm font-medium" style={headingStyle}>
        Metrics could not be loaded
      </p>
      <p className="text-xs text-muted-foreground mt-1">{errorMessage(error)}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export function MetricsClient() {
  const overview = useQuery({ queryKey: keys.metricsOverview, queryFn: api.metrics.overview });

  if (overview.isPending) {
    return (
      <Frame>
        <MetricsSkeleton />
      </Frame>
    );
  }
  if (overview.isError) {
    return (
      <Frame>
        <LoadFailed error={overview.error} onRetry={() => void overview.refetch()} />
      </Frame>
    );
  }
  return <MetricsPage data={overview.data} />;
}

function SortableMetricRow({
  metric,
  weightUnit,
  disabled,
  onToggleHidden,
  onDelete,
}: {
  metric: Metric;
  weightUnit: MassUnit;
  disabled: boolean;
  onToggleHidden: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: metric.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-4 px-4 py-3">
      <button {...attributes} {...listeners} className="text-muted-foreground cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="w-4 h-4" />
      </button>

      <button
        onClick={() => onToggleHidden(metric.id)}
        className="text-primary hover:text-accent cursor-pointer"
        title={metric.hidden ? "Show metric" : "Hide metric"}
      >
        {metric.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>

      <div className="flex-1 min-w-0">
        <Link href={`/metrics/${metric.id}`} className="text-sm font-medium hover:underline" style={headingStyle}>
          {metric.name}
        </Link>
        <p className="text-xs text-muted-foreground">
          {metric.valueType}
          {displayUnitFor(metric.unit, weightUnit) ? ` (${displayUnitFor(metric.unit, weightUnit)})` : ""} &middot; {goalLabel(metric, weightUnit)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <ButtonLink variant="ghost" size="sm" href={`/metrics/${metric.id}/edit`}>
          <Pencil className="w-4 h-4" />
        </ButtonLink>
        <Button variant="ghost" size="sm" onClick={() => onDelete(metric.id)} disabled={disabled}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function CategoryHeader({
  category,
  isInNav,
  disabled,
  onRename,
  onDelete,
  onToggleNav,
}: {
  category: Category;
  isInNav: boolean;
  disabled: boolean;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onToggleNav: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);

  function handleSave() {
    if (editName.trim() && editName.trim() !== category.name) onRename(category.id, editName.trim());
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
          <Button variant="ghost" size="sm" onClick={handleSave} disabled={disabled}>
            <Check className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <>
          <h3 className="text-lg font-semibold" style={headingStyle}>
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
            <Button variant="ghost" size="sm" onClick={() => onDelete(category.id)} disabled={disabled} className="h-7 w-7 p-0">
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          )}
          <div className="flex-1" />
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <Checkbox checked={isInNav} onCheckedChange={() => onToggleNav(category.id)} disabled={disabled} />
            Show in nav
          </label>
        </>
      )}
    </div>
  );
}

function MetricsPage({ data }: { data: Overview }) {
  const queryClient = useQueryClient();
  // The list labels mass metrics in the viewer's unit; until the preference loads, the default one.
  const preferences = useQuery({ queryKey: keys.preferences, queryFn: api.preferences.get });
  const weightUnit = preferences.data?.weightUnit ?? DEFAULT_MASS_UNIT;
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("none");
  const [newUnit, setNewUnit] = useState("");
  const [newGoal, setNewGoal] = useState("1");
  const [newCategoryName, setNewCategoryName] = useState("");

  const patchOverview = (update: (current: Overview) => Overview) =>
    queryClient.setQueryData<Overview>(keys.metricsOverview, (current) => (current ? update(current) : current));

  /** Optimistic edits share one shape: patch the cache, keep the previous copy, restore it on failure. */
  const optimistic = {
    onMutate: async (update: (current: Overview) => Overview) => {
      await queryClient.cancelQueries({ queryKey: keys.metricsOverview });
      const previous = queryClient.getQueryData<Overview>(keys.metricsOverview);
      patchOverview(update);
      return { previous };
    },
    onError: (error: unknown, _vars: unknown, context: { previous?: Overview } | undefined) => {
      if (context?.previous) queryClient.setQueryData(keys.metricsOverview, context.previous);
      toast.error(errorMessage(error));
    },
  };

  const reorder = useMutation({
    mutationFn: (ids: string[]) => api.metrics.reorder(ids),
    onMutate: (ids) =>
      optimistic.onMutate((c) => ({ ...c, metrics: ids.flatMap((id) => c.metrics.find((m) => m.id === id) ?? []) })),
    onError: optimistic.onError,
    onSuccess: (metrics) => patchOverview((c) => ({ ...c, metrics })),
  });

  const setHidden = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) => api.metrics.update(id, { hidden }),
    onMutate: ({ id, hidden }) =>
      optimistic.onMutate((c) => ({ ...c, metrics: c.metrics.map((m) => (m.id === id ? { ...m, hidden } : m)) })),
    onError: optimistic.onError,
    onSuccess: (metric) => patchOverview((c) => ({ ...c, metrics: c.metrics.map((m) => (m.id === metric.id ? metric : m)) })),
  });

  const removeMetric = useMutation({
    mutationFn: (id: string) => api.metrics.remove(id),
    onMutate: (id) => optimistic.onMutate((c) => ({ ...c, metrics: c.metrics.filter((m) => m.id !== id) })),
    onError: optimistic.onError,
  });

  const addMetric = useMutation({
    mutationFn: api.metrics.create,
    onSuccess: (metric) => {
      patchOverview((c) => ({ ...c, metrics: [...c.metrics, metric] }));
      setNewName("");
      setNewType("none");
      setNewUnit("");
      setNewGoal("1");
      setShowAddForm(false);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const createCategory = useMutation({
    mutationFn: api.categories.create,
    onSuccess: (category) => {
      patchOverview((c) => ({ ...c, categories: [...c.categories, category], categoryNavStatus: { ...c.categoryNavStatus, [category.id]: false } }));
      setNewCategoryName("");
      setShowAddCategory(false);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const renameCategory = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.categories.rename(id, name),
    onMutate: ({ id, name }) =>
      optimistic.onMutate((c) => ({ ...c, categories: c.categories.map((cat) => (cat.id === id ? { ...cat, name } : cat)) })),
    onError: optimistic.onError,
    onSuccess: (category) => {
      patchOverview((c) => ({ ...c, categories: c.categories.map((cat) => (cat.id === category.id ? category : cat)) }));
      void queryClient.invalidateQueries({ queryKey: keys.nav });
    },
  });

  const removeCategory = useMutation({
    mutationFn: (id: string) => api.categories.remove(id),
    onError: (error) => toast.error(errorMessage(error)),
    // Its metrics move to the default category and its nav item goes; the server knows the result.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.metricsOverview });
      void queryClient.invalidateQueries({ queryKey: keys.nav });
    },
  });

  const setCategoryInNav = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) => api.nav.setCategory(id, visible),
    onMutate: ({ id, visible }) =>
      optimistic.onMutate((c) => ({ ...c, categoryNavStatus: { ...c.categoryNavStatus, [id]: visible } })),
    onError: optimistic.onError,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.nav }),
  });

  const setSectionInNav = useMutation({
    mutationFn: ({ key, visible }: { key: string; visible: boolean }) => api.nav.setSection(key, visible),
    onMutate: ({ key, visible }) => optimistic.onMutate((c) => ({ ...c, sectionStatus: { ...c.sectionStatus, [key]: visible } })),
    onError: optimistic.onError,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.nav }),
  });

  const busy = [reorder, setHidden, removeMetric, addMetric, createCategory, renameCategory, removeCategory, setCategoryInNav, setSectionInNav].some(
    (m) => m.isPending
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { categories, metrics, categoryNavStatus, sectionStatus, sectionSummaries } = data;

  const grouped = new Map<string, Metric[]>(categories.map((c) => [c.id, []]));
  for (const metric of metrics) {
    const list = grouped.get(metric.categoryId) ?? grouped.get(categories[0]?.id ?? "");
    list?.push(metric);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = metrics.findIndex((m) => m.id === active.id);
    const newIndex = metrics.findIndex((m) => m.id === over.id);
    reorder.mutate(arrayMove(metrics, oldIndex, newIndex).map((m) => m.id));
  }

  function handleAdd() {
    const dailyGoal = Number.parseInt(newGoal, 10);
    addMetric.mutate({
      name: newName.trim(),
      valueType: newType,
      unit: newUnit.trim() || null,
      dailyGoal: Number.isInteger(dailyGoal) ? dailyGoal : 1,
    });
  }

  const actions = (
    <>
      <Button variant="secondary" onClick={() => setShowAddCategory(!showAddCategory)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Section
      </Button>
      <Button onClick={() => setShowAddForm(!showAddForm)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Metric
      </Button>
    </>
  );

  return (
    <Frame actions={actions}>
      {showAddCategory && (
        <div className="border border-border rounded-lg p-4 mb-6 flex items-center gap-3">
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Section name (e.g. Nutrition)"
            className="max-w-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && newCategoryName.trim()) createCategory.mutate(newCategoryName.trim());
              if (e.key === "Escape") setShowAddCategory(false);
            }}
          />
          <Button onClick={() => createCategory.mutate(newCategoryName.trim())} disabled={!newCategoryName.trim() || busy} size="sm">
            {createCategory.isPending ? "Saving..." : "Create"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowAddCategory(false)}>
            Cancel
          </Button>
        </div>
      )}

      {showAddForm && (
        <div className="border border-border rounded-lg p-6 mb-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Water intake" />
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
              <label className="block text-sm font-medium mb-1">Unit (optional)</label>
              <Input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="e.g. glasses, min, kg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Daily Goal</label>
              <Input type="number" min={1} value={newGoal} onChange={(e) => setNewGoal(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleAdd} disabled={!newName.trim() || busy}>
              {addMetric.isPending ? "Saving..." : "Save Metric"}
            </Button>
            <Button variant="secondary" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <section className="mb-10">
        <h3 className="text-lg font-semibold mb-4" style={headingStyle}>
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
              onToggle={() => setSectionInNav.mutate({ key: section.key, visible: !(sectionStatus[section.key] ?? true) })}
              isPending={busy}
            />
          ))}
        </div>
      </section>

      {metrics.length === 0 ? (
        <EmptyState showIllustration title="No metrics yet" description="Add your first metric to start tracking your wellness journey." />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={metrics.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-8">
              {categories.map((category) => {
                const categoryMetrics = grouped.get(category.id) ?? [];
                if (categoryMetrics.length === 0) return null;
                return (
                  <div key={category.id} id={category.slug}>
                    <CategoryHeader
                      category={category}
                      isInNav={categoryNavStatus[category.id] ?? false}
                      disabled={busy}
                      onRename={(id, name) => renameCategory.mutate({ id, name })}
                      onDelete={(id) => removeCategory.mutate(id)}
                      onToggleNav={(id) => setCategoryInNav.mutate({ id, visible: !(categoryNavStatus[id] ?? false) })}
                    />
                    <div className="bg-card border border-border rounded-lg divide-y divide-border">
                      {categoryMetrics.map((metric) => (
                        <SortableMetricRow
                          key={metric.id}
                          metric={metric}
                          weightUnit={weightUnit}
                          disabled={busy}
                          onToggleHidden={(id) => setHidden.mutate({ id, hidden: !metric.hidden })}
                          onDelete={(id) => removeMetric.mutate(id)}
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
    </Frame>
  );
}
