"use server";

import { readPreferences } from "@/server/api/preferences";

/**
 * Reads live in `src/server/api/preferences.ts`; this stays for the pages
 * that still render preferences on the server. Every write moved to
 * `PATCH /api/preferences` with the settings page (docs/PORT-PLAN.md, Phase 3).
 */
export async function getUserPreferences(userId: string) {
  return readPreferences(userId);
}
