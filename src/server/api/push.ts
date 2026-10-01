import { sendPushToUser } from "@/lib/server/push";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { fail, handler, json } from "./_lib/http";
import { createRateLimiter } from "./_lib/rate-limit";

const TESTS_PER_WINDOW = 5;
const WINDOW_MS = 60 * 1000;
const limiter = createRateLimiter({ limit: TESTS_PER_WINDOW, windowMs: WINDOW_MS });

export const test = {
  /** Sends the caller a notification on every device they registered, and reports how it went. */
  POST: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      if (!limiter.take(userId)) return fail(429, "Too many test notifications; try again in a minute");
      const report = await sendPushToUser(userId, {
        title: "Diamondheart",
        body: "Notifications are working on this device.",
        href: "/notifications",
      });
      return json(report);
    })) satisfies ApiHandler,
};
