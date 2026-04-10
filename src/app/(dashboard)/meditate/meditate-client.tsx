"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logMeditationSession, deleteMeditationSession } from "@/app/actions/meditation";
import type { MeditationSession } from "@/db/schema";
import { Play, Pause, RotateCcw, Trash2, Brain, Wind, Scan, Volume2 } from "lucide-react";

interface MeditateClientProps {
  sessions: MeditationSession[];
}

const PRESETS = [
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "15 min", seconds: 900 },
  { label: "20 min", seconds: 1200 },
  { label: "30 min", seconds: 1800 },
];

const SESSION_TYPES = [
  { key: "silent", label: "Silent", icon: Volume2 },
  { key: "guided", label: "Guided", icon: Brain },
  { key: "breathing", label: "Breathing", icon: Wind },
  { key: "body-scan", label: "Body Scan", icon: Scan },
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

export function MeditateClient({ sessions }: MeditateClientProps) {
  const [isPending, startTransition] = useTransition();
  const [sessionType, setSessionType] = useState("silent");
  const [targetSeconds, setTargetSeconds] = useState(600);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [notes, setNotes] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

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
            {SESSION_TYPES.map((t) => (
              <Button
                key={t.key}
                size="sm"
                variant={sessionType === t.key ? "default" : "secondary"}
                onClick={() => setSessionType(t.key)}
                disabled={running}
              >
                <t.icon className="w-3.5 h-3.5 mr-1" />
                {t.label}
              </Button>
            ))}
          </div>

          {/* Presets */}
          {!running && !finished && (
            <div className="flex justify-center gap-2 mb-6">
              {PRESETS.map((p) => (
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
              const TypeIcon = SESSION_TYPES.find((t) => t.key === s.type)?.icon || Brain;
              return (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <TypeIcon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium" style={{ color: "var(--app-heading-color)" }}>
                      {formatDurationShort(s.duration)}
                    </span>
                    <span className="text-xs text-muted-foreground">{s.type}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {s.notes && <span className="text-xs text-muted-foreground">{s.notes}</span>}
                  </div>
                  <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(s.id)} disabled={isPending}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
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
              const TypeIcon = SESSION_TYPES.find((t) => t.key === s.type)?.icon || Brain;
              const d = new Date(s.date);
              return (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <TypeIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium" style={{ color: "var(--app-heading-color)" }}>
                      {formatDurationShort(s.duration)}
                    </span>
                    <span className="text-xs text-muted-foreground">{s.type}</span>
                    <span className="text-xs text-muted-foreground">
                      {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    {s.notes && <span className="text-xs text-muted-foreground">{s.notes}</span>}
                  </div>
                  <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(s.id)} disabled={isPending}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
