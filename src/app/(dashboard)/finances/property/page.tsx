import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProperties } from "@/app/actions/financial";
import { PropertyClient } from "./property-client";

export default async function PropertyPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const properties = await getProperties(session.userId);
  return <PropertyClient properties={properties} />;
}
