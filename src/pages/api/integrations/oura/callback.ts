import type { APIRoute } from "astro";
import { resolveSession } from "@/server/api/_lib/session";
import { db } from "@/db";
import { integrationConnections } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = await resolveSession(request);
  if (!session) return Response.redirect(new URL("/login", request.url), 302);

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || state !== session.userId) {
    return Response.json({ error: "Invalid OAuth callback" }, { status: 400 });
  }

  const clientId = process.env.OURA_CLIENT_ID!;
  const clientSecret = process.env.OURA_CLIENT_SECRET!;
  const redirectUri = `${url.origin}/api/integrations/oura/callback`;

  const tokenRes = await fetch("https://api.ouraring.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret }),
  });

  if (!tokenRes.ok) return Response.json({ error: "Token exchange failed" }, { status: 502 });

  const tokens = (await tokenRes.json()) as { access_token: string; refresh_token: string; expires_in: number };

  const existing = await db.select().from(integrationConnections).where(and(eq(integrationConnections.userId, session.userId), eq(integrationConnections.service, "oura")));

  if (existing.length > 0) {
    await db.update(integrationConnections).set({
      accessToken: tokens.access_token, refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      status: "active", lastSyncError: null, updatedAt: new Date(),
    }).where(eq(integrationConnections.id, existing[0].id));
  } else {
    await db.insert(integrationConnections).values({
      id: crypto.randomUUID(), userId: session.userId, service: "oura",
      accessToken: tokens.access_token, refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scopes: "daily heartrate workout session spo2 stress", status: "active",
    });
  }

  return Response.redirect(new URL("/account/integrations", request.url), 302);
};
