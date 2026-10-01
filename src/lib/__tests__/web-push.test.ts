import { describe, it, expect } from "vitest";
import { vapidConfig, webPushBody } from "@/lib/server/web-push";

describe("vapidConfig", () => {
  it("is null until both halves of the key pair are set", () => {
    expect(vapidConfig({})).toBeNull();
    expect(vapidConfig({ PUBLIC_VAPID_PUBLIC_KEY: "public" })).toBeNull();
  });

  it("uses the app URL as the subject, falling back to the canonical domain", () => {
    const keys = { PUBLIC_VAPID_PUBLIC_KEY: "public", VAPID_PRIVATE_KEY: "private" };
    expect(vapidConfig(keys)).toEqual({ subject: "https://www.diamondheart.app", publicKey: "public", privateKey: "private" });
    expect(vapidConfig({ ...keys, PUBLIC_APP_URL: "https://preview.example" })?.subject).toBe("https://preview.example");
  });
});

describe("webPushBody", () => {
  it("is the shape the service worker's push listener reads", () => {
    expect(JSON.parse(webPushBody({ title: "Log your weight", href: "/tracking" }))).toEqual({
      title: "Log your weight",
      body: "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { href: "/tracking" },
    });
  });
});
