import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { InvestmentsPageClient } from "./investments-page-client";

export default async function InvestmentsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  return <InvestmentsPageClient />;
}
