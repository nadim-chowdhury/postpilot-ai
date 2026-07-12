import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { encrypt } from "@/lib/services/encryption.service";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    
    let userId: string;
    try {
      userId = await requireUserId();
    } catch {
      const firstUser = await prisma.user.findFirst({ select: { id: true } });
      if (!firstUser) throw new Error("No user found in database");
      userId = firstUser.id;
    }

    let urnId = "linkedin_urn";
    let displayName = "LinkedIn Account";
    let token = "mock_linkedin_token";

    const isMock = code === "mock_linkedin_code" || !process.env.LINKEDIN_CLIENT_ID;

    if (!isMock && code) {
      const callbackUrl = `${request.nextUrl.origin}/api/auth/linkedin/callback`;
      
      const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: callbackUrl,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        token = data.access_token;

        // Fetch user profile info
        const meResponse = await fetch("https://api.linkedin.com/v2/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meResponse.ok) {
          const meData = await meResponse.json();
          urnId = `urn:li:person:${meData.id}`;
          displayName = `${meData.localizedFirstName} ${meData.localizedLastName}`;
        }
      }
    } else {
      urnId = "urn:li:person:linkedin_dev_person";
      displayName = "Nadim Chowdhury (LinkedIn)";
    }

    const encryptedToken = encrypt(token);

    await prisma.fbPage.upsert({
      where: { metaPageId: urnId },
      update: {
        accessToken: encryptedToken,
        name: displayName,
        status: "ACTIVE",
      },
      create: {
        userId,
        metaPageId: urnId,
        name: displayName,
        accessToken: encryptedToken,
        topic: "Social Feed",
        status: "ACTIVE",
        platform: "LINKEDIN",
      },
    });

    const redirectUrl = new URL("/pages", request.url);
    redirectUrl.searchParams.set("success", "linkedin_connected");
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error("LinkedIn callback error:", error);
    const redirectUrl = new URL("/pages", request.url);
    redirectUrl.searchParams.set("error", "linkedin_failed");
    return NextResponse.redirect(redirectUrl);
  }
}
