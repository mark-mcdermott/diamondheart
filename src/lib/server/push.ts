import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { deviceTokens, pushSubscriptions } from "@/db/schema";
import { apnsConfig, sendApns } from "./apns";
import { fcmConfig, sendFcm } from "./fcm";
import { sendWebPush, vapidConfig } from "./web-push";

export interface PushPayload {
  title: string;
  body?: string;
  /** Where a tap lands; the notifications page when left out. */
  href?: string;
}

/** "gone" is the push service saying the address no longer exists, so it is dropped. */
export type DeliveryOutcome = "sent" | "gone" | "failed";

export interface PushReport {
  sent: number;
  failed: number;
  removed: number;
}

const attempt = (delivery: Promise<DeliveryOutcome>): Promise<DeliveryOutcome> =>
  delivery.catch((cause: unknown) => {
    console.error("Push delivery failed:", cause);
    return "failed";
  });

const idsWhereGone = (rows: { id: string }[], outcomes: (DeliveryOutcome | null)[]) => rows.filter((_, index) => outcomes[index] === "gone").map((row) => row.id);

/**
 * Pushes to every place a user can be reached: browser subscriptions over web
 * push, iPhones over APNs, Android over FCM. A channel the deployment holds no
 * credentials for is skipped, not failed, and only an address its own service
 * disowns is deleted — a missing key or an outage must not cost anyone their
 * registration.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<PushReport> {
  const [subscriptions, devices] = await Promise.all([
    db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)),
    db.select().from(deviceTokens).where(eq(deviceTokens.userId, userId)),
  ]);
  const vapid = vapidConfig();
  const apns = apnsConfig();
  const fcm = fcmConfig();

  const [subscriptionOutcomes, deviceOutcomes] = await Promise.all([
    Promise.all(subscriptions.map((subscription) => (vapid ? attempt(sendWebPush(vapid, subscription, payload)) : null))),
    Promise.all(
      devices.map((device) => {
        if (device.platform === "ios") return apns ? attempt(sendApns(apns, device.token, payload)) : null;
        return fcm ? attempt(sendFcm(fcm, device.token, payload)) : null;
      })
    ),
  ]);

  const goneSubscriptions = idsWhereGone(subscriptions, subscriptionOutcomes);
  const goneDevices = idsWhereGone(devices, deviceOutcomes);
  await Promise.all([
    goneSubscriptions.length > 0 && db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, goneSubscriptions)),
    goneDevices.length > 0 && db.delete(deviceTokens).where(inArray(deviceTokens.id, goneDevices)),
  ]);

  const outcomes = [...subscriptionOutcomes, ...deviceOutcomes];
  const count = (outcome: DeliveryOutcome) => outcomes.filter((each) => each === outcome).length;
  return { sent: count("sent"), failed: count("failed"), removed: count("gone") };
}
