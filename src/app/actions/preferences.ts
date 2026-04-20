"use server";

import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_DASHBOARD_SECTIONS } from "@/lib/config/dashboard-sections";
import { revalidatePath } from "next/cache";

type Result = { success: boolean; error?: string };

const DEFAULT_PREFERENCES = {
  useNetflixUI: true,
  showSiteName: true,
  showMeditationInFeed: true,
} as const;

export async function getUserPreferences(userId: string) {
  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  if (!prefs) {
    return { ...DEFAULT_PREFERENCES, dashboardSections: DEFAULT_DASHBOARD_SECTIONS };
  }

  return {
    useNetflixUI: prefs.useNetflixUI,
    showSiteName: prefs.showSiteName,
    showMeditationInFeed: prefs.showMeditationInFeed,
    dashboardSections: (prefs.dashboardSections as string[] | null) ?? DEFAULT_DASHBOARD_SECTIONS,
  };
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
