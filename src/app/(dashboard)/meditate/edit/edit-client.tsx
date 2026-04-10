"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addMeditationStyle,
  updateMeditationStyle,
  deleteMeditationStyle,
  addMeditationPreset,
  updateMeditationPreset,
  deleteMeditationPreset,
} from "@/app/actions/meditation";
import type { MeditationStyle, MeditationPreset } from "@/db/schema";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { ICON_MAP, LucideIconByName } from "../icon-map";

interface MeditateEditClientProps {
  styles: MeditationStyle[];
  presets: MeditationPreset[];
}

export function MeditateEditClient({ styles, presets }: MeditateEditClientProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState("");

  // Style form
  const [styleLabel, setStyleLabel] = useState("");
  const [styleIcon, setStyleIcon] = useState("brain");
  const [editingStyle, setEditingStyle] = useState<string | null>(null);
  const [editStyleLabel, setEditStyleLabel] = useState("");
  const [editStyleIcon, setEditStyleIcon] = useState("");

  // Preset form
  const [presetLabel, setPresetLabel] = useState("");
  const [presetMinutes, setPresetMinutes] = useState("");
  const [editingPreset, setEditingPreset] = useState<string | null>(null);
  const [editPresetLabel, setEditPresetLabel] = useState("");
  const [editPresetMinutes, setEditPresetMinutes] = useState("");

  function handleAddStyle() {
    if (!styleLabel.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("label", styleLabel);
      fd.set("iconName", styleIcon);
      await addMeditationStyle(fd);
      setStyleLabel("");
      setStyleIcon("brain");
    });
  }

  function handleUpdateStyle(styleId: string) {
    if (!editStyleLabel.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("styleId", styleId);
      fd.set("label", editStyleLabel);
      fd.set("iconName", editStyleIcon);
      await updateMeditationStyle(fd);
      setEditingStyle(null);
    });
  }

  function handleDeleteStyle(styleId: string) {
    if (styles.length <= 1) {
      setDeleteError("There must always be at least one style and timer preset. To delete this one, please add another first.");
      return;
    }
    setDeleteError("");
    startTransition(async () => {
      const fd = new FormData();
      fd.set("styleId", styleId);
      await deleteMeditationStyle(fd);
    });
  }

  function handleAddPreset() {
    const mins = parseInt(presetMinutes);
    if (!presetLabel.trim() || !mins || mins <= 0) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("label", presetLabel);
      fd.set("seconds", String(mins * 60));
      await addMeditationPreset(fd);
      setPresetLabel("");
      setPresetMinutes("");
    });
  }

  function handleUpdatePreset(presetId: string) {
    const mins = parseInt(editPresetMinutes);
    if (!editPresetLabel.trim() || !mins || mins <= 0) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("presetId", presetId);
      fd.set("label", editPresetLabel);
      fd.set("seconds", String(mins * 60));
      await updateMeditationPreset(fd);
      setEditingPreset(null);
    });
  }

  function handleDeletePreset(presetId: string) {
    if (presets.length <= 1) {
      setDeleteError("There must always be at least one style and timer preset. To delete this one, please add another first.");
      return;
    }
    setDeleteError("");
    startTransition(async () => {
      const fd = new FormData();
      fd.set("presetId", presetId);
      await deleteMeditationPreset(fd);
    });
  }

  const iconNames = Object.keys(ICON_MAP);

  return (
    <div className="space-y-12">
      {deleteError && (
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">
          {deleteError}
        </div>
      )}

      {/* Styles */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Styles</h3>
        <div className="bg-card rounded-lg divide-y divide-border">
          {styles.map((s) =>
            editingStyle === s.id ? (
              <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                <Input
                  value={editStyleLabel}
                  onChange={(e) => setEditStyleLabel(e.target.value)}
                  placeholder="Label"
                  className="max-w-[160px]"
                  autoFocus
                />
                <Input
                  value={editStyleIcon}
                  onChange={(e) => setEditStyleIcon(e.target.value)}
                  placeholder="Icon name"
                  className="max-w-[160px]"
                  list="icon-names"
                />
                <LucideIconByName name={editStyleIcon} className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-1 ml-auto">
                  <Button size="icon-xs" variant="ghost" onClick={() => handleUpdateStyle(s.id)} disabled={isPending}>
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon-xs" variant="ghost" onClick={() => setEditingStyle(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LucideIconByName name={s.iconName} className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium" style={{ color: "var(--app-heading-color)" }}>{s.label}</span>
                  <span className="text-xs text-muted-foreground">{s.iconName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      setEditingStyle(s.id);
                      setEditStyleLabel(s.label);
                      setEditStyleIcon(s.iconName);
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => handleDeleteStyle(s.id)} disabled={isPending}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            )
          )}
          {styles.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No styles yet. Add one below.
            </div>
          )}
        </div>

        {/* Add style form */}
        <div className="mt-4 flex items-end gap-3">
          <div>
            <Label className="text-xs">Label</Label>
            <Input
              value={styleLabel}
              onChange={(e) => setStyleLabel(e.target.value)}
              placeholder="e.g. Guided"
              className="mt-1 w-[160px]"
            />
          </div>
          <div>
            <Label className="text-xs">Lucide Icon</Label>
            <Input
              value={styleIcon}
              onChange={(e) => setStyleIcon(e.target.value)}
              placeholder="e.g. Brain"
              className="mt-1 w-[160px]"
              list="icon-names"
            />
          </div>
          <LucideIconByName name={styleIcon} className="w-5 h-5 text-muted-foreground mb-2" />
          <Button onClick={handleAddStyle} disabled={!styleLabel.trim() || isPending} className="mb-0.5">
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </section>

      {/* Presets */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Timer Presets</h3>
        <div className="bg-card rounded-lg divide-y divide-border">
          {presets.map((p) =>
            editingPreset === p.id ? (
              <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                <Input
                  value={editPresetLabel}
                  onChange={(e) => setEditPresetLabel(e.target.value)}
                  placeholder="Label"
                  className="max-w-[160px]"
                  autoFocus
                />
                <Input
                  type="number"
                  value={editPresetMinutes}
                  onChange={(e) => setEditPresetMinutes(e.target.value)}
                  placeholder="Minutes"
                  className="max-w-[100px]"
                  min={1}
                />
                <span className="text-xs text-muted-foreground">min</span>
                <div className="flex items-center gap-1 ml-auto">
                  <Button size="icon-xs" variant="ghost" onClick={() => handleUpdatePreset(p.id)} disabled={isPending}>
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon-xs" variant="ghost" onClick={() => setEditingPreset(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium" style={{ color: "var(--app-heading-color)" }}>{p.label}</span>
                  <span className="text-xs text-muted-foreground">{p.seconds / 60} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      setEditingPreset(p.id);
                      setEditPresetLabel(p.label);
                      setEditPresetMinutes(String(p.seconds / 60));
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => handleDeletePreset(p.id)} disabled={isPending}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            )
          )}
          {presets.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No presets yet. Add one below.
            </div>
          )}
        </div>

        {/* Add preset form */}
        <div className="mt-4 flex items-end gap-3">
          <div>
            <Label className="text-xs">Label</Label>
            <Input
              value={presetLabel}
              onChange={(e) => setPresetLabel(e.target.value)}
              placeholder="e.g. 5 min"
              className="mt-1 w-[160px]"
            />
          </div>
          <div>
            <Label className="text-xs">Minutes</Label>
            <Input
              type="number"
              value={presetMinutes}
              onChange={(e) => setPresetMinutes(e.target.value)}
              placeholder="e.g. 5"
              className="mt-1 w-[100px]"
              min={1}
            />
          </div>
          <Button onClick={handleAddPreset} disabled={!presetLabel.trim() || !presetMinutes || isPending} className="mb-0.5">
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </section>

      {/* Datalist for icon autocomplete */}
      <datalist id="icon-names">
        {iconNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}
