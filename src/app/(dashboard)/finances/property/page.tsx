import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PropertyPageClient } from "./property-page-client";

export default async function PropertyPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  return <PropertyPageClient />;
}
