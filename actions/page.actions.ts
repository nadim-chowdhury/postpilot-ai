"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { encrypt, decrypt } from "@/lib/services/encryption.service";
import {
  fetchUserPages,
  exchangeForLongLivedToken,
  verifyPageToken,
} from "@/lib/services/meta-api.service";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { ActionResult } from "@/types/api.types";
import type { PageSummary, PageDetail } from "@/types/page.types";

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

export async function getPages(): Promise<ActionResult<PageSummary[]>> {
  try {
    const userId = await requireUserId();

    const pages = await prisma.fbPage.findMany({
      where: { userId },
      include: {
        _count: { select: { posts: true } },
        posts: {
          where: { status: "POSTED" },
          orderBy: { publishedAt: "desc" },
          take: 1,
          select: { publishedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data: PageSummary[] = pages.map((page) => ({
      id: page.id,
      name: page.name,
      topic: page.topic,
      status: page.status,
      avatarUrl: page.avatarUrl,
      postCount: page._count.posts,
      lastPostedAt: page.posts[0]?.publishedAt ?? null,
    }));

    return { success: true, data };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to fetch pages" };
  }
}

export async function getPage(
  pageId: string,
): Promise<ActionResult<PageDetail>> {
  try {
    const userId = await requireUserId();

    const page = await prisma.fbPage.findFirst({
      where: { id: pageId, userId },
      include: {
        _count: { select: { posts: true } },
        posts: {
          where: { status: "POSTED" },
          orderBy: { publishedAt: "desc" },
          take: 1,
          select: { publishedAt: true },
        },
      },
    });

    if (!page) {
      return { success: false, error: "Page not found", code: ErrorCodes.NOT_FOUND };
    }

    const data: PageDetail = {
      id: page.id,
      name: page.name,
      metaPageId: page.metaPageId,
      topic: page.topic,
      status: page.status,
      avatarUrl: page.avatarUrl,
      personaPrompt: page.personaPrompt,
      tokenExpiresAt: page.tokenExpiresAt,
      postCount: page._count.posts,
      lastPostedAt: page.posts[0]?.publishedAt ?? null,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    };

    return { success: true, data };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to fetch page" };
  }
}

// ─────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────

/**
 * Fetch available pages from Meta and return them for selection.
 */
export async function fetchAvailablePages(
  userAccessToken: string,
): Promise<
  ActionResult<
    { id: string; name: string; category: string; avatarUrl: string | null }[]
  >
> {
  try {
    await requireUserId();

    const metaPages = await fetchUserPages(userAccessToken);

    const available = metaPages.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      avatarUrl: p.avatarUrl,
    }));

    return { success: true, data: available };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to fetch pages from Facebook" };
  }
}

/**
 * Connect selected pages: exchange tokens, encrypt, and save to DB.
 */
export async function connectPages(
  pages: {
    metaPageId: string;
    name: string;
    accessToken: string;
    topic: string;
    avatarUrl?: string;
  }[],
): Promise<ActionResult<{ connected: number }>> {
  try {
    const userId = await requireUserId();
    let connected = 0;

    for (const page of pages) {
      // Check if already connected
      const existing = await prisma.fbPage.findUnique({
        where: { metaPageId: page.metaPageId },
      });

      if (existing) {
        // Update token if reconnecting
        const encryptedToken = encrypt(page.accessToken);
        await prisma.fbPage.update({
          where: { metaPageId: page.metaPageId },
          data: {
            accessToken: encryptedToken,
            status: "ACTIVE",
            name: page.name,
            avatarUrl: page.avatarUrl ?? null,
          },
        });
        connected++;
        continue;
      }

      // Encrypt the page access token
      const encryptedToken = encrypt(page.accessToken);

      await prisma.fbPage.create({
        data: {
          userId,
          metaPageId: page.metaPageId,
          name: page.name,
          accessToken: encryptedToken,
          topic: page.topic,
          avatarUrl: page.avatarUrl ?? null,
          status: "ACTIVE",
        },
      });

      connected++;
    }

    return { success: true, data: { connected } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to connect pages" };
  }
}

/**
 * Update a page's topic, persona prompt, or status.
 */
export async function updatePage(
  pageId: string,
  data: { topic?: string; personaPrompt?: string; status?: string },
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();

    const page = await prisma.fbPage.findFirst({
      where: { id: pageId, userId },
    });

    if (!page) {
      return { success: false, error: "Page not found", code: ErrorCodes.NOT_FOUND };
    }

    const updateData: Record<string, unknown> = {};
    if (data.topic !== undefined) updateData.topic = data.topic;
    if (data.personaPrompt !== undefined) updateData.personaPrompt = data.personaPrompt;
    if (data.status !== undefined) updateData.status = data.status;

    await prisma.fbPage.update({
      where: { id: pageId },
      data: updateData,
    });

    return { success: true, data: { id: pageId } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to update page" };
  }
}

/**
 * Toggle a page between ACTIVE and PAUSED.
 */
export async function togglePageStatus(
  pageId: string,
): Promise<ActionResult<{ id: string; status: string }>> {
  try {
    const userId = await requireUserId();

    const page = await prisma.fbPage.findFirst({
      where: { id: pageId, userId },
    });

    if (!page) {
      return { success: false, error: "Page not found", code: ErrorCodes.NOT_FOUND };
    }

    const newStatus = page.status === "ACTIVE" ? "PAUSED" : "ACTIVE";

    await prisma.fbPage.update({
      where: { id: pageId },
      data: { status: newStatus },
    });

    return { success: true, data: { id: pageId, status: newStatus } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to toggle page status" };
  }
}

/**
 * Disconnect a page (soft delete — marks as DISCONNECTED).
 */
export async function disconnectPage(
  pageId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();

    const page = await prisma.fbPage.findFirst({
      where: { id: pageId, userId },
    });

    if (!page) {
      return { success: false, error: "Page not found", code: ErrorCodes.NOT_FOUND };
    }

    await prisma.fbPage.update({
      where: { id: pageId },
      data: { status: "DISCONNECTED" },
    });

    return { success: true, data: { id: pageId } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to disconnect page" };
  }
}

/**
 * Get the decrypted page access token. Internal use only.
 */
export async function getPageToken(pageId: string): Promise<string> {
  const userId = await requireUserId();

  const page = await prisma.fbPage.findFirst({
    where: { id: pageId, userId, status: "ACTIVE" },
    select: { accessToken: true },
  });

  if (!page) {
    throw new AppError(
      ErrorCodes.NOT_FOUND,
      "Page not found or not active",
      404,
    );
  }

  return decrypt(page.accessToken);
}
