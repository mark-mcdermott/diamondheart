"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errorMessage, keys, type MetricDetail } from "@/app/api";
import type { MassUnit } from "@/lib/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Pencil, Trash2, Plus } from "lucide-react";

interface Entry {
  id: string;
  /** Already converted to the viewer's unit. */
  value: string;
  notes: string | null;
  date: string;
}

interface EntriesTableProps {
  metricId: string;
  entries: Entry[];
  valueType: string;
  unit: string | null;
  /** The unit typed values are in, so the server can convert mass metrics on write. */
  weightUnit: MassUnit;
}

function formatValue(value: string, valueType: string): string {
  if (valueType === "none") return "Done";
  if (valueType === "bool") return value === "true" ? "Yes" : "No";
  return value;
}

export function EntriesTable({ metricId, entries, valueType, unit, weightUnit }: EntriesTableProps) {
  const queryClient = useQueryClient();
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addValue, setAddValue] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: keys.metric(metricId) });
  const fail = (error: unknown) => toast.error(errorMessage(error));

  const addEntry = useMutation({
    mutationFn: (value: string) => api.entries.create(metricId, { value, unit: weightUnit }),
    onSuccess: () => {
      setShowAdd(false);
      setAddValue("");
      void refresh();
    },
    onError: fail,
  });

  const saveEntry = useMutation({
    mutationFn: ({ id, value, notes }: { id: string; value: string; notes: string | null }) =>
      api.entries.update(id, { value, notes, unit: weightUnit }),
    onSuccess: () => {
      setEditEntry(null);
      void refresh();
    },
    onError: fail,
  });

  const removeEntry = useMutation({
    mutationFn: (id: string) => api.entries.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: keys.metric(metricId) });
      const previous = queryClient.getQueryData<MetricDetail>(keys.metric(metricId));
      if (previous) queryClient.setQueryData<MetricDetail>(keys.metric(metricId), { ...previous, entries: previous.entries.filter((e) => e.id !== id) });
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(keys.metric(metricId), context.previous);
      fail(error);
    },
    onSettled: () => void refresh(),
  });

  function openEdit(entry: Entry) {
    setEditEntry(entry);
    setEditValue(entry.value === "done" ? "" : entry.value);
    setEditNotes(entry.notes || "");
  }

  const valueInput = (value: string, onChange: (v: string) => void, id?: string) =>
    valueType === "bool" ? (
      <div className="flex items-center gap-3 justify-center">
        <input
          type="checkbox"
          id={id}
          checked={value === "true"}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
          className="w-5 h-5 rounded border-border cursor-pointer"
        />
        <span className="text-sm text-muted-foreground">{value === "true" ? "Yes" : "No"}</span>
      </div>
    ) : (
      <div className="flex items-center gap-2 justify-center">
        <Input
          type={valueType === "int" || valueType === "float" ? "number" : "text"}
          step={valueType === "float" ? "0.01" : valueType === "int" ? "1" : undefined}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoFocus
          placeholder="0"
          className="w-20"
        />
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
    );

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button
          variant="secondary"
          onClick={() => {
            setShowAdd(true);
            setAddValue("");
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Entry
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No entries recorded yet.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const d = new Date(entry.date);
              return (
                <TableRow key={entry.id}>
                  <TableCell>{d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</TableCell>
                  <TableCell className="text-muted-foreground">{d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</TableCell>
                  <TableCell>
                    {formatValue(entry.value, valueType)}
                    {unit && <span className="text-muted-foreground ml-1">{unit}</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{entry.notes || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => openEdit(entry)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeEntry.mutate(entry.id)}
                        disabled={removeEntry.isPending && removeEntry.variables === entry.id}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Entry</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addEntry.mutate(addValue || "done");
            }}
            className="space-y-4 mt-2"
          >
            {valueType !== "none" && <div>{valueInput(addValue, setAddValue)}</div>}
            <div className="flex gap-3 pt-2 justify-end">
              <Button type="submit" disabled={(valueType !== "none" && !addValue) || addEntry.isPending}>
                {addEntry.isPending ? "Saving..." : "Save"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editEntry}
        onOpenChange={(open) => {
          if (!open) setEditEntry(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Entry
              {editEntry && (
                <span className="block text-sm font-normal text-muted-foreground mt-1">
                  {new Date(editEntry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {" at "}
                  {new Date(editEntry.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {editEntry && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveEntry.mutate({ id: editEntry.id, value: editValue || "done", notes: editNotes.trim() || null });
              }}
              className="space-y-4 mt-2"
            >
              {valueType !== "none" && <div>{valueInput(editValue, setEditValue, "edit-value")}</div>}

              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Input id="edit-notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Optional" className="mt-2" />
              </div>

              <div className="flex gap-3 pt-2 justify-end">
                <Button type="submit" disabled={(valueType !== "none" && !editValue) || saveEntry.isPending}>
                  {saveEntry.isPending ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEditEntry(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
