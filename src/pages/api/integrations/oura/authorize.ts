import type { APIRoute } from "astro";
import { resolveSession } from "@/server/api/_lib/session";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = await resolveSession(request);
  if (!session) return Response.redirect(new URL("/login", request.url), 302);

  const clientId = process.env.OURA_CLIENT_ID;
  if (!clientId) return Response.json({ error: "Oura not configured" }, { status: 500 });

  const { origin } = new URL(request.url);
  const redirectUri = `${origin}/api/integrations/oura/callback`;
  const scopes = "daily heartrate workout session spo2 stress";

  const ouraUrl = new URL("https://cloud.ouraring.com/oauth/authorize");
  ouraUrl.searchParams.set("client_id", clientId);
  ouraUrl.searchParams.set("redirect_uri", redirectUri);
  ouraUrl.searchParams.set("response_type", "code");
  ouraUrl.searchParams.set("scope", scopes);
  ouraUrl.searchParams.set("state", session.userId);

  return Response.redirect(ouraUrl.toString(), 302);
};
