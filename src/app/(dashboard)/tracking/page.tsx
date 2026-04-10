import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { trackingItems } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TrackingClient } from "./tracking-client";

export default async function TrackingPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const items = await db
    .select()
    .from(trackingItems)
    .where(eq(trackingItems.userId, session.userId))
    .orderBy(asc(trackingItems.category), asc(trackingItems.name));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2>Tracking</h2>
          <p className="text-muted-foreground mt-1">Track collections, hobbies, and misc stuff</p>
        </div>
      </div>
      <TrackingClient items={items} />
    </div>
  );
}
