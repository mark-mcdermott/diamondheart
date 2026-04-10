"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { deleteEntry, updateEntry, quickLog } from "@/app/actions/tracker";
import { Pencil, Trash2, Plus } from "lucide-react";

interface Entry {
  id: string;
  value: string;
  notes: string | null;
  date: string;
}

interface EntriesTableProps {
  metricId: string;
  entries: Entry[];
  valueType: string;
  unit: string | null;
}

function formatValue(value: string, valueType: string): string {
  if (valueType === "none") return "Done";
  if (valueType === "bool") return value === "true" ? "Yes" : "No";
  return value;
}

export function EntriesTable({ metricId, entries, valueType, unit }: EntriesTableProps) {
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addValue, setAddValue] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(entryId: string) {
    setPendingId(entryId);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("entryId", entryId);
      await deleteEntry(fd);
      setPendingId(null);
    });
  }

  function openEdit(entry: Entry) {
    setEditEntry(entry);
    setEditValue(entry.value === "done" ? "" : entry.value);
    setEditNotes(entry.notes || "");
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="secondary" onClick={() => { setShowAdd(true); setAddValue(""); }}>
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
                  <TableCell>
                    {d.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    {formatValue(entry.value, valueType)}
                    {unit && <span className="text-muted-foreground ml-1">{unit}</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.notes || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => openEdit(entry)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(entry.id)}
                        disabled={pendingId === entry.id}
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

      {/* Add Entry Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Entry</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const fd = new FormData();
                fd.set("metricId", metricId);
                fd.set("value", addValue || "done");
                await quickLog(fd);
                setShowAdd(false);
                setAddValue("");
              });
            }}
            className="space-y-4 mt-2"
          >
            {valueType !== "none" && (
              <div>
                {valueType === "bool" ? (
                  <div className="flex items-center gap-3 justify-center">
                    <input
                      type="checkbox"
                      checked={addValue === "true"}
                      onChange={(e) => setAddValue(e.target.checked ? "true" : "false")}
                      className="w-5 h-5 rounded border-border cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">{addValue === "true" ? "Yes" : "No"}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 justify-center">
                    <Input
                      type={valueType === "int" || valueType === "float" ? "number" : "text"}
                      step={valueType === "float" ? "0.01" : valueType === "int" ? "1" : undefined}
                      value={addValue}
                      onChange={(e) => setAddValue(e.target.value)}
                      required
                      autoFocus
                      placeholder="0"
                      className="w-20"
                    />
                    {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-3 pt-2 justify-end">
              <Button type="submit" disabled={valueType !== "none" && !addValue}>
                Save
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Modal */}
      <Dialog open={!!editEntry} onOpenChange={(open) => { if (!open) setEditEntry(null); }}>
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
              action={(formData) => {
                startTransition(async () => {
                  await updateEntry(formData);
                  setEditEntry(null);
                });
              }}
              className="space-y-4 mt-2"
            >
              <input type="hidden" name="entryId" value={editEntry.id} />

              {valueType !== "none" && (
                <div>
                  {valueType === "bool" ? (
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="edit-value"
                        name="value"
                        checked={editValue === "true"}
                        onChange={(e) => setEditValue(e.target.checked ? "true" : "false")}
                        className="w-5 h-5 rounded border-border cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">{editValue === "true" ? "Yes" : "No"}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 justify-center">
                      <Input
                        type={valueType === "int" || valueType === "float" ? "number" : "text"}
                        step={valueType === "float" ? "0.01" : valueType === "int" ? "1" : undefined}
                        id="edit-value"
                        name="value"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        required
                        autoFocus
                        placeholder="0"
                        className="w-20"
                      />
                      {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Input
                  id="edit-notes"
                  name="notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional"
                  className="mt-2"
                />
              </div>

              <div className="flex gap-3 pt-2 justify-end">
                <Button type="submit" disabled={valueType !== "none" && !editValue}>
                  Save
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
