import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppointmentsClient } from "./appointments-client";

export default async function AppointmentsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const items = await db
    .select()
    .from(appointments)
    .where(eq(appointments.userId, session.userId))
    .orderBy(desc(appointments.date));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2>Appointments</h2>
          <p className="text-muted-foreground mt-1">Track upcoming and past appointments</p>
        </div>
      </div>
      <AppointmentsClient appointments={items} />
    </div>
  );
}
