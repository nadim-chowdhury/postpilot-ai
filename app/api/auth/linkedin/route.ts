import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const callbackUrl = `${request.nextUrl.origin}/api/auth/linkedin/callback`;

  if (!clientId) {
    const devUrl = new URL(callbackUrl, request.url);
    devUrl.searchParams.set("code", "mock_linkedin_code");
    return NextResponse.redirect(devUrl);
  }

  const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("scope", "w_member_social r_liteprofile");
  authUrl.searchParams.set("state", "state_123");

  return NextResponse.redirect(authUrl);
}
