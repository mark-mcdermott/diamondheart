import { useEffect, useState, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { api, apiFetch } from "@/app/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { nativePushPermission, syncDeviceToken, type NativePushPermission } from "@/lib/native-push";
import { summarizePushReport } from "@/lib/push-report";

const headingStyle = { color: "var(--app-heading-color)" };

/** Browsers subscribe through the service worker; the native shells register with APNs or FCM. */
export function PushToggle() {
  return Capacitor.isNativePlatform() ? <NativePush /> : <WebPush />;
}

function PushRow({ description, control }: { description: string; control: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium" style={headingStyle}>
            Push Notifications
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {control}
    </div>
  );
}

function TestPushRow() {
  const test = useApiMutation({
    mutationFn: api.push.test,
    invalidates: [],
    onSuccess: (report) => {
      const { delivered, message } = summarizePushReport(report);
      if (delivered) toast.success(message);
      else toast.error(message);
    },
  });

  return (
    <div className="flex items-center justify-between gap-4 border-t border-border py-3">
      <p className="text-xs text-muted-foreground">Check that notifications reach this device.</p>
      <Button variant="outline" size="sm" disabled={test.isPending} onClick={() => test.mutate()}>
        {test.isPending ? "Sending..." : "Send test"}
      </Button>
    </div>
  );
}

const NATIVE_DESCRIPTIONS: Record<NativePushPermission, string> = {
  granted: "On for this device",
  denied: "Blocked. Turn them on in Settings, under Notifications.",
  prompt: "Get notified about reminders and updates",
};

function NativePush() {
  const [permission, setPermission] = useState<NativePushPermission | null>(null);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    void nativePushPermission().then(setPermission);
  }, []);

  if (!permission) return null;

  async function enable() {
    setEnabling(true);
    try {
      await syncDeviceToken();
      setPermission(await nativePushPermission());
    } finally {
      setEnabling(false);
    }
  }

  return (
    <>
      <PushRow
        description={NATIVE_DESCRIPTIONS[permission]}
        control={
          permission === "prompt" && (
            <Button size="sm" disabled={enabling} onClick={enable}>
              {enabling ? "Turning on..." : "Turn on"}
            </Button>
          )
        }
      />
      {permission === "granted" && <TestPushRow />}
    </>
  );
}

function WebPush() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported("Notification" in window && "PushManager" in window);
    if (!("Notification" in window)) return;
    setPermission(Notification.permission);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((sub) => setSubscribed(!!sub));
    }
  }, []);

  async function handleToggle() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      if (subscribed) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await apiFetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setSubscribed(false);
        return;
      }

      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return;

      const vapidKey = import.meta.env.PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await apiFetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      setSubscribed(true);
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  const denied = permission === "denied";
  const description = denied
    ? "Notifications blocked — enable in browser settings"
    : subscribed
      ? "You'll receive push notifications"
      : "Get notified about reminders and updates";

  return (
    <>
      <PushRow description={description} control={<Switch checked={subscribed} onCheckedChange={handleToggle} disabled={loading || denied} />} />
      {subscribed && <TestPushRow />}
    </>
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
