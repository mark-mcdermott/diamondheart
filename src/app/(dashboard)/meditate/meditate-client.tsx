"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { logMeditationSession, updateMeditationSession, deleteMeditationSession } from "@/app/actions/meditation";
import type { MeditationSession, MeditationStyle, MeditationPreset } from "@/db/schema";
import { Play, Pause, RotateCcw, Trash2, Pencil } from "lucide-react";
import { LucideIconByName } from "./icon-map";

interface MeditateClientProps {
  sessions: MeditationSession[];
  styles: MeditationStyle[];
  presets: MeditationPreset[];
}

const DEFAULT_PRESETS = [
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "15 min", seconds: 900 },
  { label: "20 min", seconds: 1200 },
  { label: "30 min", seconds: 1800 },
];

const DEFAULT_STYLES = [
  { key: "guided", label: "Guided", iconName: "Brain" },
  { key: "breathing", label: "Breathing", iconName: "Wind" },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatDurationShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

export function MeditateClient({ sessions, styles, presets }: MeditateClientProps) {
  const resolvedStyles = styles.length > 0
    ? styles.map((s) => ({ key: s.label.toLowerCase(), label: s.label, iconName: s.iconName }))
    : DEFAULT_STYLES;
  const resolvedPresets = presets.length > 0
    ? presets.map((p) => ({ label: p.label, seconds: p.seconds }))
    : DEFAULT_PRESETS;

  const [isPending, startTransition] = useTransition();
  const [sessionType, setSessionType] = useState(resolvedStyles[0]?.key || "guided");
  const [targetSeconds, setTargetSeconds] = useState(600);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [notes, setNotes] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const [editSession, setEditSession] = useState<MeditationSession | null>(null);
  const [editDuration, setEditDuration] = useState("");
  const [editType, setEditType] = useState("guided");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= targetSeconds) {
            setRunning(false);
            setFinished(true);
            clearInterval(intervalRef.current);
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, targetSeconds]);

  function handleStart() {
    setElapsed(0);
    setFinished(false);
    setRunning(true);
  }

  function handlePause() {
    setRunning(false);
  }

  function handleResume() {
    setRunning(true);
  }

  function handleReset() {
    setRunning(false);
    setFinished(false);
    setElapsed(0);
  }

  function handleSave() {
    const duration = finished ? targetSeconds : elapsed;
    if (duration <= 0) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("duration", String(duration));
      fd.set("type", sessionType);
      if (notes) fd.set("notes", notes);
      await logMeditationSession(fd);
      handleReset();
      setNotes("");
    });
  }

  function handleDelete(sessionId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("sessionId", sessionId);
      await deleteMeditationSession(fd);
    });
  }

  function openEdit(s: MeditationSession) {
    setEditSession(s);
    setEditDuration(String(Math.floor(s.duration / 60)));
    setEditType(s.type);
    setEditNotes(s.notes || "");
  }

  function handleEditSave() {
    if (!editSession) return;
    const mins = parseInt(editDuration);
    if (!mins || mins <= 0) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("sessionId", editSession.id);
      fd.set("duration", String(mins * 60));
      fd.set("type", editType);
      fd.set("notes", editNotes);
      await updateMeditationSession(fd);
      setEditSession(null);
    });
  }

  const progress = targetSeconds > 0 ? Math.min(100, (elapsed / targetSeconds) * 100) : 0;
  const remaining = Math.max(0, targetSeconds - elapsed);

  // Group sessions by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySessions = sessions.filter((s) => new Date(s.date) >= today);
  const olderSessions = sessions.filter((s) => new Date(s.date) < today);
  const todayTotal = todaySessions.reduce((acc, s) => acc + s.duration, 0);

  return (
    <>
      {/* Timer */}
      <section className="mb-12">
        <div className="bg-card rounded-lg p-8 text-center">
          {/* Session type */}
          <div className="flex justify-center gap-2 mb-6">
            {resolvedStyles.map((t) => (
              <Button
                key={t.key}
                size="sm"
                variant={sessionType === t.key ? "default" : "secondary"}
                onClick={() => setSessionType(t.key)}
                disabled={running}
              >
                <LucideIconByName name={t.iconName} className="w-3.5 h-3.5 mr-1" />
                {t.label}
              </Button>
            ))}
          </div>

          {/* Presets */}
          {!running && !finished && (
            <div className="flex justify-center gap-2 mb-6">
              {resolvedPresets.map((p) => (
                <Button
                  key={p.seconds}
                  size="sm"
                  variant={targetSeconds === p.seconds ? "default" : "secondary"}
                  onClick={() => setTargetSeconds(p.seconds)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          )}

          {/* Timer display */}
          <div className="mb-6">
            <p className="text-6xl font-bold tabular-nums" style={{ color: "var(--app-heading-color)" }}>
              {formatDuration(running || finished ? remaining : targetSeconds)}
            </p>
            {(running || finished) && (
              <div className="mt-4 mx-auto max-w-xs">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: finished ? "#22c55e" : "#a57cf4",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-3">
            {!running && !finished && (
              <Button onClick={handleStart}>
                <Play className="w-4 h-4 mr-2" />
                Start
              </Button>
            )}
            {running && (
              <Button onClick={handlePause} variant="secondary">
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            )}
            {!running && elapsed > 0 && !finished && (
              <>
                <Button onClick={handleResume}>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
                <Button variant="secondary" onClick={handleSave}>
                  Save ({formatDurationShort(elapsed)})
                </Button>
              </>
            )}
            {finished && (
              <>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How was it? (optional)"
                  className="max-w-xs"
                />
                <Button onClick={handleSave} disabled={isPending}>
                  Save Session
                </Button>
              </>
            )}
            {(running || elapsed > 0) && (
              <Button variant="ghost" size="icon" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Today's stats */}
      {todaySessions.length > 0 && (
        <section className="mb-8">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Today &middot; {todaySessions.length} {todaySessions.length === 1 ? "session" : "sessions"} &middot; {formatDurationShort(todayTotal)}
          </h3>
          <div className="bg-card rounded-lg divide-y divide-border">
            {todaySessions.map((s) => {
              const styleMatch = resolvedStyles.find((t) => t.key === s.type);
              const iconName = styleMatch?.iconName || "Brain";
              return (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <LucideIconByName name={iconName} className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium" style={{ color: "var(--app-heading-color)" }}>
                      {formatDurationShort(s.duration)}
                    </span>
                    <span className="text-xs text-muted-foreground">{s.type}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {s.notes && <span className="text-xs text-muted-foreground">{s.notes}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-xs" onClick={() => openEdit(s)} disabled={isPending}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(s.id)} disabled={isPending}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* History */}
      {olderSessions.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">History</h3>
          <div className="bg-card rounded-lg divide-y divide-border">
            {olderSessions.slice(0, 50).map((s) => {
              const styleMatch = resolvedStyles.find((t) => t.key === s.type);
              const iconName = styleMatch?.iconName || "Brain";
              const d = new Date(s.date);
              return (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <LucideIconByName name={iconName} className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium" style={{ color: "var(--app-heading-color)" }}>
                      {formatDurationShort(s.duration)}
                    </span>
                    <span className="text-xs text-muted-foreground">{s.type}</span>
                    <span className="text-xs text-muted-foreground">
                      {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    {s.notes && <span className="text-xs text-muted-foreground">{s.notes}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-xs" onClick={() => openEdit(s)} disabled={isPending}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(s.id)} disabled={isPending}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Edit Modal */}
      <Dialog open={!!editSession} onOpenChange={(open) => { if (!open) setEditSession(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} className="mt-1" min={1} autoFocus />
            </div>
            <div>
              <Label>Type</Label>
              <div className="flex gap-2 mt-1">
                {resolvedStyles.map((t) => (
                  <Button
                    key={t.key}
                    size="sm"
                    variant={editType === t.key ? "default" : "secondary"}
                    onClick={() => setEditType(t.key)}
                  >
                    <LucideIconByName name={t.iconName} className="w-3.5 h-3.5 mr-1" />
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Optional" className="mt-1" />
            </div>
            <div className="flex gap-3 pt-2 justify-end">
              <Button onClick={handleEditSave} disabled={!editDuration || isPending}>Save</Button>
              <Button variant="secondary" onClick={() => setEditSession(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
