"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Bell, Check, Trash2, Film, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import {
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "@/app/actions/notifications";
import type { Notification } from "@/db/schema";

function relativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  return date.toLocaleDateString();
}

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "new_episode":
    case "release_date":
      return <Film className="h-5 w-5 shrink-0 text-muted-foreground" />;
    case "reminder":
    default:
      return <Bell className="h-5 w-5 shrink-0 text-muted-foreground" />;
  }
}

interface NotificationsClientProps {
  notifications: Notification[];
}

export function NotificationsClient({
  notifications,
}: NotificationsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const hasUnread = notifications.some((n) => !n.read);

  function handleMarkAsRead(notificationId: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("notificationId", notificationId);
      await markAsRead(formData);
      router.refresh();
    });
  }

  function handleMarkAllAsRead() {
    startTransition(async () => {
      await markAllAsRead();
      router.refresh();
    });
  }

  function handleDelete(notificationId: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("notificationId", notificationId);
      await deleteNotification(formData);
      router.refresh();
    });
  }

  function handleCardClick(href: string | null) {
    if (href) {
      router.push(href);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>
        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isPending}
            className="cursor-pointer"
          >
            <Check className="mr-1.5 h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="All caught up"
          description="You have no notifications right now."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`!flex-row items-center !gap-3 px-4 !py-3 transition-colors ${
                !notification.read
                  ? "border-l-2 border-l-primary"
                  : "opacity-75"
              } ${notification.href ? "cursor-pointer hover:bg-muted/50" : ""}`}
              onClick={() => handleCardClick(notification.href)}
            >
              <div className="shrink-0 self-center">
                <NotificationIcon type={notification.type} />
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm leading-tight ${
                    !notification.read ? "font-semibold" : "font-normal"
                  }`}
                >
                  {notification.title}
                </p>
                {notification.body && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {notification.body}
                  </p>
                )}
              </div>

              <div
                className="flex items-center gap-2 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {relativeTime(new Date(notification.createdAt))}
                </span>
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-pointer"
                    onClick={() => handleMarkAsRead(notification.id)}
                    disabled={isPending}
                    title="Mark as read"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                  onClick={() => handleDelete(notification.id)}
                  disabled={isPending}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
