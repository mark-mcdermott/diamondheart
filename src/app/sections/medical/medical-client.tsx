import { useState, lazy, Suspense } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errorMessage, type CreateMedicalLogInput, type MedicalLogView } from "@/app/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Droplets, ThermometerSun, Pill, Stethoscope, AlertCircle } from "lucide-react";
import { useViewRange } from "@/lib/use-view-range";
import { filterByBounds, viewRangeBounds, viewRangeLabel } from "@/lib/view-range";

interface MedicalClientProps {
  logs: MedicalLogView[];
}

const QUICK_LOGS = [
  { type: "bathroom", subtype: "pee", label: "Pee", icon: Droplets },
  { type: "bathroom", subtype: "poop", label: "Poop", icon: Droplets },
  { type: "symptom", subtype: "headache", label: "Headache", icon: ThermometerSun },
  { type: "symptom", subtype: "nausea", label: "Nausea", icon: AlertCircle },
  { type: "medication", subtype: null, label: "Took Medication", icon: Pill },
];

const TYPE_ICONS: Record<string, typeof Droplets> = {
  bathroom: Droplets,
  symptom: ThermometerSun,
  medication: Pill,
  doctor: Stethoscope,
  sick: AlertCircle,
};

const MedicalChart = lazy(() => import("./medical-chart").then((m) => ({ default: m.MedicalChart })));

export function MedicalClient({ logs }: MedicalClientProps) {
  const { view, anchor } = useViewRange("day");
  const bounds = viewRangeBounds(view, anchor ?? new Date());
  const rangedLogs = filterByBounds(logs, bounds);
  const periodLabel = viewRangeLabel(view, anchor);
  const queryClient = useQueryClient();
  const [showCustom, setShowCustom] = useState(false);
  const [customType, setCustomType] = useState("symptom");
  const [customSubtype, setCustomSubtype] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [customSeverity, setCustomSeverity] = useState("");

  // The list and the chart's totals both live under "medical", so one invalidation covers them.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["medical"] });
  const surface = (error: unknown) => toast.error(errorMessage(error));

  const create = useMutation({
    mutationFn: (input: CreateMedicalLogInput) => api.medical.create(input),
    onError: surface,
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.medical.remove(id),
    onError: surface,
    onSettled: invalidate,
  });

  const isPending = create.isPending;
  const pendingId = remove.isPending ? remove.variables : null;

  function handleQuickLog(type: string, subtype: string | null) {
    create.mutate({ type, subtype });
  }

  function handleCustomLog() {
    const severity = Number.parseInt(customSeverity, 10);
    create.mutate(
      {
        type: customType,
        subtype: customSubtype.trim() || null,
        notes: customNotes.trim() || null,
        severity: Number.isFinite(severity) ? severity : null,
      },
      {
        onSuccess: () => {
          setShowCustom(false);
          setCustomSubtype("");
          setCustomNotes("");
          setCustomSeverity("");
        },
      }
    );
  }

  function handleDelete(logId: string) {
    remove.mutate(logId);
  }

  return (
    <>
      {/* Chart */}
      <Suspense fallback={<div className="h-64 bg-card border border-border rounded-lg animate-pulse mb-8" />}>
        <MedicalChart />
      </Suspense>

      {/* Quick Log Buttons */}
      <section className="mb-8">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Quick Log</h3>
        <div className="flex flex-wrap gap-2">
          {QUICK_LOGS.map((ql) => (
            <Button
              key={ql.label}
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={() => handleQuickLog(ql.type, ql.subtype)}
            >
              <ql.icon className="w-3.5 h-3.5 mr-1" />
              {ql.label}
            </Button>
          ))}
          <Button variant="secondary" size="sm" onClick={() => setShowCustom(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Custom
          </Button>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          {periodLabel} &middot; {rangedLogs.length} {rangedLogs.length === 1 ? "entry" : "entries"}
        </h3>
        {rangedLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing logged in this period.</p>
        ) : (
          <div className="bg-card rounded-lg divide-y divide-border">
            {rangedLogs.slice(0, 200).map((log) => {
              const Icon = TYPE_ICONS[log.type] || AlertCircle;
              const d = new Date(log.date);
              const showTimeOnly = view === "day";
              return (
                <div key={log.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium" style={{ color: "var(--app-heading-color)" }}>
                        {log.subtype || log.type}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {showTimeOnly
                          ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                          : `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`}
                      </span>
                      {log.severity && (
                        <span className="text-xs text-muted-foreground ml-2">severity: {log.severity}/5</span>
                      )}
                      {log.notes && <span className="text-xs text-muted-foreground ml-2">{log.notes}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon-xs" aria-label="Delete entry" onClick={() => handleDelete(log.id)} disabled={pendingId === log.id}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Custom Log Modal */}
      <Dialog open={showCustom} onOpenChange={setShowCustom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Type</Label>
              <select value={customType} onChange={(e) => setCustomType(e.target.value)} className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-card cursor-pointer">
                <option value="bathroom">Bathroom</option>
                <option value="symptom">Symptom</option>
                <option value="medication">Medication</option>
                <option value="doctor">Doctor Visit</option>
                <option value="sick">Sick Day</option>
              </select>
            </div>
            <div>
              <Label>Details</Label>
              <Input value={customSubtype} onChange={(e) => setCustomSubtype(e.target.value)} placeholder="e.g. headache, aspirin, Dr. Smith" className="mt-1" />
            </div>
            <div>
              <Label>Severity (1-5, optional)</Label>
              <Input type="number" min="1" max="5" value={customSeverity} onChange={(e) => setCustomSeverity(e.target.value)} placeholder="1-5" className="mt-1" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} placeholder="Optional" className="mt-1" />
            </div>
            <div className="flex gap-3 pt-2 justify-end">
              <Button onClick={handleCustomLog} disabled={isPending}>Save</Button>
              <Button variant="secondary" onClick={() => setShowCustom(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
