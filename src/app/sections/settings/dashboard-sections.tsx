"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { DASHBOARD_SECTIONS } from "@/lib/config/dashboard-sections";
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
  /** The visible sections, in order. */
  sections: string[];
  disabled: boolean;
  /** Called with the next visible-and-ordered list whenever it changes. */
  onChange: (next: string[]) => void;
}

function SortableSection({
  sectionKey,
  label,
  checked,
  onToggle,
  disabled,
}: {
  sectionKey: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sectionKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 px-4 py-3">
      <button {...attributes} {...listeners} className="text-muted-foreground cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="w-4 h-4" />
      </button>
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        disabled={disabled}
        aria-label={`Show ${label} on the dashboard`}
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

export function DashboardSections({ sections: initial, disabled, onChange }: DashboardSectionsProps) {
  // Local for the drag interaction; the parent owns what is saved.
  const [sections, setSections] = useState(initial);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Active sections in order, then the inactive ones.
  const allKeys = [
    ...sections,
    ...DASHBOARD_SECTIONS.filter((s) => !sections.includes(s.key)).map((s) => s.key),
  ];

  function commit(next: string[]) {
    setSections(next);
    onChange(next);
  }

  function handleToggle(key: string) {
    commit(sections.includes(key) ? sections.filter((k) => k !== key) : [...sections, key]);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = allKeys.indexOf(String(active.id));
    const newIndex = allKeys.indexOf(String(over.id));
    const reordered = arrayMove(allKeys, oldIndex, newIndex);
    commit(reordered.filter((k) => sections.includes(k)));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                disabled={disabled}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
