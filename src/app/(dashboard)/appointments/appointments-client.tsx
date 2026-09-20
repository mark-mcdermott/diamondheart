"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errorMessage, keys, type AppointmentView, type CreateAppointmentInput } from "@/app/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Stethoscope,
  SmilePlus,
  Eye,
  Brain,
  FlaskConical,
  Scan,
  Pill,
  Sparkles,
  UserRound,
  Calendar,
  CalendarOff,
  Clock,
} from "lucide-react";

interface AppointmentsClientProps {
  appointments: AppointmentView[];
}

const APPOINTMENT_TYPES = [
  { value: "doctor", label: "Doctor" },
  { value: "dentist", label: "Dentist" },
  { value: "eye", label: "Eye" },
  { value: "dermatology", label: "Dermatology" },
  { value: "therapy", label: "Therapy" },
  { value: "specialist", label: "Specialist" },
  { value: "lab", label: "Lab" },
  { value: "imaging", label: "Imaging" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "missed", label: "Missed" },
];

const TYPE_ICONS: Record<string, typeof Stethoscope> = {
  doctor: Stethoscope,
  dentist: SmilePlus,
  eye: Eye,
  dermatology: Sparkles,
  therapy: Brain,
  specialist: UserRound,
  lab: FlaskConical,
  imaging: Scan,
  pharmacy: Pill,
  other: Calendar,
};

const STATUS_STYLES: Record<string, string> = {
  upcoming: "bg-primary/15 text-primary",
  completed: "bg-success/15 text-success",
  cancelled: "bg-muted text-muted-foreground",
  missed: "bg-destructive/15 text-destructive",
};

function formatDateTime(date: Date | string) {
  const d = new Date(date);
  const dateStr = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateStr} at ${timeStr}`;
}

function toLocalDatetimeValue(date: Date | string) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

const EMPTY_FORM = {
  title: "",
  appointmentType: "doctor",
  provider: "",
  location: "",
  date: "",
  durationMinutes: "",
  status: "upcoming",
  notes: "",
  followUp: "",
};

export function AppointmentsClient({ appointments }: AppointmentsClientProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: keys.appointments });
  const surface = (error: unknown) => toast.error(errorMessage(error));

  const save = useMutation({
    mutationFn: ({ id, values }: { id: string | null; values: CreateAppointmentInput }) =>
      id ? api.appointments.update(id, values) : api.appointments.create(values),
    onSuccess: () => {
      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
    onError: surface,
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.appointments.remove(id),
    onError: surface,
    onSettled: invalidate,
  });

  const isPending = save.isPending || remove.isPending;

  const now = new Date();

  const upcoming = appointments
    .filter((a) => a.status === "upcoming" && new Date(a.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const past = appointments
    .filter((a) => a.status !== "upcoming" || new Date(a.date) < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(appt: AppointmentView) {
    setEditingId(appt.id);
    setForm({
      title: appt.title,
      appointmentType: appt.appointmentType,
      provider: appt.provider || "",
      location: appt.location || "",
      date: toLocalDatetimeValue(appt.date),
      durationMinutes: appt.durationMinutes?.toString() || "",
      status: appt.status,
      notes: appt.notes || "",
      followUp: appt.followUp || "",
    });
    setDialogOpen(true);
  }

  function handleSave() {
    // The picker's value is local wall-clock time; it becomes an instant here,
    // in the browser's zone, rather than in whatever zone the server runs in.
    const when = new Date(form.date);
    if (Number.isNaN(when.getTime())) {
      toast.error("Enter a date and time.");
      return;
    }
    const duration = Number.parseInt(form.durationMinutes, 10);
    save.mutate({
      id: editingId,
      values: {
        title: form.title.trim(),
        appointmentType: form.appointmentType,
        provider: form.provider.trim() || null,
        location: form.location.trim() || null,
        date: when.toISOString(),
        durationMinutes: Number.isFinite(duration) ? duration : null,
        status: form.status,
        notes: form.notes.trim() || null,
        followUp: form.followUp.trim() || null,
      },
    });
  }

  function handleDelete(id: string) {
    remove.mutate(id);
  }

  function renderCard(appt: AppointmentView) {
    const Icon = TYPE_ICONS[appt.appointmentType] || Calendar;
    const statusStyle = STATUS_STYLES[appt.status] || STATUS_STYLES.upcoming;

    return (
      <div key={appt.id} className="flex items-start gap-4 px-4 py-4">
        <div className="mt-0.5 rounded-lg bg-muted p-2">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: "var(--app-heading-color)" }}>
              {appt.title}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle}`}>
              {appt.status}
            </span>
          </div>
          {appt.provider && (
            <p className="text-xs text-muted-foreground mt-0.5">{appt.provider}</p>
          )}
          {appt.location && (
            <p className="text-xs text-muted-foreground">{appt.location}</p>
          )}
          <div className="flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {formatDateTime(appt.date)}
              {appt.durationMinutes && ` (${appt.durationMinutes} min)`}
            </span>
          </div>
          {appt.notes && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{appt.notes}</p>
          )}
          {appt.followUp && (
            <p className="text-xs text-muted-foreground mt-1 italic">Follow-up: {appt.followUp}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon-xs" aria-label={`Edit ${appt.title}`} onClick={() => openEdit(appt)} disabled={isPending}>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label={`Delete ${appt.title}`} onClick={() => handleDelete(appt.id)} disabled={isPending}>
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header with Add button */}
      <div className="flex justify-end mb-6">
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Add Appointment
        </Button>
      </div>

      {/* Upcoming */}
      <section className="mb-8">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Upcoming</h3>
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Calendar className="w-8 h-8 mb-2" />
            <p className="text-sm">No upcoming appointments</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg divide-y divide-border">
            {upcoming.map(renderCard)}
          </div>
        )}
      </section>

      {/* Past */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Past</h3>
        {past.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <CalendarOff className="w-8 h-8 mb-2" />
            <p className="text-sm">No past appointments</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg divide-y divide-border">
            {past.map(renderCard)}
          </div>
        )}
      </section>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Appointment" : "Add Appointment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Annual physical"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Type</Label>
              <select
                value={form.appointmentType}
                onChange={(e) => setForm({ ...form, appointmentType: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-card cursor-pointer"
              >
                {APPOINTMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Provider</Label>
              <Input
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                placeholder="Doctor or clinic name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Address or office name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Date & Time</Label>
              <input
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-card"
              />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                placeholder="e.g. 30"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-card cursor-pointer"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Pre or post appointment notes"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Follow-up</Label>
              <Textarea
                value={form.followUp}
                onChange={(e) => setForm({ ...form, followUp: e.target.value })}
                placeholder="Follow-up instructions or next steps"
                className="mt-1"
              />
            </div>
            <div className="flex gap-3 pt-2 justify-end">
              <Button onClick={handleSave} disabled={isPending || !form.title.trim() || !form.date}>
                {editingId ? "Update" : "Save"}
              </Button>
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
