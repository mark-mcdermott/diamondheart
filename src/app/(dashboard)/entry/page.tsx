import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { EntryClient } from "./entry-client";

export default async function EntryPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  return <EntryClient />;
}
