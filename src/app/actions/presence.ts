"use server";

import { getCurrentUser } from "@/lib/auth";
import * as meditation from "@/server/api/meditation";
import { asResult, type ActionResult } from "./api-result";

/** Thin wrappers over the presence half of `src/server/api/meditation.ts`, kept until Phase 3. */

export type MeditatingNow = meditation.MeditatingNow;

export async function pingMeditatingNow(): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };
  return asResult(() => meditation.ping(session.userId));
}

export async function stopMeditatingNow(): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };
  return asResult(() => meditation.stop(session.userId));
}

export async function getMeditatingNow(): Promise<MeditatingNow> {
  const session = await getCurrentUser();
  if (!session) return { count: 0, meditators: [] };
  return meditation.meditatingNow(session.userId);
}
