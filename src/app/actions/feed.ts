"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import * as feed from "@/server/api/feed";
import { asResult, type ActionResult } from "./api-result";

/** Thin wrappers over `src/server/api/feed.ts`, kept until Phase 3. */

export type FeedItem = feed.FeedItem;

export async function getCommunityFeed(currentUserId: string): Promise<FeedItem[]> {
  return feed.communityFeed(currentUserId);
}

export async function toggleReaction(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const sessionId = formData.get("sessionId");
  if (typeof sessionId !== "string" || !sessionId || sessionId.length > 64) return { success: false, error: "Invalid session ID" };

  const current = (await feed.communityFeed(session.userId)).find((i) => i.sessionId === sessionId);
  const result = await asResult(() => feed.setReaction(session.userId, sessionId, !(current?.reactedByMe ?? false)));
  revalidatePath("/feed");
  return result;
}
