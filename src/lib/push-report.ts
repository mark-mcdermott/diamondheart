import type { PushReport } from "@/lib/server/push";

export interface PushReportSummary {
  delivered: boolean;
  message: string;
}

/** What a test push's outcome means to the person who pressed the button. */
export function summarizePushReport({ sent, failed, removed }: PushReport): PushReportSummary {
  if (sent > 0) return { delivered: true, message: sent === 1 ? "Test notification sent" : `Test notification sent to ${sent} devices` };
  if (failed > 0) return { delivered: false, message: "The notification could not be delivered. Try again shortly." };
  if (removed > 0) return { delivered: false, message: "This device's registration had expired. Reopen the app and try again." };
  return { delivered: false, message: "Nothing on this account can receive push notifications yet." };
}
