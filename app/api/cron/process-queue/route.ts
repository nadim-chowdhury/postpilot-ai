import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishPostNow } from "@/actions/post.actions";
import { logActivity } from "@/actions/activity.actions";

export async function GET(request: Request) {
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

  // Find missed PENDING schedules (older than 10 minutes from now)
  const safetyThreshold = new Date(Date.now() - 10 * 60 * 1000);

  const missedSchedules = await prisma.schedule.findMany({
    where: {
      status: "PENDING",
      scheduledAt: {
        lte: safetyThreshold,
      },
    },
    include: { post: { include: { fbPage: true } } },
    take: 10, // Process in small chunks to prevent timeout
  });

  if (missedSchedules.length === 0) {
    return NextResponse.json({ success: true, processed: 0, message: "Queue is healthy" });
  }

  console.log(`[Safety Sweeper] Found ${missedSchedules.length} missed scheduled posts. Repairing...`);
  let processed = 0;

  for (const schedule of missedSchedules) {
    try {
      // Mark as IN_PROGRESS
      await prisma.schedule.update({
        where: { id: schedule.id },
        data: { status: "IN_PROGRESS" },
      });

      // Execute publishing
      const result = await publishPostNow(schedule.postId);

      if (result.success) {
        await prisma.schedule.update({
          where: { id: schedule.id },
          data: {
            status: "COMPLETED",
            publishedAt: new Date(),
            errorMessage: null,
          },
        });

        await logActivity({
          userId: schedule.userId,
          entityType: "schedule",
          entityId: schedule.id,
          action: "post.published",
          metadata: {
            postTitle: schedule.post.title || "Untitled",
            pageName: schedule.post.fbPage.name,
            note: "Published by cron safety-net sweeper",
          },
        });
      } else {
        throw new Error(result.error || "Publishing action failed");
      }
    } catch (err: any) {
      console.error(`[Safety Sweeper] Failed to recover schedule ${schedule.id}:`, err);
      
      await prisma.$transaction([
        prisma.schedule.update({
          where: { id: schedule.id },
          data: {
            status: "FAILED",
            errorMessage: `Sweeper recovery failed: ${err.message || "Unknown error"}`,
          },
        }),
        prisma.post.update({
          where: { id: schedule.postId },
          data: { status: "FAILED" },
        }),
      ]);
    }
    processed++;
  }

  return NextResponse.json({ success: true, processed });
}
