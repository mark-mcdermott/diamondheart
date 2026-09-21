import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RetirementPageClient } from "./retirement-page-client";

export default async function RetirementPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  return <RetirementPageClient />;
}
