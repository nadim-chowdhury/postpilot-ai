"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { decrypt } from "@/lib/services/encryption.service";
import {
  publishToPageFeed,
  publishPhotoToPage,
} from "@/lib/services/meta-api.service";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { ActionResult } from "@/types/api.types";
import type { PostSummary, PostDetail } from "@/types/post.types";

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

export async function getPosts(filters?: {
  status?: string;
  fbPageId?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ items: PostSummary[]; total: number }>> {
  try {
    const userId = await requireUserId();
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;

    const where: Record<string, unknown> = { userId };
    if (filters?.status) where.status = filters.status;
    if (filters?.fbPageId) where.fbPageId = filters.fbPageId;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          fbPage: { select: { name: true, avatarUrl: true } },
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
      createdAt: post.createdAt,
      publishedAt: post.publishedAt,
    }));

    return { success: true, data: { items, total } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to fetch posts" };
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
        fbPage: { select: { name: true, avatarUrl: true } },
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
    title?: string;
    body?: string;
    mediaUrl?: string;
    mediaType?: "NONE" | "IMAGE" | "VIDEO" | "LINK";
  },
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();

    const post = await prisma.post.findFirst({
      where: { id: postId, userId, status: { in: ["DRAFT", "APPROVED"] } },
    });

    if (!post) {
      return {
        success: false,
        error: "Post not found or cannot be edited",
        code: ErrorCodes.NOT_FOUND,
      };
    }

    await prisma.post.update({
      where: { id: postId },
      data,
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
 * Immediately publish a post to Facebook.
 */
export async function publishPostNow(
  postId: string,
): Promise<ActionResult<{ fbPostId: string }>> {
  try {
    const userId = await requireUserId();

    // Get the post with its target page
    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        userId,
        status: { in: ["DRAFT", "APPROVED"] },
      },
      include: {
        fbPage: { select: { id: true, metaPageId: true, accessToken: true, status: true } },
      },
    });

    if (!post) {
      return {
        success: false,
        error: "Post not found or already published",
        code: ErrorCodes.NOT_FOUND,
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

      // Mark as posted
      await prisma.post.update({
        where: { id: postId },
        data: {
          status: "POSTED",
          fbPostId,
          publishedAt: new Date(),
        },
      });

      return { success: true, data: { fbPostId } };
    } catch (publishError) {
      // Mark as failed
      await prisma.post.update({
        where: { id: postId },
        data: { status: "FAILED" },
      });

      throw publishError;
    }
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
    });

    if (!post) {
      return { success: false, error: "Post not found", code: ErrorCodes.NOT_FOUND };
    }

    await prisma.post.delete({ where: { id: postId } });

    return { success: true, data: { id: postId } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to delete post" };
  }
}
