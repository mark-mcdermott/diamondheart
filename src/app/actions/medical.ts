"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import * as medical from "@/server/api/medical";
import { asResult, type ActionResult } from "./api-result";

/** Thin wrappers over `src/server/api/medical.ts`, kept until Phase 3. */

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function run(work: (userId: string) => Promise<unknown>): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };
  const result = await asResult(() => work(session.userId));
  revalidatePath("/medical");
  return result;
}

export async function addMedicalLog(formData: FormData): Promise<ActionResult> {
  const type = text(formData, "type");
  if (!type) return { success: false, error: "Type is required" };
  const severity = text(formData, "severity");
  return run((userId) =>
    medical.createLog(userId, {
      type,
      subtype: text(formData, "subtype") || null,
      severity: severity ? Number.parseInt(severity, 10) : null,
      notes: text(formData, "notes") || null,
    })
  );
}

export async function deleteMedicalLog(formData: FormData): Promise<ActionResult> {
  return run((userId) => medical.deleteLog(userId, text(formData, "logId")));
}
