import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subscription } = await request.json();
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
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

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpoint } = await request.json();
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
  }

  await db
    .delete(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.userId, session.userId),
      eq(pushSubscriptions.endpoint, endpoint)
    ));

  return NextResponse.json({ success: true });
}
