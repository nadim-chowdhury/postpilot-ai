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

    if (post.status !== "DRAFT" && post.status !== "APPROVED") {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        "Only draft or approved posts can be scheduled",
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

    if (schedule.status !== "PENDING") {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        "Only pending schedules can be cancelled",
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
      where: { id: scheduleId, userId, status: "PENDING" },
      include: { post: { include: { fbPage: true } } },
    });

    if (!schedule) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Pending schedule not found", 404);
    }

    // Cancel old QStash scheduling
    if (schedule.qstashMsgId) {
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

    // Update database schedule details
    await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        scheduledAt: newJitteredTime,
        jitterSeconds,
        qstashMsgId: newQstashMsgId,
      },
    });

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
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";
  fbPageId?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ items: ScheduleSummary[]; total: number }>> {
  try {
    const userId = await requireUserId();
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 30;

    const where: Record<string, unknown> = { userId };
    if (filters?.status) where.status = filters.status;
    if (filters?.fbPageId) where.fbPageId = filters.fbPageId;

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
