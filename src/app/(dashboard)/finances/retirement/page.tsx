import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getRetirementPlans } from "@/app/actions/financial";
import { RetirementClient } from "./retirement-client";

export default async function RetirementPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const plans = await getRetirementPlans(session.userId);
  return <RetirementClient plans={plans} />;
}
