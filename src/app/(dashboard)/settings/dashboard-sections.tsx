"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { updateDashboardSections, DASHBOARD_SECTIONS } from "@/app/actions/preferences";
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
import { GripVertical } from "lucide-react";

interface DashboardSectionsProps {
  activeSections: string[];
}

function SortableSection({
  sectionKey,
  label,
  checked,
  onToggle,
  isPending,
}: {
  sectionKey: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
  isPending: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sectionKey });

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
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        disabled={isPending}
      />
      <span
        className={`text-sm font-medium ${!checked ? "text-muted-foreground" : ""}`}
        style={checked ? { color: "var(--app-heading-color)" } : undefined}
      >
        {label}
      </span>
    </div>
  );
}

export function DashboardSections({ activeSections: initial }: DashboardSectionsProps) {
  const [isPending, startTransition] = useTransition();
  const [sections, setSections] = useState(initial);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // All section keys — active ones in order, then inactive
  const allKeys = [
    ...sections,
    ...DASHBOARD_SECTIONS.filter((s) => !sections.includes(s.key)).map((s) => s.key),
  ];

  function save(newSections: string[]) {
    setSections(newSections);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("sections", JSON.stringify(newSections));
      await updateDashboardSections(fd);
    });
  }

  function handleToggle(key: string) {
    if (sections.includes(key)) {
      save(sections.filter((s) => s !== key));
    } else {
      save([...sections, key]);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = allKeys.indexOf(active.id as string);
    const newIndex = allKeys.indexOf(over.id as string);
    const reordered = arrayMove(allKeys, oldIndex, newIndex);

    // Only save the checked ones in order
    save(reordered.filter((k) => sections.includes(k) || k === active.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={allKeys} strategy={verticalListSortingStrategy}>
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {allKeys.map((key) => {
            const section = DASHBOARD_SECTIONS.find((s) => s.key === key);
            if (!section) return null;
            return (
              <SortableSection
                key={key}
                sectionKey={key}
                label={section.label}
                checked={sections.includes(key)}
                onToggle={() => handleToggle(key)}
                isPending={isPending}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
