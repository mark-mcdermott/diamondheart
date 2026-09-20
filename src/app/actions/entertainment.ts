"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import * as entertainment from "@/server/api/entertainment";
import { asResult, type ActionResult } from "./api-result";

/** Thin wrappers over `src/server/api/entertainment.ts`, kept until Phase 3. */

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function intOrNull(formData: FormData, key: string): number | null {
  const raw = text(formData, key);
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function dateOrNull(formData: FormData, key: string): Date | null {
  const raw = text(formData, key);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function run(work: (userId: string) => Promise<unknown>): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };
  const result = await asResult(() => work(session.userId));
  revalidatePath("/entertainment");
  return result;
}

const META = ["imdbId", "posterUrl", "overview", "releaseDate", "genres", "voteAverage"] as const;
const COUNTS = ["seasonCount", "episodeCount", "runtime"] as const;

export async function addEntertainment(formData: FormData): Promise<ActionResult> {
  const title = text(formData, "title");
  const type = text(formData, "type");
  if (!title || !type) return { success: false, error: "Title and type are required" };
  return run((userId) =>
    entertainment.createItem(userId, {
      type,
      title,
      creator: text(formData, "creator") || null,
      status: text(formData, "status") || "completed",
      rating: intOrNull(formData, "rating"),
      notes: text(formData, "notes") || null,
      startDate: dateOrNull(formData, "startDate"),
      endDate: dateOrNull(formData, "endDate"),
      ...Object.fromEntries(META.map((k) => [k, text(formData, k) || null])),
      ...Object.fromEntries(COUNTS.map((k) => [k, intOrNull(formData, k)])),
    })
  );
}

export async function updateEntertainment(formData: FormData): Promise<ActionResult> {
  const itemId = text(formData, "itemId");
  if (!itemId) return { success: false, error: "Item ID required" };
  // Only what the form carries a value for changes; rating and notes are always sent, so they may clear.
  const patch: Record<string, unknown> = { rating: intOrNull(formData, "rating"), notes: text(formData, "notes") || null };
  if (text(formData, "title")) patch.title = text(formData, "title");
  if (text(formData, "status")) patch.status = text(formData, "status");
  for (const key of META) if (text(formData, key)) patch[key] = text(formData, key);
  for (const key of COUNTS) {
    const n = intOrNull(formData, key);
    if (n !== null) patch[key] = n;
  }
  return run((userId) => entertainment.updateItem(userId, itemId, patch));
}

export async function deleteEntertainment(formData: FormData): Promise<ActionResult> {
  return run((userId) => entertainment.deleteItem(userId, text(formData, "itemId")));
}
