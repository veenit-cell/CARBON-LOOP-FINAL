import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

const GOOGLE_FITNESS_ACTIVITY_SCOPE = "https://www.googleapis.com/auth/fitness.activity.read";

/**
 * Initiates Google Health API OAuth 2.0 Authorization Flow.
 *
 * Scopes requested: ONLY activity/fitness read permission needed for steps & activity.
 * Redirect URI: http://localhost:3000/api/auth/callback/google
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/callback/google`;

  if (!clientId || clientId.trim() === "") {
    return NextResponse.json(
      {
        status: "NEEDS_CONFIGURATION",
        message: "GOOGLE_CLIENT_ID is not configured in .env.local.",
        instruction: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local to enable real Google Health OAuth authorization.",
        registeredCallbackUrl: redirectUri,
        requestedScope: GOOGLE_FITNESS_ACTIVITY_SCOPE,
      },
      { status: 200 },
    );
  }

  const user = await getSessionUser();

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", GOOGLE_FITNESS_ACTIVITY_SCOPE);
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "consent");
  if (user) {
    googleAuthUrl.searchParams.set("state", user.id);
  }

  return NextResponse.redirect(googleAuthUrl.toString());
}
