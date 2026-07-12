import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/services/encryption.service";
import { verifyPageToken } from "@/lib/services/meta-api.service";
import { logActivity } from "@/actions/activity.actions";
import { limitRequest } from "@/lib/services/rate-limit.service";

export async function GET(request: Request) {
  // Rate limiting (max 5 hits per minute for safety sweeper)
  const rateLimit = await limitRequest("cron:check-token-expiry", 5, 60);
  if (!rateLimit.success) {
    return new Response("Too Many Requests", { status: 429 });
  }

  // Validate Cron secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("Authorization");

  if (cronSecret) {
    const isAuthorized =
      authHeader === `Bearer ${cronSecret}` ||
      new URL(request.url).searchParams.get("secret") === cronSecret;

    if (!isAuthorized) {
      return new Response("Unauthorized", { status: 401 });
    }
  } else {
    console.warn("CRON_SECRET is not configured. Cron route is publicly accessible in dev.");
  }

  // Fetch all connected pages that are not disconnected
  const pages = await prisma.fbPage.findMany({
    where: {
      status: {
        in: ["ACTIVE", "PAUSED", "TOKEN_EXPIRING"],
      },
    },
  });

  if (pages.length === 0) {
    return NextResponse.json({ success: true, processed: 0, message: "No active pages to verify" });
  }

  console.log(`[Token Expiry Checker] Verifying token health for ${pages.length} pages...`);
  let processed = 0;
  const now = new Date();

  for (const page of pages) {
    try {
      const decryptedToken = decrypt(page.accessToken);

      // 1. Verify token freshness/liveness using Meta API
      const isValid = await verifyPageToken(decryptedToken);

      if (!isValid) {
        // Token has been revoked or expired
        await prisma.fbPage.update({
          where: { id: page.id },
          data: { status: "DISCONNECTED" },
        });

        await logActivity({
          userId: page.userId,
          entityType: "page",
          entityId: page.id,
          action: "page.disconnected",
          metadata: {
            name: page.name,
            reason: "Facebook Page access token is invalid or revoked",
          },
        });
        continue;
      }

      // 2. Check expiration dates if specified
      if (page.tokenExpiresAt) {
        const diffMs = page.tokenExpiresAt.getTime() - now.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays <= 1) {
          // Expiration in less than 24 hours: Auto-pause page
          await prisma.fbPage.update({
            where: { id: page.id },
            data: { status: "PAUSED" },
          });

          await logActivity({
            userId: page.userId,
            entityType: "page",
            entityId: page.id,
            action: "page.paused",
            metadata: {
              name: page.name,
              reason: "Auto-paused because page access token expires in less than 24 hours.",
            },
          });
        } else if (diffDays <= 7) {
          // Expiration in less than 7 days: Alert warning
          await prisma.fbPage.update({
            where: { id: page.id },
            data: { status: "TOKEN_EXPIRING" },
          });

          await logActivity({
            userId: page.userId,
            entityType: "page",
            entityId: page.id,
            action: "page.updated",
            metadata: {
              name: page.name,
              reason: "Token expires in less than 7 days. Reconnect required.",
            },
          });
        }
      }
    } catch (err) {
      console.error(`[Token Expiry Checker] Failed to check page ${page.name}:`, err);
    }
    processed++;
  }

  return NextResponse.json({ success: true, processed });
}
