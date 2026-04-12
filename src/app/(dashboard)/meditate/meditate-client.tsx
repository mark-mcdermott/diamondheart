"use client";

import { useState, useEffect, useRef, useTransition, lazy, Suspense } from "react";
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
  defaultTimerSeconds?: number;
}

const DEFAULT_PRESETS = [
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "15 min", seconds: 900 },
  { label: "20 min", seconds: 1200 },
  { label: "30 min", seconds: 1800 },
];

const DEFAULT_STYLES = [
  { key: "guided", label: "Guided", iconName: "brain" },
  { key: "breathing", label: "Breathing", iconName: "wind" },
];

const QUICK_ADD = [
  { label: "+0:30", seconds: 30 },
  { label: "+1:00", seconds: 60 },
  { label: "+5:00", seconds: 300 },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDurationShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

function parseTimeInput(value: string): number | null {
  const trimmed = value.trim();
  // Try "M:SS" or "MM:SS" or "H:MM:SS"
  const parts = trimmed.split(":");
  if (parts.length === 2) {
    const m = parseInt(parts[0]);
    const s = parseInt(parts[1]);
    if (!isNaN(m) && !isNaN(s) && s >= 0 && s < 60) return m * 60 + s;
  }
  if (parts.length === 3) {
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const s = parseInt(parts[2]);
    if (!isNaN(h) && !isNaN(m) && !isNaN(s) && m >= 0 && m < 60 && s >= 0 && s < 60) return h * 3600 + m * 60 + s;
  }
  // Try plain number as minutes
  const mins = parseInt(trimmed);
  if (!isNaN(mins) && mins > 0) return mins * 60;
  return null;
}

const MeditateChart = lazy(() => import("./meditate-chart").then((m) => ({ default: m.MeditateChart })));

export function MeditateClient({ sessions, styles, presets, defaultTimerSeconds = 600 }: MeditateClientProps) {
  const resolvedStyles = styles.length > 0
    ? styles.map((s) => ({ key: s.label.toLowerCase(), label: s.label, iconName: s.iconName }))
    : DEFAULT_STYLES;
  const resolvedPresets = presets.length > 0
    ? presets.map((p) => ({ label: p.label, seconds: p.seconds }))
    : DEFAULT_PRESETS;

  const [isPending, startTransition] = useTransition();
  const [sessionType, setSessionType] = useState(resolvedStyles[0]?.key || "guided");
  const [targetSeconds, setTargetSeconds] = useState(defaultTimerSeconds);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [notes, setNotes] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const [editSession, setEditSession] = useState<MeditationSession | null>(null);
  const [editDuration, setEditDuration] = useState("");
  const [editType, setEditType] = useState("guided");
  const [editNotes, setEditNotes] = useState("");

  // Editable time display
  const [editingTime, setEditingTime] = useState(false);
  const [timeInputValue, setTimeInputValue] = useState("");
  const timeInputRef = useRef<HTMLInputElement>(null);
  const timeButtonRef = useRef<HTMLButtonElement>(null);
  const cursorPosRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (editingTime && timeInputRef.current) {
      timeInputRef.current.focus();
      if (cursorPosRef.current !== null) {
        timeInputRef.current.setSelectionRange(cursorPosRef.current, cursorPosRef.current);
        cursorPosRef.current = null;
      }
    }
  }, [editingTime]);

  const isActive = running || elapsed > 0 || finished;
  const progress = targetSeconds > 0 ? Math.min(100, (elapsed / targetSeconds) * 100) : 0;
  const remaining = Math.max(0, targetSeconds - elapsed);

  // Progress ring geometry
  const ringSize = 280;
  const ringStroke = 8;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (progress / 100) * ringCircumference;

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

  function handleQuickAdd(seconds: number) {
    setTargetSeconds((prev) => prev + seconds);
  }

  function handleTimeClick(e: React.MouseEvent<HTMLButtonElement>) {
    const text = formatDuration(targetSeconds);
    const btn = timeButtonRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const charWidth = rect.width / text.length;
      cursorPosRef.current = Math.round(clickX / charWidth);
    }
    setTimeInputValue(text);
    setEditingTime(true);
  }

  function handleTimeSubmit() {
    const parsed = parseTimeInput(timeInputValue);
    if (parsed && parsed > 0) setTargetSeconds(parsed);
    setEditingTime(false);
  }

  function handleTimeKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleTimeSubmit();
    if (e.key === "Escape") setEditingTime(false);
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

  // Group sessions by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySessions = sessions.filter((s) => new Date(s.date) >= today);
  const olderSessions = sessions.filter((s) => new Date(s.date) < today);
  const todayTotal = todaySessions.reduce((acc, s) => acc + s.duration, 0);

  return (
    <>
      {/* Timer Card */}
      <section className="mb-12">
        <div className="bg-card rounded-2xl overflow-hidden">
          {/* Style selector row */}
          <div className="flex items-center gap-3 px-6 pt-6 pb-2">
            {resolvedStyles.map((t) => (
              <button
                key={t.key}
                onClick={() => setSessionType(t.key)}
                disabled={running}
                className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full transition-colors cursor-pointer ${
                  sessionType === t.key
                    ? "bg-primary/15 text-primary hover:bg-primary/25"
                    : "text-muted-foreground hover:text-black dark:hover:text-white"
                }`}
              >
                <LucideIconByName name={t.iconName} className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Timer area */}
          <div className="flex flex-col items-center justify-center py-12 px-6 min-h-[360px]">
            {isActive ? (
              /* Running/paused/finished: show ring */
              <div className="relative inline-flex items-center justify-center" style={{ width: ringSize, height: ringSize }}>
                <svg width={ringSize} height={ringSize} className="-rotate-90" style={{ overflow: "visible" }}>
                  <circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    fill="none"
                    strokeWidth={ringStroke}
                    style={{ stroke: "var(--app-border)" }}
                  />
                  <circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    fill="none"
                    strokeWidth={ringStroke}
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    className="transition-all duration-700 ease-out"
                    style={{ stroke: finished ? "var(--app-success)" : "var(--app-primary)" }}
                  />
                </svg>
                {/* Dot at progress tip */}
                <svg
                  width={ringSize}
                  height={ringSize}
                  className="absolute inset-0"
                  style={{ transform: `rotate(${(progress / 100) * 360}deg)`, overflow: "visible" }}
                >
                  <circle
                    cx={ringSize / 2}
                    cy={ringStroke / 2}
                    r={ringStroke / 2 + 4}
                    className="transition-all duration-700 ease-out"
                    style={{ fill: finished ? "var(--app-success)" : "var(--app-primary)" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-6xl font-bold tabular-nums tracking-tight" style={{ color: "var(--app-heading-color)" }}>
                    {formatDuration(remaining)}
                  </span>
                  {/* Quick-add buttons inside ring */}
                  <div className="flex gap-2 mt-4">
                    {QUICK_ADD.slice(0, 2).map((q) => (
                      <button
                        key={q.seconds}
                        onClick={() => handleQuickAdd(q.seconds)}
                        className="text-sm font-medium px-3 py-1 rounded-full bg-muted/80 text-muted-foreground hover:brightness-80 transition-all cursor-pointer"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Idle: show large editable time */
              <>
                {editingTime ? (
                  <input
                    ref={timeInputRef}
                    type="text"
                    value={timeInputValue}
                    onChange={(e) => setTimeInputValue(e.target.value)}
                    onBlur={handleTimeSubmit}
                    onKeyDown={handleTimeKeyDown}
                    className="text-7xl font-bold tabular-nums tracking-tight text-center bg-transparent border-none outline-none w-64"
                    style={{ color: "var(--app-heading-color)" }}
                  />
                ) : (
                  <button
                    ref={timeButtonRef}
                    onClick={handleTimeClick}
                    className="text-7xl font-bold tabular-nums tracking-tight cursor-text hover:opacity-70 transition-opacity"
                    style={{ color: "var(--app-heading-color)" }}
                  >
                    {formatDuration(targetSeconds)}
                  </button>
                )}
                <div className="w-48 h-px bg-border mt-2 mb-6" />
                {/* Quick-add pills */}
                <div className="flex gap-2">
                  {QUICK_ADD.map((q) => (
                    <button
                      key={q.seconds}
                      onClick={() => handleQuickAdd(q.seconds)}
                      className="text-sm font-medium px-4 py-1.5 rounded-full bg-muted/80 text-muted-foreground hover:brightness-80 transition-all cursor-pointer"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Notes input when finished */}
            {finished && (
              <div className="mt-6 w-full max-w-xs">
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How was it? (optional)"
                />
              </div>
            )}
          </div>

          {/* Presets (idle only) */}
          {!isActive && (
            <div className="flex justify-center gap-2 px-6 pb-4">
              {resolvedPresets.map((p) => (
                <button
                  key={p.seconds}
                  onClick={() => setTargetSeconds(p.seconds)}
                  className={`text-sm font-medium px-4 py-1.5 rounded-full transition-colors cursor-pointer ${
                    targetSeconds === p.seconds
                      ? "bg-primary text-primary-foreground hover:brightness-80"
                      : "bg-muted/80 text-muted-foreground hover:brightness-80"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Bottom action buttons */}
          <div className="px-6 pb-6 pt-2">
            {!isActive && (
              <button
                onClick={handleStart}
                className="w-full flex items-center justify-center py-4 rounded-full bg-primary text-primary-foreground font-medium text-lg transition-colors hover:brightness-80 cursor-pointer"
              >
                <Play className="w-5 h-5" fill="currentColor" />
              </button>
            )}

            {isActive && (
              <div className="flex gap-3">
                {running ? (
                  <button
                    onClick={handlePause}
                    className="flex-1 flex items-center justify-center py-4 rounded-full bg-primary text-primary-foreground font-medium text-lg transition-colors hover:brightness-80 cursor-pointer"
                  >
                    <Pause className="w-5 h-5" fill="currentColor" />
                  </button>
                ) : finished ? (
                  <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="flex-1 flex items-center justify-center py-4 rounded-full bg-primary text-primary-foreground font-medium text-lg transition-all hover:brightness-80 cursor-pointer disabled:opacity-50"
                  >
                    Save Session
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleResume}
                      className="flex-1 flex items-center justify-center py-4 rounded-full bg-primary text-primary-foreground font-medium text-lg transition-colors hover:brightness-80 cursor-pointer"
                    >
                      <Play className="w-5 h-5" fill="currentColor" />
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isPending}
                      className="flex-1 flex items-center justify-center py-4 rounded-full bg-primary text-primary-foreground font-medium text-lg transition-all hover:brightness-80 cursor-pointer disabled:opacity-50"
                    >
                      Save ({formatDurationShort(elapsed)})
                    </button>
                  </>
                )}
                <button
                  onClick={handleReset}
                  className="flex-1 flex items-center justify-center py-4 rounded-full bg-muted text-muted-foreground font-medium text-lg transition-all hover:brightness-80 cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Chart */}
      <Suspense fallback={<div className="h-64 bg-card border border-border rounded-lg animate-pulse mb-8" />}>
        <MeditateChart />
      </Suspense>

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
