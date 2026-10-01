import { describe, it, expect } from "vitest";
import { generateKeyPairSync, verify } from "node:crypto";
import { fcmBody, fcmConfig, sendFcm, serviceAccountAssertion, type FcmConfig } from "@/lib/server/fcm";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

const decode = (segment: string) => JSON.parse(Buffer.from(segment, "base64url").toString()) as Record<string, unknown>;

/** A `fetch` that grants an access token and answers the send with the given status. */
function google(sendStatus: number) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.startsWith("https://oauth2.googleapis.com/")) return Response.json({ access_token: "ya29.test", expires_in: 3600 });
    return new Response("{}", { status: sendStatus });
  };
  return { calls, fetcher };
}

/** Each test signs in as its own service account, so the cached access token never crosses tests. */
const account = (name: string): FcmConfig => ({ projectId: "diamondheart-test", clientEmail: `${name}@diamondheart-test.iam.gserviceaccount.com`, privateKey: pem });

describe("fcmConfig", () => {
  it("is null without a service account, or with one that is not usable", () => {
    expect(fcmConfig({})).toBeNull();
    expect(fcmConfig({ FCM_SERVICE_ACCOUNT: "not json" })).toBeNull();
    expect(fcmConfig({ FCM_SERVICE_ACCOUNT: JSON.stringify({ project_id: "p" }) })).toBeNull();
  });

  it("reads the project, the account and its key", () => {
    const env = { FCM_SERVICE_ACCOUNT: JSON.stringify({ project_id: "p", client_email: "a@b.c", private_key: "key", type: "service_account" }) };
    expect(fcmConfig(env)).toEqual({ projectId: "p", clientEmail: "a@b.c", privateKey: "key" });
  });
});

describe("serviceAccountAssertion", () => {
  it("is an RS256 JWT for the messaging scope, which the public key verifies", () => {
    const [header, claims, signature] = serviceAccountAssertion(account("assertion"), 1_700_000_000_000).split(".");
    expect(decode(header)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(decode(claims)).toEqual({
      iss: "assertion@diamondheart-test.iam.gserviceaccount.com",
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    });
    expect(verify("RSA-SHA256", Buffer.from(`${header}.${claims}`), publicKey, Buffer.from(signature, "base64url"))).toBe(true);
  });
});

describe("fcmBody", () => {
  it("addresses the token and carries where a tap lands as data", () => {
    expect(JSON.parse(fcmBody("fcm-token", { title: "Log your weight", body: "It is 9:00", href: "/tracking" }))).toEqual({
      message: { token: "fcm-token", notification: { title: "Log your weight", body: "It is 9:00" }, data: { href: "/tracking" } },
    });
  });
});

describe("sendFcm", () => {
  const payload = { title: "Hello" };

  it("exchanges the assertion for an access token and sends to the project", async () => {
    const { calls, fetcher } = google(200);
    expect(await sendFcm(account("sent"), "fcm-token", payload, fetcher)).toBe("sent");
    expect(calls.map((call) => call.url)).toEqual([
      "https://oauth2.googleapis.com/token",
      "https://fcm.googleapis.com/v1/projects/diamondheart-test/messages:send",
    ]);
    expect(new Headers(calls[1].init?.headers).get("authorization")).toBe("Bearer ya29.test");
  });

  it("reuses the access token for the next send", async () => {
    const { calls, fetcher } = google(200);
    const config = account("reused");
    await sendFcm(config, "one", payload, fetcher);
    await sendFcm(config, "two", payload, fetcher);
    expect(calls.filter((call) => call.url.startsWith("https://oauth2.googleapis.com/"))).toHaveLength(1);
  });

  it("reports an unregistered token as gone", async () => {
    expect(await sendFcm(account("gone"), "fcm-token", payload, google(404).fetcher)).toBe("gone");
  });

  it("reports a rejected message as failed, so a bad payload cannot delete tokens", async () => {
    expect(await sendFcm(account("failed"), "fcm-token", payload, google(400).fetcher)).toBe("failed");
  });
});
