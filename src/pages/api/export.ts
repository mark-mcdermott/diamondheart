import type { APIRoute } from "astro";
import { resolveSession } from "@/server/api/_lib/session";
import { db } from "@/db";
import {
  trackerMetrics,
  trackerEntries,
  foodLog,
  foodLogItems,
  meditationSessions,
  medicalLogs,
  workouts,
  workoutSets,
  exercises,
  entertainmentItems,
  trackingItems,
  appointments,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(","));
  }
  return lines.join("\n");
};

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = await resolveSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  let csv = "";
  let filename = "export.csv";

  switch (type) {
    case "metrics": {
      const metrics = await db.select().from(trackerMetrics).where(eq(trackerMetrics.userId, session.userId)).orderBy(trackerMetrics.sortOrder);
      const entries = await db
        .select({
          metricId: trackerEntries.metricId,
          value: trackerEntries.value,
          notes: trackerEntries.notes,
          date: trackerEntries.date,
        })
        .from(trackerEntries)
        .where(eq(trackerEntries.userId, session.userId))
        .orderBy(desc(trackerEntries.date));

      const metricMap = new Map(metrics.map((m) => [m.id, m.name]));
      const rows = entries.map((e) => ({
        metric: metricMap.get(e.metricId) ?? e.metricId,
        value: e.value,
        notes: e.notes ?? "",
        date: e.date.toISOString(),
      }));
      csv = toCsv(["metric", "value", "notes", "date"], rows);
      filename = "diamondheart-metrics.csv";
      break;
    }

    case "food": {
      const logs = await db
        .select({
          mealType: foodLog.mealType,
          date: foodLog.date,
          name: foodLogItems.name,
          calories: foodLogItems.calories,
          protein: foodLogItems.protein,
          carbs: foodLogItems.carbs,
          fat: foodLogItems.fat,
          quantity: foodLogItems.quantity,
        })
        .from(foodLog)
        .innerJoin(foodLogItems, eq(foodLogItems.foodLogId, foodLog.id))
        .where(eq(foodLog.userId, session.userId))
        .orderBy(desc(foodLog.date));

      const rows = logs.map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        meal: r.mealType,
        food: r.name,
        calories: (r.calories ?? 0) * (r.quantity ?? 1),
        protein: (r.protein ?? 0) * (r.quantity ?? 1),
        carbs: (r.carbs ?? 0) * (r.quantity ?? 1),
        fat: (r.fat ?? 0) * (r.quantity ?? 1),
        quantity: r.quantity ?? 1,
      }));
      csv = toCsv(["date", "meal", "food", "calories", "protein", "carbs", "fat", "quantity"], rows);
      filename = "diamondheart-food.csv";
      break;
    }

    case "meditation": {
      const sessions = await db
        .select()
        .from(meditationSessions)
        .where(eq(meditationSessions.userId, session.userId))
        .orderBy(desc(meditationSessions.date));

      const rows = sessions.map((s) => ({
        date: s.date.toISOString(),
        duration_minutes: Math.round(s.duration / 60),
        type: s.type,
        notes: s.notes ?? "",
      }));
      csv = toCsv(["date", "duration_minutes", "type", "notes"], rows);
      filename = "diamondheart-meditation.csv";
      break;
    }

    case "medical": {
      const logs = await db
        .select()
        .from(medicalLogs)
        .where(eq(medicalLogs.userId, session.userId))
        .orderBy(desc(medicalLogs.date));

      const rows = logs.map((l) => ({
        date: l.date.toISOString(),
        type: l.type,
        subtype: l.subtype ?? "",
        severity: l.severity ?? "",
        notes: l.notes ?? "",
      }));
      csv = toCsv(["date", "type", "subtype", "severity", "notes"], rows);
      filename = "diamondheart-medical.csv";
      break;
    }

    case "workouts": {
      const allWorkouts = await db
        .select()
        .from(workouts)
        .where(eq(workouts.userId, session.userId))
        .orderBy(desc(workouts.date));

      const sets = await db
        .select({
          workoutId: workoutSets.workoutId,
          exerciseId: workoutSets.exerciseId,
          setNumber: workoutSets.setNumber,
          reps: workoutSets.reps,
          weight: workoutSets.weight,
          unit: workoutSets.unit,
        })
        .from(workoutSets)
        .innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
        .where(eq(workouts.userId, session.userId));

      const allExercises = await db.select().from(exercises);
      const exerciseMap = new Map(allExercises.map((e) => [e.id, e.name]));

      const rows = allWorkouts.flatMap((w) => {
        const wSets = sets.filter((s) => s.workoutId === w.id);
        if (wSets.length === 0) {
          return [{ date: w.date.toISOString().slice(0, 10), workout: w.name ?? "", exercise: "", set: "", reps: "", weight: "", unit: "", duration: w.duration ?? "" }];
        }
        return wSets.map((s) => ({
          date: w.date.toISOString().slice(0, 10),
          workout: w.name ?? "",
          exercise: exerciseMap.get(s.exerciseId) ?? "",
          set: String(s.setNumber),
          reps: String(s.reps),
          weight: String(s.weight),
          unit: s.unit,
          duration: w.duration ?? "",
        }));
      });
      csv = toCsv(["date", "workout", "exercise", "set", "reps", "weight", "unit", "duration"], rows);
      filename = "diamondheart-workouts.csv";
      break;
    }

    case "entertainment": {
      const items = await db
        .select()
        .from(entertainmentItems)
        .where(eq(entertainmentItems.userId, session.userId))
        .orderBy(desc(entertainmentItems.createdAt));

      const rows = items.map((i) => ({
        type: i.type,
        title: i.title,
        creator: i.creator ?? "",
        status: i.status,
        rating: i.rating ?? "",
        notes: i.notes ?? "",
        start_date: i.startDate?.toISOString().slice(0, 10) ?? "",
        end_date: i.endDate?.toISOString().slice(0, 10) ?? "",
      }));
      csv = toCsv(["type", "title", "creator", "status", "rating", "notes", "start_date", "end_date"], rows);
      filename = "diamondheart-entertainment.csv";
      break;
    }

    case "tracking": {
      const items = await db
        .select()
        .from(trackingItems)
        .where(eq(trackingItems.userId, session.userId));

      const rows = items.map((i) => ({
        name: i.name,
        category: i.category ?? "",
        count: i.count,
        unit: i.unit ?? "",
        notes: i.notes ?? "",
      }));
      csv = toCsv(["name", "category", "count", "unit", "notes"], rows);
      filename = "diamondheart-tracking.csv";
      break;
    }

    case "appointments": {
      const items = await db
        .select()
        .from(appointments)
        .where(eq(appointments.userId, session.userId))
        .orderBy(desc(appointments.date));

      const rows = items.map((a) => ({
        date: a.date.toISOString().slice(0, 10),
        title: a.title,
        type: a.appointmentType,
        provider: a.provider ?? "",
        location: a.location ?? "",
        status: a.status,
        duration: a.durationMinutes ?? "",
        notes: a.notes ?? "",
      }));
      csv = toCsv(["date", "title", "type", "provider", "location", "status", "duration", "notes"], rows);
      filename = "diamondheart-appointments.csv";
      break;
    }

    default:
      return Response.json({ error: "Invalid export type" }, { status: 400 });
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
};
