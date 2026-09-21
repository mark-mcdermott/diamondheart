"use client";

import { useState } from "react";
import { Link } from "@/app/link";
import { useRouter } from "@/app/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, Bell, BellOff } from "lucide-react";
import { apiFetch } from "@/app/api";

interface Reminder {
  id: string;
  label: string;
  time: string;
  days: number[];
  timezone: string;
  enabled: boolean;
  metricId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RemindersClientProps {
  reminders: Reminder[];
  metrics: { id: string; name: string }[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RemindersClient({ reminders, metrics: _metrics }: RemindersClientProps) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState("");
  const [time, setTime] = useState("09:00");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!label) return;
    setSaving(true);
    await apiFetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, time, days }),
    });
    setLabel("");
    setShowAdd(false);
    setSaving(false);
    router.refresh();
  }

  async function handleToggle(id: string, enabled: boolean) {
    await apiFetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    router.refresh();
  }

  async function handleDelete(id: string) {
    await apiFetch(`/api/reminders/${id}`, { method: "DELETE" });
    router.refresh();
  }

  function toggleDay(day: number) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/account" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Account
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2>Reminders</h2>
          <p className="text-muted-foreground mt-1">Schedule notifications for your metrics</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-2" /> Add
        </Button>
      </div>

      {showAdd && (
        <div className="border border-border rounded-lg p-6 mb-6 space-y-4">
          <div>
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Log water" className="mt-1" />
          </div>
          <div>
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Days</Label>
            <div className="flex gap-2 mt-1">
              {DAY_LABELS.map((d, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`w-10 h-10 rounded-lg text-xs font-medium border transition-colors ${
                    days.includes(i)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-foreground/50"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleAdd} disabled={!label || saving}>
              {saving ? "Saving..." : "Save Reminder"}
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {reminders.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No reminders yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reminders.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-3 px-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                {r.enabled ? <Bell className="w-4 h-4 text-foreground" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                <div>
                  <p className={`text-sm font-medium ${!r.enabled ? "text-muted-foreground" : ""}`}>{r.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.time} &middot; {r.days.map((d) => DAY_LABELS[d]).join(", ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleToggle(r.id, r.enabled)}>
                  {r.enabled ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
