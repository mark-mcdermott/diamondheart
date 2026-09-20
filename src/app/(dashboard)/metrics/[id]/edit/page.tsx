import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MetricEditClient } from "./edit-client";

export default async function MetricEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const { id } = await params;
  return <MetricEditClient id={id} />;
}
