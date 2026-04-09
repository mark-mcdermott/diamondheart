import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.redirect(new URL("/login", request.url));

  const clientId = process.env.OURA_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "Oura not configured" }, { status: 500 });

  const { origin } = new URL(request.url);
  const redirectUri = `${origin}/api/integrations/oura/callback`;
  const scopes = "daily heartrate workout session spo2 stress";

  const ouraUrl = new URL("https://cloud.ouraring.com/oauth/authorize");
  ouraUrl.searchParams.set("client_id", clientId);
  ouraUrl.searchParams.set("redirect_uri", redirectUri);
  ouraUrl.searchParams.set("response_type", "code");
  ouraUrl.searchParams.set("scope", scopes);
  ouraUrl.searchParams.set("state", session.userId);

  return NextResponse.redirect(ouraUrl.toString());
}
