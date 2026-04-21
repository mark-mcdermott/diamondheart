"use server";

import { db } from "@/db";
import { medicalLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { success: boolean; error?: string };

export async function addMedicalLog(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const type = formData.get("type") as string;
  if (!type) return { success: false, error: "Type is required" };

  await db.insert(medicalLogs).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    type,
    subtype: (formData.get("subtype") as string) || null,
    severity: formData.get("severity") ? parseInt(formData.get("severity") as string) : null,
    notes: (formData.get("notes") as string) || null,
    date: new Date(),
    endDate: null,
  });

  revalidatePath("/medical");
  return { success: true };
}

export async function deleteMedicalLog(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const logId = formData.get("logId") as string;
  await db.delete(medicalLogs)
    .where(and(eq(medicalLogs.id, logId), eq(medicalLogs.userId, session.userId)));

  revalidatePath("/medical");
  return { success: true };
}
