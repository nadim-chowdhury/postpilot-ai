"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { publishPostSchedule, cancelPostSchedule } from "@/lib/services/qstash.service";
import { logActivity } from "@/actions/activity.actions";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { ActionResult } from "@/types/api.types";
import type { ScheduleSummary, ScheduleDetail } from "@/types/schedule.types";

// ─────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────

/**
 * Schedule a post to be published at a future time.
 * Calculates random jitter, registers the database Schedule, and enqueues a QStash alert.
 */
export async function schedulePost(
  postId: string,
  targetDate: Date,
): Promise<ActionResult<{ scheduleId: string; scheduledAt: Date }>> {
  try {
    const userId = await requireUserId();

    // Fetch the post
    const post = await prisma.post.findFirst({
      where: { id: postId, userId },
      include: { fbPage: true },
    });

    if (!post) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Post not found", 404);
    }

    if (post.status !== "DRAFT" && post.status !== "APPROVED" && post.status !== "FAILED") {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        "Only draft, approved, or failed posts can be scheduled",
        400,
      );
    }

    // Anti-spam rule 1: Time Jitter (±1 to 8 minutes offset)
    const sign = Math.random() > 0.5 ? 1 : -1;
    const randomMinutes = Math.floor(Math.random() * 8) + 1;
    const jitterSeconds = sign * randomMinutes * 60;
    const jitteredTime = new Date(new Date(targetDate).getTime() + jitterSeconds * 1000);

    if (jitteredTime.getTime() <= Date.now()) {
      throw new AppError(
        ErrorCodes.SCHEDULE_PAST_TIME,
        "Scheduled time with jitter falls in the past. Choose a later time.",
        400,
      );
    }

    // Create schedule record in PENDING state
    const schedule = await prisma.schedule.create({
      data: {
        userId,
        postId,
        fbPageId: post.fbPageId,
        scheduledAt: jitteredTime,
        status: "PENDING",
        jitterSeconds,
      },
    });

    // Enqueue callback to QStash
    let qstashMsgId: string | null = null;
    try {
      qstashMsgId = await publishPostSchedule(schedule.id, jitteredTime);

      // Save QStash reference and update post status
      await prisma.$transaction([
        prisma.schedule.update({
          where: { id: schedule.id },
          data: { qstashMsgId },
        }),
        prisma.post.update({
          where: { id: postId },
          data: { status: "SCHEDULED" },
        }),
      ]);
    } catch (enqueueError) {
      // Rollback database schedule if QStash fails
      await prisma.schedule.delete({ where: { id: schedule.id } });
      throw enqueueError;
    }

    // Log Activity
    await logActivity({
      userId,
      entityType: "schedule",
      entityId: schedule.id,
      action: "schedule.created",
      metadata: {
        postTitle: post.title || "Untitled",
        pageName: post.fbPage.name,
        scheduledAt: jitteredTime.toISOString(),
      },
    });

    return {
      success: true,
      data: { scheduleId: schedule.id, scheduledAt: jitteredTime },
    };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    console.error("Failed to schedule post:", error);
    return { success: false, error: "Failed to schedule post" };
  }
}

/**
 * Cancel a scheduled post. Restores the post back to DRAFT status.
 */
export async function cancelSchedule(
  scheduleId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();

    const schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, userId },
      include: { post: true },
    });

    if (!schedule) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Schedule record not found", 404);
    }

    if (schedule.status !== "PENDING" && schedule.status !== "FAILED") {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        "Only pending or failed schedules can be cancelled",
        400,
      );
    }

    // Cancel QStash message if message ID is present
    if (schedule.qstashMsgId) {
      await cancelPostSchedule(schedule.qstashMsgId);
    }

    // Update DB
    await prisma.$transaction([
      prisma.schedule.update({
        where: { id: scheduleId },
        data: { status: "CANCELLED" },
      }),
      prisma.post.update({
        where: { id: schedule.postId },
        data: { status: "DRAFT" },
      }),
    ]);

    // Log Activity
    await logActivity({
      userId,
      entityType: "schedule",
      entityId: scheduleId,
      action: "schedule.cancelled",
      metadata: {
        postTitle: schedule.post.title || "Untitled",
      },
    });

    return { success: true, data: { id: scheduleId } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    console.error("Failed to cancel schedule:", error);
    return { success: false, error: "Failed to cancel schedule" };
  }
}

/**
 * Reschedule an existing scheduled post to a new target time.
 */
export async function reschedulePost(
  scheduleId: string,
  newTargetDate: Date,
): Promise<ActionResult<{ id: string; scheduledAt: Date }>> {
  try {
    const userId = await requireUserId();

    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        userId,
        status: { in: ["PENDING", "FAILED", "CANCELLED"] },
      },
      include: { post: { include: { fbPage: true } } },
    });

    if (!schedule) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Schedule not found", 404);
    }

    // Cancel old QStash scheduling if it was pending
    if (schedule.status === "PENDING" && schedule.qstashMsgId) {
      await cancelPostSchedule(schedule.qstashMsgId);
    }

    // Calculate new jitter
    const sign = Math.random() > 0.5 ? 1 : -1;
    const randomMinutes = Math.floor(Math.random() * 8) + 1;
    const jitterSeconds = sign * randomMinutes * 60;
    const newJitteredTime = new Date(new Date(newTargetDate).getTime() + jitterSeconds * 1000);

    if (newJitteredTime.getTime() <= Date.now()) {
      throw new AppError(
        ErrorCodes.SCHEDULE_PAST_TIME,
        "New scheduled time falls in the past. Choose a later time.",
        400,
      );
    }

    // Register new QStash callback
    const newQstashMsgId = await publishPostSchedule(scheduleId, newJitteredTime);

    // Update database schedule and associated post details
    await prisma.$transaction([
      prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          scheduledAt: newJitteredTime,
          jitterSeconds,
          qstashMsgId: newQstashMsgId,
          status: "PENDING",
          errorMessage: null,
        },
      }),
      prisma.post.update({
        where: { id: schedule.postId },
        data: {
          status: "SCHEDULED",
        },
      }),
    ]);

    // Log Activity
    await logActivity({
      userId,
      entityType: "schedule",
      entityId: scheduleId,
      action: "schedule.updated",
      metadata: {
        postTitle: schedule.post.title || "Untitled",
        pageName: schedule.post.fbPage.name,
        scheduledAt: newJitteredTime.toISOString(),
      },
    });

    return { success: true, data: { id: scheduleId, scheduledAt: newJitteredTime } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    console.error("Failed to reschedule:", error);
    return { success: false, error: "Failed to reschedule post" };
  }
}

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

/**
 * Fetch list of schedules. Supports filtering by status or Facebook page.
 */
export async function getSchedules(filters?: {
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED" | "ALL";
  fbPageId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ items: ScheduleSummary[]; total: number }>> {
  try {
    const userId = await requireUserId();
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50; // default to 50 for queue list

    const where: any = { userId };
    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
    }
    if (filters?.fbPageId && filters.fbPageId !== "ALL") {
      where.fbPageId = filters.fbPageId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.scheduledAt = {};
      if (filters.startDate) {
        where.scheduledAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.scheduledAt.lte = end;
      }
    }

    if (filters?.search) {
      where.post = {
        OR: [
          { title: { contains: filters.search, mode: "insensitive" } },
          { body: { contains: filters.search, mode: "insensitive" } },
        ],
      };
    }

    const [schedules, total] = await Promise.all([
      prisma.schedule.findMany({
        where,
        include: {
          post: true,
          fbPage: { select: { name: true, avatarUrl: true } },
        },
        orderBy: { scheduledAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.schedule.count({ where }),
    ]);

    const items: ScheduleSummary[] = schedules.map((s) => ({
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

    return { success: true, data: { items, total } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to fetch schedules" };
  }
}

/**
 * Manually trigger the safety sweeper queue processor to publish any missed/pending posts.
 */
export async function triggerQueueSweeper(): Promise<ActionResult<{ processed: number }>> {
  try {
    const userId = await requireUserId();

    // Find missed PENDING schedules (scheduled in the past)
    const missedSchedules = await prisma.schedule.findMany({
      where: {
        userId,
        status: "PENDING",
        scheduledAt: {
          lte: new Date(), // Any scheduled time that has already passed!
        },
      },
      include: { post: { include: { fbPage: true } } },
    });

    if (missedSchedules.length === 0) {
      return { success: true, data: { processed: 0 } };
    }

    let processed = 0;
    const { publishPostNow } = await import("@/actions/post.actions");

    for (const schedule of missedSchedules) {
      try {
        await prisma.schedule.update({
          where: { id: schedule.id },
          data: { status: "IN_PROGRESS" },
        });

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
              note: "Published by manual queue sweeper",
            },
          });
          processed++;
        } else {
          throw new Error(result.error || "Publishing failed");
        }
      } catch (err: any) {
        console.error(`[Manual Sweeper] Failed recovery for schedule ${schedule.id}:`, err);
        await prisma.$transaction([
          prisma.schedule.update({
            where: { id: schedule.id },
            data: {
              status: "FAILED",
              errorMessage: `Manual sweeper recovery failed: ${err.message || "Unknown error"}`,
            },
          }),
          prisma.post.update({
            where: { id: schedule.postId },
            data: { status: "FAILED" },
          }),
        ]);

        await logActivity({
          userId: schedule.userId,
          entityType: "schedule",
          entityId: schedule.id,
          action: "post.failed",
          metadata: {
            postTitle: schedule.post.title || "Untitled",
            pageName: schedule.post.fbPage.name,
            error: err.message || "Unknown error",
            note: "Failed during manual queue sweeper recovery",
          },
        });
      }
    }

    return { success: true, data: { processed } };
  } catch (error: any) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to trigger queue sweeper" };
  }
}

/**
 * Force publish a scheduled post immediately, updating both schedule and post status.
 */
export async function forcePublishSchedule(
  scheduleId: string,
): Promise<ActionResult<{ fbPostId: string }>> {
  let schedule: any = null;
  try {
    const userId = await requireUserId();

    schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, userId },
      include: { post: { include: { fbPage: true } } },
    });

    if (!schedule) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Schedule record not found", 404);
    }

    // Cancel QStash schedule if pending
    if (schedule.status === "PENDING" && schedule.qstashMsgId) {
      await cancelPostSchedule(schedule.qstashMsgId);
    }

    // Mark schedule as IN_PROGRESS
    await prisma.schedule.update({
      where: { id: scheduleId },
      data: { status: "IN_PROGRESS" },
    });

    // Execute direct publishing
    const { publishPostNowInternal } = await import("@/actions/post.actions");
    const result = await publishPostNowInternal(schedule.postId);

    if (result.success) {
      await prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          status: "COMPLETED",
          publishedAt: new Date(),
          errorMessage: null,
        },
      });

      await logActivity({
        userId,
        entityType: "schedule",
        entityId: scheduleId,
        action: "post.published",
        metadata: {
          postTitle: schedule.post.title || "Untitled",
          note: "Published via force publish",
        },
      });

      return { success: true, data: { fbPostId: result.data.fbPostId } };
    } else {
      throw new Error(result.error || "Publishing action failed");
    }
  } catch (error: any) {
    console.error(`[Force Publish] Failed for schedule ${scheduleId}:`, error);
    
    // Restore schedule to FAILED
    try {
      await prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          status: "FAILED",
          errorMessage: `Force publish failed: ${error.message || "Unknown error"}`,
        },
      });
      if (schedule) {
        await prisma.post.update({
          where: { id: schedule.postId },
          data: { status: "FAILED" },
        });

        // Log failure activity
        await logActivity({
          userId: schedule.userId,
          entityType: "schedule",
          entityId: scheduleId,
          action: "post.failed",
          metadata: {
            postTitle: schedule.post?.title || "Untitled",
            pageName: schedule.post?.fbPage?.name || "Unknown Page",
            error: error.message || "Unknown error",
            note: "Failed during force publish",
          },
        });
      }
    } catch (dbErr) {
      console.error("[Force Publish Error Recovery Failed]", dbErr);
    }

    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: error.message || "Failed to force publish scheduled post" };
  }
}

