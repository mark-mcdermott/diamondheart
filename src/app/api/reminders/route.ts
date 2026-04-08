import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { reminderSchedules } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reminders = await db
    .select()
    .from(reminderSchedules)
    .where(eq(reminderSchedules.userId, session.userId));

  return NextResponse.json(reminders);
}

export async function POST(request: Request) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { label, time, days, timezone, metricId } = body;

  if (!label || !time || !days) {
    return NextResponse.json({ error: "Label, time, and days are required" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await db.insert(reminderSchedules).values({
    id,
    userId: session.userId,
    metricId: metricId || null,
    label,
    time,
    days,
    timezone: timezone || "America/Chicago",
    enabled: true,
  });

  return NextResponse.json({ ok: true, id });
}
