import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { saveGoogleHealthConnection } from "@/lib/db";

/**
 * Google Health API OAuth 2.0 Callback Route
 *
 * Exact Redirect URI registered in Google Cloud:
 * http://localhost:3000/api/auth/callback/google
 *
 * Server-side exchange of code for tokens. Never exposes client secret.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const scope = searchParams.get("scope") || "https://www.googleapis.com/auth/fitness.activity.read";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/callback/google`;

  // Authenticated user session check
  const user = await getSessionUser();

  if (error) {
    return NextResponse.redirect(
      new URL(`/profile?google_health=error&reason=${encodeURIComponent(error)}`, baseUrl),
    );
  }

  if (!code) {
    return NextResponse.json(
      {
        status: "error",
        message: "No authorization code provided in Google Health OAuth callback.",
        registeredCallbackUrl: redirectUri,
        requiredScope: "https://www.googleapis.com/auth/fitness.activity.read",
      },
      { status: 400 },
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  let tokenData: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  } | null = null;
  let tokenError: string | null = null;

  if (clientId && clientSecret) {
    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
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

      if (tokenResponse.ok) {
        tokenData = await tokenResponse.json();
      } else {
        const errJson = await tokenResponse.json().catch(() => ({}));
        tokenError = errJson.error_description || "Failed to exchange authorization code for tokens.";
      }
    } catch (err) {
      tokenError = err instanceof Error ? err.message : "Token exchange request failed.";
    }
  }

  // Save connection status for user in database (if authenticated)
  if (user) {
    saveGoogleHealthConnection(user.id, {
      accessToken: tokenData?.access_token,
      refreshToken: tokenData?.refresh_token,
      expiresIn: tokenData?.expires_in,
      scope: tokenData?.scope || scope,
    });
  }

  // Redirect to profile page with connection success/status
  const redirectUrl = new URL("/profile", baseUrl);
  redirectUrl.searchParams.set("google_health", "connected");
  if (tokenError) {
    redirectUrl.searchParams.set("token_error", tokenError);
  }
  if (!clientId || !clientSecret) {
    redirectUrl.searchParams.set("note", "NEEDS_CONFIGURATION_ENV_KEYS");
  }

  return NextResponse.redirect(redirectUrl);
}
