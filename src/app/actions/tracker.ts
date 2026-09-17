"use server";

import { db } from "@/db";
import {
  trackerCategories,
  trackerMetrics,
  trackerEntries,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  success: boolean;
  error?: string;
};

async function ownsMetric(metricId: string, userId: string): Promise<boolean> {
  const [metric] = await db
    .select({ id: trackerMetrics.id })
    .from(trackerMetrics)
    .where(and(eq(trackerMetrics.id, metricId), eq(trackerMetrics.userId, userId)))
    .limit(1);
  return Boolean(metric);
}

// Quick log from dashboard — creates an entry with value "done"
export async function quickLog(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const metricId = formData.get("metricId") as string;
  const value = (formData.get("value") as string) || "done";

  if (!metricId) return { success: false, error: "Metric is required" };
  if (!(await ownsMetric(metricId, session.userId))) {
    return { success: false, error: "Metric not found" };
  }

  await db.insert(trackerEntries).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    metricId,
    value,
    date: new Date(),
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// Log entry with date/time/notes
export async function createEntry(formData: FormData): Promise<void> {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const metricId = formData.get("metricId") as string;
  const value = (formData.get("value") as string) || "done";
  const notes = formData.get("notes") as string;
  const dateStr = formData.get("date") as string;
  const timeStr = formData.get("time") as string;

  if (!metricId) return;
  if (!(await ownsMetric(metricId, session.userId))) return;

  let date: Date;
  if (dateStr && timeStr) {
    date = new Date(`${dateStr}T${timeStr}`);
  } else if (dateStr) {
    date = new Date(dateStr);
  } else {
    date = new Date();
  }

  await db.insert(trackerEntries).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    metricId,
    value,
    notes: notes || null,
    date,
  });

  revalidatePath("/dashboard");
  revalidatePath("/metrics");
  redirect("/dashboard");
}

// Create a new metric
export async function addMetric(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const name = formData.get("name") as string;
  const valueType = formData.get("valueType") as string;
  const unit = formData.get("unit") as string;
  const dailyGoalStr = formData.get("dailyGoal") as string;
  const fieldsJson = formData.get("fields") as string;
  let categoryId = formData.get("categoryId") as string;

  if (!name || !valueType) {
    return { success: false, error: "Name and type are required" };
  }

  const dailyGoal = dailyGoalStr ? parseInt(dailyGoalStr, 10) : 1;
  if (dailyGoal < 1) {
    return { success: false, error: "Daily goal must be at least 1" };
  }

  let fields = null;
  if (fieldsJson) {
    try {
      fields = JSON.parse(fieldsJson);
    } catch {
      // ignore invalid JSON
    }
  }

  // Category must belong to the user; fall back to their default category
  if (categoryId) {
    const [owned] = await db
      .select({ id: trackerCategories.id })
      .from(trackerCategories)
      .where(
        and(
          eq(trackerCategories.id, categoryId),
          eq(trackerCategories.userId, session.userId)
        )
      )
      .limit(1);
    if (!owned) return { success: false, error: "Category not found" };
  } else {
    const [defaultCat] = await db
      .select()
      .from(trackerCategories)
      .where(
        and(
          eq(trackerCategories.slug, "default"),
          eq(trackerCategories.userId, session.userId)
        )
      )
      .limit(1);

    if (defaultCat) {
      categoryId = defaultCat.id;
    } else {
      categoryId = crypto.randomUUID();
      await db.insert(trackerCategories).values({
        id: categoryId,
        userId: session.userId,
        name: "Default",
        slug: "default",
        sortOrder: "0",
      });
    }
  }

  // Get next sort order
  const [maxSort] = await db
    .select({ max: sql<string>`COALESCE(MAX(${trackerMetrics.sortOrder}), '-1')` })
    .from(trackerMetrics)
    .where(eq(trackerMetrics.userId, session.userId));
  const nextSort = String(parseInt(maxSort?.max ?? "-1", 10) + 1);

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  await db.insert(trackerMetrics).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    categoryId,
    name,
    slug,
    valueType,
    unit: unit || null,
    dailyGoal,
    fields,
    sortOrder: nextSort,
  });

  revalidatePath("/metrics");
  return { success: true };
}

// Update an existing metric
export async function updateMetric(
  metricId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const name = formData.get("name") as string;
  const valueType = formData.get("valueType") as string;
  const unit = formData.get("unit") as string;
  const dailyGoalStr = formData.get("dailyGoal") as string;
  const counterStr = formData.get("counter") as string;
  const fieldsJson = formData.get("fields") as string;

  if (!name || !valueType) {
    return { success: false, error: "Name and type are required" };
  }

  const dailyGoal = dailyGoalStr ? parseInt(dailyGoalStr, 10) : 1;

  let fields = null;
  if (fieldsJson) {
    try {
      fields = JSON.parse(fieldsJson);
    } catch {
      // ignore
    }
  }

  const updated = await db
    .update(trackerMetrics)
    .set({
      name,
      valueType,
      unit: unit || null,
      dailyGoal,
      counter: counterStr === "true",
      fields,
      updatedAt: new Date(),
    })
    .where(
      and(eq(trackerMetrics.id, metricId), eq(trackerMetrics.userId, session.userId))
    )
    .returning({ id: trackerMetrics.id });

  if (!updated.length) return { success: false, error: "Metric not found" };

  redirect(`/metrics/${metricId}`);
}

// Delete a metric
export async function deleteMetric(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const metricId = formData.get("metricId") as string;
  if (!metricId) return { success: false, error: "Metric ID is required" };

  const deleted = await db
    .delete(trackerMetrics)
    .where(
      and(eq(trackerMetrics.id, metricId), eq(trackerMetrics.userId, session.userId))
    )
    .returning({ id: trackerMetrics.id });

  if (!deleted.length) return { success: false, error: "Metric not found" };

  revalidatePath("/metrics");
  return { success: true };
}

// Toggle metric visibility
export async function toggleHidden(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const metricId = formData.get("metricId") as string;
  if (!metricId) return { success: false, error: "Metric ID is required" };

  const [metric] = await db
    .select({ hidden: trackerMetrics.hidden })
    .from(trackerMetrics)
    .where(
      and(eq(trackerMetrics.id, metricId), eq(trackerMetrics.userId, session.userId))
    )
    .limit(1);

  if (!metric) return { success: false, error: "Metric not found" };

  await db
    .update(trackerMetrics)
    .set({ hidden: !metric.hidden })
    .where(
      and(eq(trackerMetrics.id, metricId), eq(trackerMetrics.userId, session.userId))
    );

  revalidatePath("/metrics");
  revalidatePath("/dashboard");
  return { success: true };
}

// Reorder metrics
export async function reorderMetrics(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const idsJson = formData.get("ids") as string;
  if (!idsJson) return { success: false, error: "IDs are required" };

  let ids: string[];
  try {
    ids = JSON.parse(idsJson);
  } catch {
    return { success: false, error: "Invalid IDs" };
  }

  for (let i = 0; i < ids.length; i++) {
    await db
      .update(trackerMetrics)
      .set({ sortOrder: String(i) })
      .where(
        and(
          eq(trackerMetrics.id, ids[i]),
          eq(trackerMetrics.userId, session.userId)
        )
      );
  }

  revalidatePath("/metrics");
  return { success: true };
}

export async function deleteEntry(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const entryId = formData.get("entryId") as string;
  if (!entryId) return { success: false, error: "Entry ID is required" };

  const deleted = await db
    .delete(trackerEntries)
    .where(
      and(eq(trackerEntries.id, entryId), eq(trackerEntries.userId, session.userId))
    )
    .returning({ id: trackerEntries.id });

  if (!deleted.length) return { success: false, error: "Entry not found" };

  revalidatePath("/metrics");
  return { success: true };
}

export async function updateEntry(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const entryId = formData.get("entryId") as string;
  const value = formData.get("value") as string;
  const notes = formData.get("notes") as string | null;

  if (!entryId) return { success: false, error: "Entry ID is required" };

  const updated = await db
    .update(trackerEntries)
    .set({
      value: value || "done",
      notes: notes || null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(trackerEntries.id, entryId), eq(trackerEntries.userId, session.userId))
    )
    .returning({ id: trackerEntries.id });

  if (!updated.length) return { success: false, error: "Entry not found" };

  revalidatePath("/metrics");
  return { success: true };
}
