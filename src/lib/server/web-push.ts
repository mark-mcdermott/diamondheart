import webPush, { WebPushError } from "web-push";
import type { PushSubscription } from "@/db/schema";
import type { DeliveryOutcome, PushPayload } from "./push";

const DEFAULT_APP_URL = "https://www.diamondheart.app";
const ICON = "/icons/icon-192.png";

export interface VapidConfig {
  subject: string;
  publicKey: string;
  privateKey: string;
}

/** Null when the deployment has no VAPID key pair. */
export function vapidConfig(env: NodeJS.ProcessEnv = process.env): VapidConfig | null {
  const { PUBLIC_VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey } = env;
  if (!publicKey || !privateKey) return null;
  return { subject: env.PUBLIC_APP_URL || DEFAULT_APP_URL, publicKey, privateKey };
}

/** The shape `public/sw.js` reads in its `push` listener. */
export function webPushBody(payload: PushPayload): string {
  return JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    icon: ICON,
    badge: ICON,
    data: { href: payload.href ?? "/notifications" },
  });
}

/** A push service answers 404 or 410 for a subscription the browser has dropped. */
const isExpired = (cause: unknown) => cause instanceof WebPushError && (cause.statusCode === 404 || cause.statusCode === 410);

export async function sendWebPush(config: VapidConfig, subscription: PushSubscription, payload: PushPayload): Promise<DeliveryOutcome> {
  try {
    await webPush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      webPushBody(payload),
      { vapidDetails: config }
    );
    return "sent";
  } catch (cause) {
    if (isExpired(cause)) return "gone";
    throw cause;
  }
}
