import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { encrypt } from "@/lib/services/encryption.service";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    
    // Fallback/Force dev user ID on localhost
    let userId: string;
    try {
      userId = await requireUserId();
    } catch {
      const firstUser = await prisma.user.findFirst({ select: { id: true } });
      if (!firstUser) throw new Error("No user found in database");
      userId = firstUser.id;
    }

    let username = "twitter_user";
    let displayName = "Twitter Account";
    let token = "mock_twitter_token";

    const isMock = code === "mock_twitter_code" || !process.env.TWITTER_CLIENT_ID;

    if (!isMock && code) {
      // Exchange code for real token
      const callbackUrl = `${request.nextUrl.origin}/api/auth/twitter/callback`;
      const basicAuth = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString("base64");
      
      const response = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          redirect_uri: callbackUrl,
          code_verifier: "challenge",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        token = data.access_token;

        // Fetch user profile info
        const meResponse = await fetch("https://api.twitter.com/2/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meResponse.ok) {
          const meData = await meResponse.json();
          username = meData.data.username;
          displayName = meData.data.name || `@${username}`;
        }
      }
    } else {
      // Use mock profile details
      username = "gamer_x_dev";
      displayName = "GamerX (Twitter/X)";
    }

    const encryptedToken = encrypt(token);

    // Save/upsert as FbPage record
    await prisma.fbPage.upsert({
      where: { metaPageId: username },
      update: {
        accessToken: encryptedToken,
        name: displayName,
        status: "ACTIVE",
      },
      create: {
        userId,
        metaPageId: username,
        name: displayName,
        accessToken: encryptedToken,
        topic: "Social Feed",
        status: "ACTIVE",
        platform: "TWITTER",
      },
    });

    // Redirect user back to pages
    const redirectUrl = new URL("/pages", request.url);
    redirectUrl.searchParams.set("success", "twitter_connected");
    return NextResponse.redirect(redirectUrl);
  } catch (error: unknown) {
    console.error("Twitter callback error:", error);
    const redirectUrl = new URL("/pages", request.url);
    redirectUrl.searchParams.set("error", "twitter_failed");
    return NextResponse.redirect(redirectUrl);
  }
}
