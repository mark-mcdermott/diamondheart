"use server";

import { readNavItems } from "@/server/api/nav";

/** The one nav read the dashboard layout still does on the server; everything else moved to `/api/nav`. */

export async function getNavItems(userId: string) {
  return readNavItems(userId);
}

