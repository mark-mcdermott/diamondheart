"use client";

import { useState } from "react";
import { api, keys, type MeditationPresetInput, type MeditationPresetView, type MeditationStyleInput, type MeditationStyleView } from "@/app/api";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { ICON_MAP, LucideIconByName } from "../icon-map";

interface MeditateEditClientProps {
  styles: MeditationStyleView[];
  presets: MeditationPresetView[];
  defaultTimerSeconds: number;
}

const AFTER_WRITE = [keys.meditation] as const;

export function MeditateEditClient({ styles, presets, defaultTimerSeconds }: MeditateEditClientProps) {
  const [deleteError, setDeleteError] = useState("");

  const saveTimer = useApiMutation({ mutationFn: (seconds: number) => api.meditation.setTimer(seconds), invalidates: AFTER_WRITE });
  const addStyle = useApiMutation({
    mutationFn: (input: MeditationStyleInput) => api.meditation.createStyle(input),
    invalidates: AFTER_WRITE,
    onSuccess: () => {
      setStyleLabel("");
      setStyleIcon("brain");
    },
  });
  const saveStyle = useApiMutation({
    mutationFn: ({ id, input }: { id: string; input: MeditationStyleInput }) => api.meditation.updateStyle(id, input),
    invalidates: AFTER_WRITE,
    onSuccess: () => setEditingStyle(null),
  });
  const removeStyle = useApiMutation({ mutationFn: (id: string) => api.meditation.removeStyle(id), invalidates: AFTER_WRITE });
  const addPreset = useApiMutation({
    mutationFn: (input: MeditationPresetInput) => api.meditation.createPreset(input),
    invalidates: AFTER_WRITE,
    onSuccess: () => {
      setPresetLabel("");
      setPresetMinutes("");
    },
  });
  const savePreset = useApiMutation({
    mutationFn: ({ id, input }: { id: string; input: MeditationPresetInput }) => api.meditation.updatePreset(id, input),
    invalidates: AFTER_WRITE,
    onSuccess: () => setEditingPreset(null),
  });
  const removePreset = useApiMutation({ mutationFn: (id: string) => api.meditation.removePreset(id), invalidates: AFTER_WRITE });
  const isPending = [saveTimer, addStyle, saveStyle, removeStyle, addPreset, savePreset, removePreset].some((m) => m.isPending);

  // Default timer
  const [defaultMinutes, setDefaultMinutes] = useState(String(defaultTimerSeconds / 60));

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

  function iconOrDefault(name: string): string {
    return name.trim() || "brain";
  }

  function handleAddStyle() {
    if (!styleLabel.trim()) return;
    addStyle.mutate({ label: styleLabel.trim(), iconName: iconOrDefault(styleIcon) });
  }

  function handleUpdateStyle(styleId: string) {
    if (!editStyleLabel.trim()) return;
    saveStyle.mutate({ id: styleId, input: { label: editStyleLabel.trim(), iconName: iconOrDefault(editStyleIcon) } });
  }

  function handleDeleteStyle(styleId: string) {
    if (styles.length <= 1) {
      setDeleteError("There must always be at least one style and timer preset. To delete this one, please add another first.");
      return;
    }
    setDeleteError("");
    removeStyle.mutate(styleId);
  }

  function handleAddPreset() {
    const mins = parseInt(presetMinutes);
    if (!presetLabel.trim() || !mins || mins <= 0) return;
    addPreset.mutate({ label: presetLabel.trim(), seconds: mins * 60 });
  }

  function handleUpdatePreset(presetId: string) {
    const mins = parseInt(editPresetMinutes);
    if (!editPresetLabel.trim() || !mins || mins <= 0) return;
    savePreset.mutate({ id: presetId, input: { label: editPresetLabel.trim(), seconds: mins * 60 } });
  }

  function handleDeletePreset(presetId: string) {
    if (presets.length <= 1) {
      setDeleteError("There must always be at least one style and timer preset. To delete this one, please add another first.");
      return;
    }
    setDeleteError("");
    removePreset.mutate(presetId);
  }

  function handleSaveDefaultTimer() {
    const mins = parseInt(defaultMinutes);
    if (!mins || mins <= 0) return;
    saveTimer.mutate(mins * 60);
  }

  const iconNames = Object.keys(ICON_MAP);

  return (
    <div className="space-y-12">
      {deleteError && (
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">
          {deleteError}
        </div>
      )}

      {/* Default Timer */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Default Timer</h3>
        <div className="bg-card rounded-lg px-4 py-4">
          <div className="flex items-end gap-3">
            <div>
              <Label className="text-xs">Minutes</Label>
              <Input
                type="number"
                value={defaultMinutes}
                onChange={(e) => setDefaultMinutes(e.target.value)}
                className="mt-1 w-[100px]"
                min={1}
              />
            </div>
            <Button onClick={handleSaveDefaultTimer} disabled={!defaultMinutes || isPending} className="mb-0.5">
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">The timer will start with this duration on page load.</p>
        </div>
      </section>

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
