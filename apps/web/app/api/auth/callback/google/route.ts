import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

/**
 * Google OAuth / Google Health Callback Route
 *
 * Exact Redirect URI to register in Google Cloud Console:
 * http://localhost:3000/api/auth/callback/google
 * (or https://<your-domain>/api/auth/callback/google in production)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const scope = searchParams.get("scope");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/callback/google`;

  // Check user session (if logged in)
  const user = await getSessionUser();

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard?google_health=error&reason=${encodeURIComponent(error)}`, baseUrl),
    );
  }

  if (!code) {
    return NextResponse.json(
      {
        status: "error",
        message: "No authorization code provided in Google OAuth callback.",
        registeredCallbackUrl: redirectUri,
      },
      { status: 400 },
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  let tokenData = null;
  let tokenError = null;

  if (clientId && clientSecret) {
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (response.ok) {
        tokenData = await response.json();
      } else {
        const errJson = await response.json().catch(() => ({}));
        tokenError = errJson.error_description || "Failed to exchange authorization code for tokens.";
      }
    } catch (err) {
      tokenError = err instanceof Error ? err.message : "Token exchange request failed.";
    }
  }

  // Redirect back to dashboard with status parameters
  const redirectUrl = new URL("/dashboard", baseUrl);
  redirectUrl.searchParams.set("google_health", "connected");
  if (scope) redirectUrl.searchParams.set("scope", scope);
  if (user) redirectUrl.searchParams.set("user", user.id);
  if (tokenError) redirectUrl.searchParams.set("token_error", tokenError);
  if (!clientId || !clientSecret) redirectUrl.searchParams.set("note", "NEEDS_CONFIGURATION_ENV_KEYS");

  return NextResponse.redirect(redirectUrl);
}
