import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ImportPageClient } from "./import-page-client";

export default async function ImportPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  return <ImportPageClient />;
}
