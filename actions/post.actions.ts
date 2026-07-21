"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { decrypt } from "@/lib/services/encryption.service";
import {
  publishToPageFeed,
  publishPhotoToPage,
} from "@/lib/services/meta-api.service";
import { publishToTwitter } from "@/lib/services/twitter.service";
import { publishToLinkedIn } from "@/lib/services/linkedin.service";
import { publishPostSchedule } from "@/lib/services/qstash.service";
import { logActivity } from "@/actions/activity.actions";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { ActionResult } from "@/types/api.types";
import type { PostSummary, PostDetail } from "@/types/post.types";

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

export async function getPosts(filters?: {
  status?: string;
  fbPageId?: string;
  fbPageIds?: string[];
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ items: PostSummary[]; total: number }>> {
  try {
    const userId = await requireUserId();
    console.log(`[getPosts] userId = ${userId}, filters =`, filters);
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50; // default to 50 for better list view

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId };
    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
    }
    if (filters?.fbPageId && filters.fbPageId !== "ALL") {
      where.fbPageId = filters.fbPageId;
    } else if (filters?.fbPageIds && filters.fbPageIds.length > 0) {
      where.fbPageId = { in: filters.fbPageIds };
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { body: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          fbPage: { select: { name: true, avatarUrl: true, platform: true } },
          schedules: {
            where: { status: "PENDING" },
            orderBy: { scheduledAt: "asc" },
            take: 1,
            select: { scheduledAt: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.post.count({ where }),
    ]);

    const items: PostSummary[] = posts.map((post) => ({
      id: post.id,
      title: post.title,
      body: post.body,
      mediaType: post.mediaType,
      status: post.status,
      aiGenerated: post.aiGenerated,
      pageName: post.fbPage.name,
      pageAvatarUrl: post.fbPage.avatarUrl,
      fbPageId: post.fbPageId,
      createdAt: post.createdAt,
      publishedAt: post.publishedAt,
      scheduledAt: post.schedules[0]?.scheduledAt ?? null,
      platform: post.fbPage.platform,
    }));

    return { success: true, data: { items, total } };
  } catch (error: unknown) {
    console.error("[getPosts] Failed to fetch posts:", error);
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to fetch posts: ${errMsg}` };
  }
}

export async function getPost(
  postId: string,
): Promise<ActionResult<PostDetail>> {
  try {
    const userId = await requireUserId();

    const post = await prisma.post.findFirst({
      where: { id: postId, userId },
      include: {
        fbPage: { select: { name: true, avatarUrl: true, platform: true } },
        schedules: {
          where: { status: "PENDING" },
          orderBy: { scheduledAt: "asc" },
          take: 1,
          select: { scheduledAt: true },
        },
      },
    });

    if (!post) {
      return { success: false, error: "Post not found", code: ErrorCodes.NOT_FOUND };
    }

    return {
      success: true,
      data: {
        id: post.id,
        title: post.title,
        body: post.body,
        mediaType: post.mediaType,
        mediaUrl: post.mediaUrl,
        status: post.status,
        aiGenerated: post.aiGenerated,
        aiModel: post.aiModel,
        fbPostId: post.fbPostId,
        fbPageId: post.fbPageId,
        pageName: post.fbPage.name,
        pageAvatarUrl: post.fbPage.avatarUrl,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        publishedAt: post.publishedAt,
        scheduledAt: post.schedules[0]?.scheduledAt ?? null,
        platform: post.fbPage.platform,
      },
    };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to fetch post" };
  }
}

// ─────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────

export async function createPost(data: {
  fbPageId: string;
  title?: string;
  body: string;
  mediaUrl?: string;
  mediaType?: "NONE" | "IMAGE" | "VIDEO" | "LINK";
}): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();

    // Verify page belongs to user
    const page = await prisma.fbPage.findFirst({
      where: { id: data.fbPageId, userId },
    });

    if (!page) {
      return { success: false, error: "Page not found", code: ErrorCodes.NOT_FOUND };
    }

    const post = await prisma.post.create({
      data: {
        userId,
        fbPageId: data.fbPageId,
        title: data.title ?? null,
        body: data.body,
        mediaUrl: data.mediaUrl ?? null,
        mediaType: data.mediaType ?? "NONE",
        status: "DRAFT",
      },
    });

    await logActivity({
      userId,
      entityType: "post",
      entityId: post.id,
      action: "post.created",
      metadata: {
        postTitle: data.title || "Untitled",
        postBody: data.body,
        pageName: page.name,
      },
    });

    return { success: true, data: { id: post.id } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to create post" };
  }
}

export async function updatePost(
  postId: string,
  data: {
    fbPageId?: string;
    title?: string;
    body?: string;
    mediaUrl?: string;
    mediaType?: "NONE" | "IMAGE" | "VIDEO" | "LINK";
  },
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();

    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        userId,
        status: { in: ["DRAFT", "APPROVED", "SCHEDULED", "FAILED"] },
      },
    });

    if (!post) {
      return {
        success: false,
        error: "Post not found or cannot be edited (already published or publishing)",
        code: ErrorCodes.NOT_FOUND,
      };
    }

    // Verify page belongs to user if provided
    if (data.fbPageId) {
      const page = await prisma.fbPage.findFirst({
        where: { id: data.fbPageId, userId },
      });
      if (!page) {
        return {
          success: false,
          error: "Selected page not found",
          code: ErrorCodes.NOT_FOUND,
        };
      }
    }

    await prisma.post.update({
      where: { id: postId },
      data: {
        fbPageId: data.fbPageId,
        title: data.title,
        body: data.body,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
      },
    });

    return { success: true, data: { id: postId } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to update post" };
  }
}

/**
 * Internal helper to immediately publish a post to Facebook without a session check.
 * Use for background jobs and cron safety nets.
 */
export async function publishPostNowInternal(
  postId: string,
): Promise<ActionResult<{ fbPostId: string }>> {
  try {
    // Get the post with its target page
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        fbPage: { select: { id: true, name: true, metaPageId: true, accessToken: true, status: true, platform: true } },
      },
    });

    if (!post) {
      return {
        success: false,
        error: "Post not found",
        code: ErrorCodes.NOT_FOUND,
      };
    }

    if (post.status === "POSTED") {
      // The post is already published! Return success (no-op)
      return { success: true, data: { fbPostId: post.fbPostId || "" } };
    }

    if (!["DRAFT", "APPROVED", "SCHEDULED", "FAILED"].includes(post.status)) {
      return {
        success: false,
        error: `Post cannot be published in its current status: ${post.status}`,
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    if (post.fbPage.status !== "ACTIVE") {
      return {
        success: false,
        error: "Target page is not active",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    // Mark as publishing
    await prisma.post.update({
      where: { id: postId },
      data: { status: "PUBLISHING" },
    });

    try {
      // Decrypt the page token
      const pageToken = decrypt(post.fbPage.accessToken);
      let fbPostId: string;

      if (post.fbPage.platform === "TWITTER") {
        fbPostId = await publishToTwitter(pageToken, {
          text: post.body,
          link: post.mediaType === "LINK" && post.mediaUrl ? post.mediaUrl : undefined,
        });
      } else if (post.fbPage.platform === "LINKEDIN") {
        fbPostId = await publishToLinkedIn(pageToken, {
          text: post.body,
          link: post.mediaType === "LINK" && post.mediaUrl ? post.mediaUrl : undefined,
          authorId: post.fbPage.metaPageId,
        });
      } else {
        // Facebook (default)
        // Publish based on media type
        if (post.mediaType === "IMAGE" && post.mediaUrl) {
          fbPostId = await publishPhotoToPage(pageToken, post.fbPage.metaPageId, {
            url: post.mediaUrl,
            caption: post.body,
          });
        } else {
          const payload: { message: string; link?: string } = {
            message: post.body,
          };
          if (post.mediaType === "LINK" && post.mediaUrl) {
            payload.link = post.mediaUrl;
          }
          fbPostId = await publishToPageFeed(
            pageToken,
            post.fbPage.metaPageId,
            payload,
          );
        }
      }

      // Mark as posted
      await prisma.post.update({
        where: { id: postId },
        data: {
          status: "POSTED",
          fbPostId,
          publishedAt: new Date(),
        },
      });

      // Log activity for successful publish
      await logActivity({
        userId: post.userId,
        entityType: "post",
        entityId: postId,
        action: "post.published",
        metadata: {
          postTitle: post.title || "Untitled",
          postBody: post.body,
          pageName: post.fbPage.name ?? "Unknown",
          fbPostId,
          platform: post.fbPage.platform,
        },
      });

      // Also mark any associated schedules as COMPLETED
      await prisma.schedule.updateMany({
        where: {
          postId,
          status: { in: ["PENDING", "FAILED", "IN_PROGRESS"] },
        },
        data: {
          status: "COMPLETED",
          publishedAt: new Date(),
          errorMessage: null,
        },
      });

      return { success: true, data: { fbPostId } };
    } catch (publishError) {
      // Mark as failed
      await prisma.post.update({
        where: { id: postId },
        data: { status: "FAILED" },
      });

      // Log activity for failed publish
      await logActivity({
        userId: post.userId,
        entityType: "post",
        entityId: postId,
        action: "post.failed",
        metadata: {
          postTitle: post.title || "Untitled",
          postBody: post.body,
          pageName: post.fbPage.name ?? "Unknown",
          error: publishError instanceof Error ? publishError.message : "Unknown error",
          platform: post.fbPage.platform,
        },
      });

      throw publishError;
    }
  } catch (error) {
    console.error(`[publishPostNowInternal] Error publishing post ${postId}:`, error);
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to publish post" };
  }
}

/**
 * Immediately publish a post to Facebook (User-facing action).
 */
export async function publishPostNow(
  postId: string,
): Promise<ActionResult<{ fbPostId: string }>> {
  try {
    const userId = await requireUserId();

    // Verify post ownership
    const post = await prisma.post.findFirst({
      where: { id: postId, userId },
    });

    if (!post) {
      return {
        success: false,
        error: "Post not found or unauthorized",
        code: ErrorCodes.NOT_FOUND,
      };
    }

    return publishPostNowInternal(postId);
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to publish post" };
  }
}

export async function deletePost(
  postId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();

    const post = await prisma.post.findFirst({
      where: { id: postId, userId },
      include: { fbPage: true },
    });

    if (!post) {
      return { success: false, error: "Post not found", code: ErrorCodes.NOT_FOUND };
    }

    await prisma.post.delete({ where: { id: postId } });

    await logActivity({
      userId,
      entityType: "post",
      entityId: postId,
      action: "post.deleted",
      metadata: {
        postTitle: post.title || "Untitled",
        postBody: post.body,
        pageName: post.fbPage?.name || "Unknown",
      },
    });

    return { success: true, data: { id: postId } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to delete post" };
  }
}

// ─────────────────────────────────────────────
// Bulk Import
// ─────────────────────────────────────────────

export async function bulkImportPosts(data: {
  fbPageId: string;
  posts: { title?: string; body: string }[];
  autoSchedule?: boolean;
  scheduleMode?: "CUSTOM" | "APPEND";
  startDate?: string;
  endDate?: string;
  postsPerDay?: number;
}): Promise<ActionResult<{ imported: number; scheduled: number }>> {
  try {
    const userId = await requireUserId();

    // Verify page belongs to user
    const page = await prisma.fbPage.findFirst({
      where: { id: data.fbPageId, userId },
    });
    if (!page) {
      return { success: false, error: "Page not found", code: ErrorCodes.NOT_FOUND };
    }

    // Generate schedule slots if auto-scheduling
    let scheduledDates: Date[] = [];
    if (data.autoSchedule && data.postsPerDay) {
      let start: Date;
      let end: Date;

      if (data.scheduleMode === "APPEND") {
        // Find the latest pending schedule for this page
        const latestSchedule = await prisma.schedule.findFirst({
          where: {
            fbPageId: data.fbPageId,
            status: "PENDING",
          },
          orderBy: {
            scheduledAt: "desc",
          },
        });

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        if (latestSchedule) {
          // Start the day after the latest scheduled post
          start = new Date(latestSchedule.scheduledAt);
          start.setDate(start.getDate() + 1);

          // Ensure we don't schedule in the past
          if (start < tomorrow) {
            start = tomorrow;
          }
        } else {
          // If no scheduled posts, start tomorrow
          start = tomorrow;
        }

        // Calculate end date based on posts count and posts per day
        const daysNeeded = Math.ceil(data.posts.length / data.postsPerDay);
        end = new Date(start);
        end.setDate(end.getDate() + daysNeeded - 1);
      } else {
        // CUSTOM range mode
        if (!data.startDate || !data.endDate) {
          return { success: false, error: "Start and end dates are required for custom scheduling." };
        }
        start = new Date(data.startDate);
        end = new Date(data.endDate);
      }

      scheduledDates = generateScheduleSlots(
        start,
        end,
        data.postsPerDay,
        data.posts.length,
      );
    }

    let importedCount = 0;
    let scheduledCount = 0;

    for (let index = 0; index < data.posts.length; index++) {
      const postData = data.posts[index];
      const scheduledAt = scheduledDates[index] || null;

      // 1. Create Post
      const post = await prisma.post.create({
        data: {
          userId,
          fbPageId: data.fbPageId,
          title: postData.title || `Imported Post #${index + 1}`,
          body: postData.body,
          status: scheduledAt ? "SCHEDULED" : "DRAFT",
          aiGenerated: false,
        },
      });

      importedCount++;

      // 2. If scheduled, create schedule and enqueue with QStash
      if (scheduledAt) {
        const schedule = await prisma.schedule.create({
          data: {
            userId,
            postId: post.id,
            fbPageId: data.fbPageId,
            scheduledAt,
            status: "PENDING",
            jitterSeconds: 0,
          },
        });

        try {
          const qstashMsgId = await publishPostSchedule(schedule.id, scheduledAt);
          await prisma.schedule.update({
            where: { id: schedule.id },
            data: { qstashMsgId },
          });
          scheduledCount++;
        } catch (err) {
          console.error(`Failed to register QStash callback for schedule ${schedule.id}:`, err);
          // Keep database schedule as-is or fallback
        }
      }
    }

    return {
      success: true,
      data: {
        imported: importedCount,
        scheduled: scheduledCount,
      },
    };
  } catch (error) {
    console.error("Bulk import failed:", error);
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to import posts" };
  }
}

/**
 * Generate schedule slots across a date range with random spacing.
 * Each day gets up to `postsPerDay` posts within an 8am–9pm window.
 * The minimum gap between any two posts on the same day is 4 hours,
 * with a random extra 0–2 hours added so gaps feel natural and varied.
 */
function generateScheduleSlots(
  start: Date,
  end: Date,
  postsPerDay: number,
  totalPosts: number,
): Date[] {
  const slots: Date[] = [];
  const currentDate = new Date(start);
  currentDate.setHours(0, 0, 0, 0);

  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);

  // Posting window: 8am (480 min) to 9pm (1260 min)
  const WINDOW_START_MIN = 480; // 8:00 AM in minutes
  const WINDOW_END_MIN = 1260; // 9:00 PM in minutes
  const MIN_GAP_MIN = 240; // 4 hours in minutes

  // Cap postsPerDay so they can actually fit with 4-hour gaps
  const windowSize = WINDOW_END_MIN - WINDOW_START_MIN; // 780 min
  const maxFittable = Math.floor(windowSize / MIN_GAP_MIN) + 1; // how many fit
  const effectivePerDay = Math.min(postsPerDay, maxFittable);

  while (currentDate <= endDate && slots.length < totalPosts) {
    const daySlots: Date[] = [];
    const postsToday = Math.min(effectivePerDay, totalPosts - slots.length);

    // Build posting times for this day by walking forward with random gaps
    let earliestMin = WINDOW_START_MIN;

    for (let i = 0; i < postsToday; i++) {
      // How much room is left for remaining posts (each needing MIN_GAP_MIN)?
      const remainingPosts = postsToday - i - 1;
      const reservedMin = remainingPosts * MIN_GAP_MIN;
      const latestMin = WINDOW_END_MIN - reservedMin;

      if (earliestMin > latestMin) break; // can't fit more

      // Pick a random minute within [earliestMin, latestMin]
      const chosenMin =
        earliestMin + Math.floor(Math.random() * (latestMin - earliestMin + 1));

      const slotDate = new Date(currentDate);
      slotDate.setHours(0, chosenMin, 0, 0); // setHours(0, totalMinutes) rolls over correctly
      daySlots.push(slotDate);

      // Next post must be at least 4 hours later, plus a random extra 0–120 min
      const extraJitter = Math.floor(Math.random() * 121); // 0–120 minutes
      earliestMin = chosenMin + MIN_GAP_MIN + extraJitter;
    }

    slots.push(...daySlots);

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return slots;
}
