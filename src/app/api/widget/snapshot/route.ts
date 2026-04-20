import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: replace placeholder with real streak + today-progress computation.
  // Consumed by src/lib/widget-sync.ts, which forwards to the iOS Capacitor
  // plugin so the home-screen widget and watch complication stay fresh.
  return NextResponse.json({
    current: 0,
    todayCompleted: 0,
    todayTotal: 0,
    updatedAt: Date.now(),
  });
}
