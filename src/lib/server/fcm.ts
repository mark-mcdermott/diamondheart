import { sign } from "node:crypto";
import type { DeliveryOutcome, PushPayload } from "./push";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
/** Google's access tokens last an hour; refresh a little early. */
const ACCESS_TOKEN_MARGIN_MS = 60_000;

export interface FcmConfig {
  projectId: string;
  clientEmail: string;
  /** The service account's PEM private key. */
  privateKey: string;
}

type Fetch = typeof fetch;

/** Null when the deployment has no Firebase service account, or one that is not valid JSON. */
export function fcmConfig(env: NodeJS.ProcessEnv = process.env): FcmConfig | null {
  if (!env.FCM_SERVICE_ACCOUNT) return null;
  try {
    const account: unknown = JSON.parse(env.FCM_SERVICE_ACCOUNT);
    if (!account || typeof account !== "object") return null;
    const { project_id: projectId, client_email: clientEmail, private_key: privateKey } = account as Record<string, unknown>;
    if (typeof projectId !== "string" || typeof clientEmail !== "string" || typeof privateKey !== "string") return null;
    return { projectId, clientEmail, privateKey };
  } catch {
    return null;
  }
}

const base64url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

export function serviceAccountAssertion(config: FcmConfig, now = Date.now()): string {
  const issuedAt = Math.floor(now / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({ iss: config.clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: issuedAt, exp: issuedAt + 3600 }));
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${claims}`), config.privateKey);
  return `${header}.${claims}.${base64url(signature)}`;
}

let cachedAccess: { clientEmail: string; value: string; expiresAt: number } | null = null;

async function accessToken(config: FcmConfig, fetcher: Fetch, now = Date.now()): Promise<string> {
  if (cachedAccess && cachedAccess.clientEmail === config.clientEmail && cachedAccess.expiresAt - ACCESS_TOKEN_MARGIN_MS > now) {
    return cachedAccess.value;
  }
  const response = await fetcher(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: serviceAccountAssertion(config, now) }),
  });
  if (!response.ok) throw new Error(`Google refused the service account: ${response.status}`);
  const { access_token: value, expires_in: expiresIn } = (await response.json()) as { access_token: string; expires_in: number };
  cachedAccess = { clientEmail: config.clientEmail, value, expiresAt: now + expiresIn * 1000 };
  return value;
}

export function fcmBody(deviceToken: string, payload: PushPayload): string {
  return JSON.stringify({
    message: {
      token: deviceToken,
      notification: { title: payload.title, ...(payload.body ? { body: payload.body } : {}) },
      data: { href: payload.href ?? "/notifications" },
    },
  });
}

/**
 * FCM answers 404 for a token that was unregistered. A 400 is not treated the
 * same way: it also covers a malformed message, and a bug in the payload must
 * not delete every Android token on file.
 */
const isUnknownToken = (status: number) => status === 404;

export async function sendFcm(config: FcmConfig, deviceToken: string, payload: PushPayload, fetcher: Fetch = fetch): Promise<DeliveryOutcome> {
  const response = await fetcher(`https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`, {
    method: "POST",
    headers: { authorization: `Bearer ${await accessToken(config, fetcher)}`, "content-type": "application/json" },
    body: fcmBody(deviceToken, payload),
  });
  if (response.ok) return "sent";
  if (isUnknownToken(response.status)) return "gone";
  console.error(`FCM refused a push: ${response.status}`);
  return "failed";
}
