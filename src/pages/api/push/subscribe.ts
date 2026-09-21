import type { APIRoute } from "astro";
import { resolveSession } from "@/server/api/_lib/session";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const session = await resolveSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subscription } = await request.json();
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return Response.json({ error: "Invalid subscription" }, { status: 400 });
  }

  // Check if this endpoint already exists for this user
  const [existing] = await db
    .select()
    .from(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.userId, session.userId),
      eq(pushSubscriptions.endpoint, subscription.endpoint)
    ))
    .limit(1);

  if (!existing) {
    await db.insert(pushSubscriptions).values({
      id: crypto.randomUUID(),
      userId: session.userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });
  }

  return Response.json({ success: true });
};

export const DELETE: APIRoute = async ({ request }) => {
  const session = await resolveSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpoint } = await request.json();
  if (!endpoint) {
    return Response.json({ error: "Endpoint required" }, { status: 400 });
  }

  await db
    .delete(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.userId, session.userId),
      eq(pushSubscriptions.endpoint, endpoint)
    ));

  return Response.json({ success: true });
};
