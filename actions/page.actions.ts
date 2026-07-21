"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId, requireUserAccessToken } from "@/lib/session";
import { encrypt, decrypt } from "@/lib/services/encryption.service";
import {
  fetchUserPages,
  type MetaPage,
} from "@/lib/services/meta-api.service";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { ActionResult } from "@/types/api.types";
import type { PageSummary, PageDetail } from "@/types/page.types";
import { generatePageTopicAndPersona } from "@/lib/services/ai.service";
import { logActivity } from "@/actions/activity.actions";

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

export async function getPages(): Promise<ActionResult<PageSummary[]>> {
  try {
    const userId = await requireUserId();
    console.log(`[getPages] userId = ${userId}`);

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
      personaPrompt: page.personaPrompt,
      game: page.game,
      platform: page.platform,
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
      game: page.game,
      tokenExpiresAt: page.tokenExpiresAt,
      postCount: page._count.posts,
      lastPostedAt: page.posts[0]?.publishedAt ?? null,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      platform: page.platform,
      tokenSecret: page.tokenSecret,
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
export async function fetchAvailablePages(): Promise<
  ActionResult<
    { id: string; name: string; category: string; avatarUrl: string | null }[]
  >
> {
  try {
    const userId = await requireUserId();
    const userAccessToken = await requireUserAccessToken();

    let metaPages: MetaPage[] = [];
    try {
      metaPages = await fetchUserPages(userAccessToken);
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Dev Auth Fallback] Failed to fetch pages from Facebook, using mock pages instead:", e);
        metaPages = [
          { id: "mock-fb-page-1", name: "Mock Gamer Hub", category: "Gaming", accessToken: "mock-token-1", avatarUrl: null },
          { id: "mock-fb-page-2", name: "Mock Tech Trends", category: "Technology", accessToken: "mock-token-2", avatarUrl: null },
          { id: "mock-fb-page-3", name: "Mock Foodie Blog", category: "Food & Beverage", accessToken: "mock-token-3", avatarUrl: null },
        ];
      } else {
        throw e;
      }
    }

    const connectedPages = await prisma.fbPage.findMany({
      where: {
        userId,
        status: { in: ["ACTIVE", "PAUSED", "TOKEN_EXPIRING"] },
      },
      select: { metaPageId: true },
    });

    const connectedMetaIds = new Set(connectedPages.map((p) => p.metaPageId));

    const available = metaPages
      .filter((p) => !connectedMetaIds.has(p.id))
      .map((p) => ({
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
 * Connect selected pages: fetch tokens securely on server, encrypt, and save to DB.
 */
export async function connectPages(
  pages: {
    metaPageId: string;
    name: string;
    topic: string;
    avatarUrl?: string;
  }[],
): Promise<ActionResult<{ connected: number }>> {
  try {
    const userId = await requireUserId();
    const userAccessToken = await requireUserAccessToken();

    // Fetch all pages from Facebook to get their real page access tokens
    let metaPages: MetaPage[] = [];
    try {
      metaPages = await fetchUserPages(userAccessToken);
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Dev Auth Fallback] Failed to fetch pages from Facebook, using mock data for connection:", e);
        metaPages = pages.map((p) => ({
          id: p.metaPageId,
          name: p.name,
          accessToken: "EAAB_mock_token_for_dev_mode_" + p.metaPageId,
          category: "Social Page",
          avatarUrl: p.avatarUrl ?? null,
        }));
      } else {
        throw e;
      }
    }
    let connected = 0;

    for (const page of pages) {
      // Find the page in Meta's response to get its access token
      const metaPage = metaPages.find((p) => p.id === page.metaPageId);
      if (!metaPage) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          `Page ${page.name} not found in Facebook account`,
          404,
        );
      }

      // Check if already connected
      const existing = await prisma.fbPage.findUnique({
        where: { metaPageId: page.metaPageId },
      });

      if (existing) {
        // Update token if reconnecting
        const encryptedToken = encrypt(metaPage.accessToken);
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

      // Get AI suggested topic and persona if connecting for the first time
      const aiSuggestions = await generatePageTopicAndPersona(page.name, metaPage.category);
      const finalTopic = page.topic ? page.topic : aiSuggestions.topic;

      // Encrypt the page access token
      const encryptedToken = encrypt(metaPage.accessToken);

      await prisma.fbPage.create({
        data: {
          userId,
          metaPageId: page.metaPageId,
          name: page.name,
          accessToken: encryptedToken,
          topic: finalTopic,
          personaPrompt: aiSuggestions.personaPrompt,
          avatarUrl: page.avatarUrl ?? null,
          status: "ACTIVE",
        },
      });

      connected++;
    }

    // Log activity for each connected page
    for (const page of pages) {
      await logActivity({
        userId,
        entityType: "page",
        entityId: page.metaPageId,
        action: "page.connected",
        metadata: { name: page.name },
      });
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
 * Connect a page manually using a Meta Page ID and Page Access Token.
 */
export async function connectPageManually(data: {
  metaPageId: string;
  accessToken: string;
  tokenSecret?: string;
  topic: string;
  platform?: "FACEBOOK" | "TWITTER" | "LINKEDIN";
  name?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const platform = data.platform ?? "FACEBOOK";

    if (!data.metaPageId || !data.accessToken) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        "Account/Page ID and Access Token are required",
        400,
      );
    }

    let name = data.name || data.metaPageId;
    let avatarUrl: string | null = null;
    let category = "Social Account";

    const isMock = data.accessToken.toLowerCase().startsWith("mock");

    if (platform === "FACEBOOK" && !isMock) {
      // Call Meta API using the provided token to fetch details and verify it works
      const version = process.env.META_GRAPH_API_VERSION ?? "v24.0";
      const url = `https://graph.facebook.com/${version}/${data.metaPageId}?fields=name,category,picture{url}&access_token=${data.accessToken}`;

      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok || result.error) {
        throw new AppError(
          ErrorCodes.META_API_ERROR,
          result.error?.message ?? "Invalid Page Access Token or Page ID",
          response.status,
        );
      }

      name = result.name;
      category = result.category || "Facebook Page";
      avatarUrl = result.picture?.data?.url ?? null;
    } else if (platform === "TWITTER" && !isMock) {
      // Attempt Twitter token verification (GET users/me)
      try {
        const response = await fetch("https://api.twitter.com/2/users/me", {
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
          },
        });
        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            name = result.data.name || `@${result.data.username}`;
            category = "Twitter Account";
          }
        }
      } catch (err) {
        console.warn("Could not verify Twitter token, using manual configuration details:", err);
      }
    } else if (platform === "LINKEDIN" && !isMock) {
      // Attempt LinkedIn token verification (GET me)
      try {
        const response = await fetch("https://api.linkedin.com/v2/me", {
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
          },
        });
        if (response.ok) {
          const result = await response.json();
          name = `${result.localizedFirstName || ""} ${result.localizedLastName || ""}`.trim() || name;
          category = "LinkedIn Profile";
        }
      } catch (err) {
        console.warn("Could not verify LinkedIn token, using manual configuration details:", err);
      }
    }

    const encryptedToken = encrypt(data.accessToken);
    const encryptedSecret = data.tokenSecret ? encrypt(data.tokenSecret) : null;

    // Get AI suggested topic and persona
    const aiSuggestions = await generatePageTopicAndPersona(name, category);
    const finalTopic = data.topic ? data.topic : aiSuggestions.topic;

    // Check if page already exists
    const existing = await prisma.fbPage.findUnique({
      where: { metaPageId: data.metaPageId },
    });

    let connectedPageId = "";

    if (existing) {
      const updated = await prisma.fbPage.update({
        where: { metaPageId: data.metaPageId },
        data: {
          userId,
          name,
          accessToken: encryptedToken,
          tokenSecret: encryptedSecret,
          status: "ACTIVE",
          avatarUrl: avatarUrl || existing.avatarUrl,
          topic: data.topic || existing.topic,
          platform,
        },
      });
      connectedPageId = updated.id;
    } else {
      const created = await prisma.fbPage.create({
        data: {
          userId,
          metaPageId: data.metaPageId,
          name,
          accessToken: encryptedToken,
          tokenSecret: encryptedSecret,
          topic: finalTopic,
          personaPrompt: aiSuggestions.personaPrompt,
          avatarUrl,
          status: "ACTIVE",
          platform,
        },
      });
      connectedPageId = created.id;
    }

    // Log activity for manually connected page
    await logActivity({
      userId,
      entityType: "page",
      entityId: data.metaPageId,
      action: "page.connected",
      metadata: { name, platform },
    });

    return { success: true, data: { id: connectedPageId } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to connect page manually" };
  }
}


/**
 * Update a page's topic, persona prompt, or status.
 */
export async function updatePage(
  pageId: string,
  data: { topic?: string; personaPrompt?: string; status?: string; game?: string | null },
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
    if (data.game !== undefined) updateData.game = data.game;

    await prisma.fbPage.update({
      where: { id: pageId },
      data: updateData,
    });

    return { success: true, data: { id: pageId } };
  } catch (error) {
    console.error("[updatePage] Error:", error);
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

    await logActivity({
      userId,
      entityType: "page",
      entityId: pageId,
      action: "page.disconnected",
      metadata: { name: page.name },
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
