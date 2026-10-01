import { createPrivateKey, sign } from "node:crypto";
import { connect } from "node:http2";
import type { DeliveryOutcome, PushPayload } from "./push";

const PRODUCTION_HOST = "api.push.apple.com";
const SANDBOX_HOST = "api.sandbox.push.apple.com";
const DEFAULT_BUNDLE_ID = "app.diamondheart.mobile";
/** Apple rejects a provider token older than an hour and throttles ones minted too often. */
const PROVIDER_TOKEN_TTL_MS = 50 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;

export interface ApnsConfig {
  keyId: string;
  teamId: string;
  /** The `.p8` key's PEM text. */
  privateKey: string;
  bundleId: string;
}

export interface ApnsResponse {
  status: number;
  /** Apple's `reason` string on a failure, e.g. `BadDeviceToken`. */
  reason?: string;
}

export type ApnsTransport = (host: string, deviceToken: string, headers: Record<string, string>, body: string) => Promise<ApnsResponse>;

/** Null when the deployment has no APNs key, which is every environment until one is added. */
export function apnsConfig(env: NodeJS.ProcessEnv = process.env): ApnsConfig | null {
  const { APNS_KEY_ID: keyId, APNS_TEAM_ID: teamId, APNS_PRIVATE_KEY: privateKey } = env;
  if (!keyId || !teamId || !privateKey) return null;
  // A PEM pasted into a dashboard field often arrives with its newlines escaped.
  return { keyId, teamId, privateKey: privateKey.replace(/\\n/g, "\n"), bundleId: env.APNS_BUNDLE_ID || DEFAULT_BUNDLE_ID };
}

const base64url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

export function providerToken(config: ApnsConfig, now = Date.now()): string {
  const header = base64url(JSON.stringify({ alg: "ES256", kid: config.keyId }));
  const claims = base64url(JSON.stringify({ iss: config.teamId, iat: Math.floor(now / 1000) }));
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), {
    key: createPrivateKey(config.privateKey),
    dsaEncoding: "ieee-p1363",
  });
  return `${header}.${claims}.${base64url(signature)}`;
}

let cachedToken: { keyId: string; value: string; mintedAt: number } | null = null;

function reusableProviderToken(config: ApnsConfig, now = Date.now()): string {
  if (!cachedToken || cachedToken.keyId !== config.keyId || now - cachedToken.mintedAt > PROVIDER_TOKEN_TTL_MS) {
    cachedToken = { keyId: config.keyId, value: providerToken(config, now), mintedAt: now };
  }
  return cachedToken.value;
}

export function apnsBody(payload: PushPayload): string {
  return JSON.stringify({
    aps: { alert: { title: payload.title, ...(payload.body ? { body: payload.body } : {}) }, sound: "default" },
    href: payload.href ?? "/notifications",
  });
}

const http2Transport: ApnsTransport = (host, deviceToken, headers, body) =>
  new Promise((resolve, reject) => {
    const session = connect(`https://${host}`);
    const fail = (cause: unknown) => {
      session.destroy();
      reject(cause);
    };
    session.on("error", fail);

    const stream = session.request({ ":method": "POST", ":path": `/3/device/${deviceToken}`, ...headers });
    stream.setTimeout(REQUEST_TIMEOUT_MS, () => fail(new Error("APNs request timed out")));
    stream.on("error", fail);

    let status = 0;
    let raw = "";
    stream.on("response", (responseHeaders) => {
      status = Number(responseHeaders[":status"]);
    });
    stream.setEncoding("utf8");
    stream.on("data", (chunk: string) => {
      raw += chunk;
    });
    stream.on("end", () => {
      session.close();
      resolve({ status, reason: parseReason(raw) });
    });
    stream.end(body);
  });

function parseReason(raw: string): string | undefined {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "reason" in parsed && typeof parsed.reason === "string") return parsed.reason;
  } catch {
    // Apple answers JSON; anything else carries no reason worth reading.
  }
  return undefined;
}

const isUnknownToken = ({ status, reason }: ApnsResponse) => status === 410 || (status === 400 && reason === "BadDeviceToken");

/**
 * Sends one alert. A token is only valid on the environment that issued it —
 * a build run from Xcode gets a sandbox token, TestFlight and the App Store a
 * production one — and the token itself does not say which, so production is
 * tried first and the sandbox second. "gone" means neither knows the token.
 */
export async function sendApns(
  config: ApnsConfig,
  deviceToken: string,
  payload: PushPayload,
  transport: ApnsTransport = http2Transport
): Promise<DeliveryOutcome> {
  const headers = {
    authorization: `bearer ${reusableProviderToken(config)}`,
    "apns-topic": config.bundleId,
    "apns-push-type": "alert",
    "apns-priority": "10",
  };
  const body = apnsBody(payload);

  for (const host of [PRODUCTION_HOST, SANDBOX_HOST]) {
    const response = await transport(host, deviceToken, headers, body);
    if (response.status === 200) return "sent";
    if (!isUnknownToken(response)) {
      console.error(`APNs refused a push: ${response.status} ${response.reason ?? ""}`.trim());
      return "failed";
    }
  }
  return "gone";
}
