"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { AppError } from "@/lib/errors";
import type { ActionResult } from "@/types/api.types";
import type { ScheduleSummary } from "@/types/schedule.types";
import type { ActivityEntry } from "@/actions/activity.actions";

export interface DashboardStats {
  pagesCount: number;
  scheduledCount: number;
  publishedCount: number;
  failedCount: number;
  upcomingSchedules: ScheduleSummary[];
  recentActivities: ActivityEntry[];
}

export async function getDashboardStats(): Promise<ActionResult<DashboardStats>> {
  try {
    const userId = await requireUserId();

    // Run parallel aggregation queries
    const [
      pagesCount,
      scheduledCount,
      publishedCount,
      failedCount,
      upcomingSchedulesRaw,
      recentActivitiesRaw,
    ] = await Promise.all([
      // 1. Pages Count (ACTIVE)
      prisma.fbPage.count({
        where: { userId, status: "ACTIVE" },
      }),
      // 2. Scheduled Queue Count (PENDING)
      prisma.schedule.count({
        where: { userId, status: "PENDING" },
      }),
      // 3. Published Posts Count (POSTED)
      prisma.post.count({
        where: { userId, status: "POSTED" },
      }),
      // 4. Failed Posts Count (FAILED)
      prisma.post.count({
        where: { userId, status: "FAILED" },
      }),
      // 5. Next 5 upcoming schedules
      prisma.schedule.findMany({
        where: { userId, status: "PENDING" },
        include: {
          post: true,
          fbPage: { select: { name: true, avatarUrl: true } },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      }),
      // 6. Last 5 activities
      prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const upcomingSchedules: ScheduleSummary[] = upcomingSchedulesRaw.map((s) => ({
      id: s.id,
      postId: s.postId,
      postTitle: s.post.title,
      postBody: s.post.body,
      pageName: s.fbPage.name,
      pageAvatarUrl: s.fbPage.avatarUrl,
      scheduledAt: s.scheduledAt,
      status: s.status,
      retryCount: s.retryCount,
    }));

    const recentActivities: ActivityEntry[] = recentActivitiesRaw.map((a) => ({
      id: a.id,
      entityType: a.entityType,
      entityId: a.entityId,
      action: a.action,
      metadata: a.metadata as Record<string, unknown> | null,
      createdAt: a.createdAt,
    }));

    return {
      success: true,
      data: {
        pagesCount,
        scheduledCount,
        publishedCount,
        failedCount,
        upcomingSchedules,
        recentActivities,
      },
    };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    console.error("Failed to load dashboard metrics:", error);
    return { success: false, error: "Failed to load dashboard metrics" };
  }
}
