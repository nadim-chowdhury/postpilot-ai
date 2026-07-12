import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const callbackUrl = `${request.nextUrl.origin}/api/auth/twitter/callback`;

  if (!clientId) {
    // In dev / mock mode, redirect straight to callback with a mock code
    const devUrl = new URL(callbackUrl, request.url);
    devUrl.searchParams.set("code", "mock_twitter_code");
    devUrl.searchParams.set("state", "mock_state");
    return NextResponse.redirect(devUrl);
  }

  // Real OAuth flow redirect
  const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("scope", "tweet.read tweet.write users.read offline.access");
  authUrl.searchParams.set("state", "state_123");
  authUrl.searchParams.set("code_challenge", "challenge");
  authUrl.searchParams.set("code_challenge_method", "plain");

  return NextResponse.redirect(authUrl);
}
