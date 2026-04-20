import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { medicalLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MedicalClient } from "./medical-client";
import { PageViewToggle } from "@/components/ui/view-toggle";

export default async function MedicalPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const logs = await db
    .select()
    .from(medicalLogs)
    .where(eq(medicalLogs.userId, session.userId))
    .orderBy(desc(medicalLogs.date))
    .limit(200);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2>Medical</h2>
          <p className="text-muted-foreground mt-1">Track health, symptoms, and doctor visits</p>
        </div>
        <PageViewToggle />
      </div>
      <MedicalClient logs={logs} />
    </div>
  );
}
