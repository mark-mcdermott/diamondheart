import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { reminderSchedules } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  await db
    .update(reminderSchedules)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(reminderSchedules.id, id), eq(reminderSchedules.userId, session.userId)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db
    .delete(reminderSchedules)
    .where(and(eq(reminderSchedules.id, id), eq(reminderSchedules.userId, session.userId)));

  return NextResponse.json({ ok: true });
}
