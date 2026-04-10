import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getNotifications } from "@/app/actions/notifications";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const notifications = await getNotifications(session.userId);

  return <NotificationsClient notifications={notifications} />;
}
