import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { exchangeForLongLivedToken, fetchUserPages } from "@/lib/services/meta-api.service";

/**
 * OAuth callback handler for Meta/Facebook.
 *
 * Flow:
 * 1. Facebook redirects here with ?code=...
 * 2. We exchange the code for a short-lived user token (NextAuth handles this)
 * 3. We exchange the short-lived token for a long-lived token
 * 4. We fetch the user's pages
 * 5. We redirect to the pages UI with the data in session storage
 *
 * Note: In the current implementation, NextAuth handles the OAuth flow.
 * This route is here for future use if we need a custom OAuth flow
 * separate from NextAuth (e.g., for re-connecting pages without re-login).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userToken = searchParams.get("token");
  const error = searchParams.get("error");

  if (error) {
    const redirectUrl = new URL("/pages", request.url);
    redirectUrl.searchParams.set("error", error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!userToken) {
    const redirectUrl = new URL("/pages", request.url);
    redirectUrl.searchParams.set("error", "missing_token");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Exchange for long-lived token
    const { accessToken } = await exchangeForLongLivedToken(userToken);

    // Fetch available pages
    const pages = await fetchUserPages(accessToken);

    // Redirect to pages with data encoded
    const redirectUrl = new URL("/pages", request.url);
    redirectUrl.searchParams.set(
      "available",
      Buffer.from(JSON.stringify(pages)).toString("base64"),
    );

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error("Meta OAuth callback error:", err);
    const redirectUrl = new URL("/pages", request.url);
    redirectUrl.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(redirectUrl);
  }
}
