"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import {
  toggleNavItemVisibility,
  reorderNavItems,
} from "@/app/actions/nav";
import { toggleNetflixUI, toggleSiteName } from "@/app/actions/preferences";
import type { UserNavItem } from "@/db/schema";
import { ArrowLeft, GripVertical, Lock } from "lucide-react";
import { PushToggle } from "@/components/blocks/push-toggle";
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

export function SettingsClient({ navItems: serverNavItems, useNetflixUI, showSiteName: initialShowSiteName }: SettingsClientProps) {
  const [netflixUI, setNetflixUI] = useState(useNetflixUI);
  const [siteName, setSiteName] = useState(initialShowSiteName);
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
      await reorderNavItems(fd);
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
      await toggleNavItemVisibility(fd);
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
                  await toggleNetflixUI(fd);
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
                  await toggleSiteName(fd);
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
