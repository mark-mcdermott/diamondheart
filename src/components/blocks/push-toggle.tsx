"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";

export function PushToggle() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  // Reading `window` in the render body throws during SSR, which Next logs as a
  // ReferenceError on every settings render before falling back to the client.
  // The page worked; the noise did not, and it masks real errors.
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported("Notification" in window && "PushManager" in window);
    if (!("Notification" in window)) return;
    setPermission(Notification.permission);

    // Check if already subscribed
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setSubscribed(!!sub);
        });
      });
    }
  }, []);

  async function handleToggle() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      if (subscribed) {
        // Unsubscribe
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setSubscribed(false);
      } else {
        // Subscribe
        const result = await Notification.requestPermission();
        setPermission(result);

        if (result === "granted") {
          const vapidKey = import.meta.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (!vapidKey) return;

          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          });

          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscription: sub.toJSON() }),
          });

          setSubscribed(true);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  if (!supported) {
    return null;
  }

  const denied = permission === "denied";

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-primary" />
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--app-heading-color)" }}>
            Push Notifications
          </p>
          <p className="text-xs text-muted-foreground">
            {denied
              ? "Notifications blocked — enable in browser settings"
              : subscribed
                ? "You'll receive push notifications"
                : "Get notified about reminders and updates"}
          </p>
        </div>
      </div>
      <Switch
        checked={subscribed}
        onCheckedChange={handleToggle}
        disabled={loading || denied}
      />
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
