import { describe, it, expect } from "vitest";
import { generateKeyPairSync, verify } from "node:crypto";
import { apnsBody, apnsConfig, providerToken, sendApns, type ApnsConfig, type ApnsResponse, type ApnsTransport } from "@/lib/server/apns";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const config: ApnsConfig = {
  keyId: "KEY1234567",
  teamId: "TEAM123456",
  privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  bundleId: "app.diamondheart.mobile",
};

const decode = (segment: string) => JSON.parse(Buffer.from(segment, "base64url").toString()) as Record<string, unknown>;

/** Answers each host from a script and records what it was asked. */
function scripted(answers: Record<string, ApnsResponse>) {
  const calls: { host: string; deviceToken: string; headers: Record<string, string>; body: string }[] = [];
  const transport: ApnsTransport = async (host, deviceToken, headers, body) => {
    calls.push({ host, deviceToken, headers, body });
    return answers[host];
  };
  return { calls, transport };
}

describe("apnsConfig", () => {
  it("is null until the key, its id and the team are all set", () => {
    expect(apnsConfig({})).toBeNull();
    expect(apnsConfig({ APNS_KEY_ID: "k", APNS_TEAM_ID: "t" })).toBeNull();
  });

  it("restores escaped newlines in the key and defaults the bundle id", () => {
    const parsed = apnsConfig({ APNS_KEY_ID: "k", APNS_TEAM_ID: "t", APNS_PRIVATE_KEY: "-----BEGIN-----\\nabc\\n-----END-----" });
    expect(parsed).toEqual({ keyId: "k", teamId: "t", privateKey: "-----BEGIN-----\nabc\n-----END-----", bundleId: "app.diamondheart.mobile" });
  });
});

describe("providerToken", () => {
  it("is an ES256 JWT naming the key and the team, which the public key verifies", () => {
    const [header, claims, signature] = providerToken(config, 1_700_000_000_000).split(".");
    expect(decode(header)).toEqual({ alg: "ES256", kid: "KEY1234567" });
    expect(decode(claims)).toEqual({ iss: "TEAM123456", iat: 1_700_000_000 });
    const verified = verify(
      "sha256",
      Buffer.from(`${header}.${claims}`),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(signature, "base64url")
    );
    expect(verified).toBe(true);
  });
});

describe("apnsBody", () => {
  it("carries the alert and where a tap lands", () => {
    expect(JSON.parse(apnsBody({ title: "Log your weight", body: "It is 9:00", href: "/tracking" }))).toEqual({
      aps: { alert: { title: "Log your weight", body: "It is 9:00" }, sound: "default" },
      href: "/tracking",
    });
  });

  it("leaves the body out when there is none and falls back to the notifications page", () => {
    expect(JSON.parse(apnsBody({ title: "Hello" }))).toEqual({ aps: { alert: { title: "Hello" }, sound: "default" }, href: "/notifications" });
  });
});

describe("sendApns", () => {
  const payload = { title: "Hello" };

  it("sends to production with the topic and a bearer token", async () => {
    const { calls, transport } = scripted({ "api.push.apple.com": { status: 200 } });
    expect(await sendApns(config, "abc123", payload, transport)).toBe("sent");
    expect(calls).toHaveLength(1);
    expect(calls[0].deviceToken).toBe("abc123");
    expect(calls[0].headers["apns-topic"]).toBe("app.diamondheart.mobile");
    expect(calls[0].headers["apns-push-type"]).toBe("alert");
    expect(calls[0].headers.authorization).toMatch(/^bearer [\w-]+\.[\w-]+\.[\w-]+$/);
  });

  it("falls back to the sandbox for a token production does not know", async () => {
    const { calls, transport } = scripted({
      "api.push.apple.com": { status: 400, reason: "BadDeviceToken" },
      "api.sandbox.push.apple.com": { status: 200 },
    });
    expect(await sendApns(config, "abc123", payload, transport)).toBe("sent");
    expect(calls.map((call) => call.host)).toEqual(["api.push.apple.com", "api.sandbox.push.apple.com"]);
  });

  it("reports a token neither environment knows as gone", async () => {
    const { transport } = scripted({
      "api.push.apple.com": { status: 400, reason: "BadDeviceToken" },
      "api.sandbox.push.apple.com": { status: 410, reason: "Unregistered" },
    });
    expect(await sendApns(config, "abc123", payload, transport)).toBe("gone");
  });

  it("reports any other refusal as failed without trying the sandbox", async () => {
    const { calls, transport } = scripted({ "api.push.apple.com": { status: 403, reason: "InvalidProviderToken" } });
    expect(await sendApns(config, "abc123", payload, transport)).toBe("failed");
    expect(calls).toHaveLength(1);
  });
});
