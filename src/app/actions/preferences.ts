"use server";

import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { isMassUnit } from "@/lib/units";
import { MACRO_KEYS, parseTargetField, type FoodTargets, type MacroKey } from "@/lib/targets";
import { readPreferences } from "@/server/api/preferences";
import { revalidatePath } from "next/cache";

type Result = { success: boolean; error?: string };

/** Reads live in `src/server/api/preferences.ts` now; this stays for the pages that still call it. */
export async function getUserPreferences(userId: string) {
  return readPreferences(userId);
}

export async function toggleNetflixUI(formData: FormData): Promise<Result> {
  void formData; // consumed by form action signature
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const [existing] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.userId))
    .limit(1);

  if (existing) {
    await db
      .update(userPreferences)
      .set({ useNetflixUI: !existing.useNetflixUI, updatedAt: new Date() })
      .where(eq(userPreferences.id, existing.id));
  } else {
    await db.insert(userPreferences).values({
      id: crypto.randomUUID(),
      userId: session.userId,
      useNetflixUI: false,
    });
  }

  revalidatePath("/entertainment");
  return { success: true };
}

export async function toggleSiteName(formData: FormData): Promise<Result> {
  void formData;
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const [existing] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.userId))
    .limit(1);

  if (existing) {
    await db
      .update(userPreferences)
      .set({ showSiteName: !existing.showSiteName, updatedAt: new Date() })
      .where(eq(userPreferences.id, existing.id));
  } else {
    await db.insert(userPreferences).values({
      id: crypto.randomUUID(),
      userId: session.userId,
      showSiteName: false,
    });
  }

  revalidatePath("/");
  return { success: true };
}

export async function updateDashboardSections(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const sectionsJson = formData.get("sections") as string;
  if (!sectionsJson) return { success: false, error: "Sections required" };

  let sections: string[];
  try {
    sections = JSON.parse(sectionsJson);
  } catch {
    return { success: false, error: "Invalid sections" };
  }

  const [existing] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.userId))
    .limit(1);

  if (existing) {
    await db
      .update(userPreferences)
      .set({ dashboardSections: sections, updatedAt: new Date() })
      .where(eq(userPreferences.id, existing.id));
  } else {
    await db.insert(userPreferences).values({
      id: crypto.randomUUID(),
      userId: session.userId,
      dashboardSections: sections,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { success: true };
}

export async function setWeightUnit(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const unit = formData.get("weightUnit");
  if (!isMassUnit(typeof unit === "string" ? unit : null)) {
    return { success: false, error: "Unsupported unit" };
  }

  const [existing] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.userId))
    .limit(1);

  if (existing) {
    await db
      .update(userPreferences)
      .set({ weightUnit: unit as string, updatedAt: new Date() })
      .where(eq(userPreferences.id, existing.id));
  } else {
    await db.insert(userPreferences).values({
      id: crypto.randomUUID(),
      userId: session.userId,
      weightUnit: unit as string,
    });
  }

  // The weight unit changes how every page renders a reading — the dashboard,
  // the metrics list, each metric's detail page and the entry form. Listing
  // paths misses the dynamic ones: revalidatePath("/metrics") does not cover
  // "/metrics/<id>", which is exactly where the readings are read.
  revalidatePath("/", "layout");
  return { success: true };
}

const TARGET_LABELS: Record<MacroKey, string> = {
  calories: "Calories",
  protein: "Protein",
  carbs: "Carbs",
  fat: "Fat",
};

export async function setFoodTargets(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const parsed = {} as FoodTargets;
  for (const key of MACRO_KEYS) {
    const value = parseTargetField(formData.get(key));
    if (value === "invalid") {
      return { success: false, error: `${TARGET_LABELS[key]} target must be a positive number, or left blank.` };
    }
    parsed[key] = value;
  }

  const columns = {
    calorieTarget: parsed.calories,
    proteinTarget: parsed.protein,
    carbsTarget: parsed.carbs,
    fatTarget: parsed.fat,
  };

  const [existing] = await db
    .select({ id: userPreferences.id })
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.userId))
    .limit(1);

  if (existing) {
    await db
      .update(userPreferences)
      .set({ ...columns, updatedAt: new Date() })
      .where(eq(userPreferences.id, existing.id));
  } else {
    await db.insert(userPreferences).values({
      id: crypto.randomUUID(),
      userId: session.userId,
      ...columns,
    });
  }

  revalidatePath("/food");
  revalidatePath("/settings");
  return { success: true };
}
