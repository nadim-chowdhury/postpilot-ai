"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { decrypt } from "@/lib/services/encryption.service";
import { fetchPostInsights } from "@/lib/services/meta-api.service";
import { AppError } from "@/lib/errors";
import type { ActionResult } from "@/types/api.types";

export interface AnalyticsSummary {
  date: string;
  likes: number;
  comments: number;
  shares: number;
  totalPosts: number;
}

export async function syncPostInsights(fbPageId: string): Promise<ActionResult<{ syncedCount: number }>> {
  try {
    const userId = await requireUserId();

    const page = await prisma.fbPage.findFirst({
      where: { id: fbPageId, userId },
    });

    if (!page) {
      return { success: false, error: "Page not found" };
    }

    const posts = await prisma.post.findMany({
      where: {
        fbPageId,
        userId,
        status: "POSTED",
        fbPostId: { not: null },
      },
      orderBy: { publishedAt: "desc" },
      take: 50, // Only sync the latest 50 posts for performance
    });

    if (posts.length === 0) {
      return { success: true, data: { syncedCount: 0 } };
    }

    const accessToken = decrypt(page.accessToken);
    let syncedCount = 0;

    for (const post of posts) {
      // Don't sync if we already synced in the last hour
      if (post.insightsLastSync && new Date().getTime() - post.insightsLastSync.getTime() < 3600000) {
        continue;
      }

      try {
        const insights = await fetchPostInsights(accessToken, post.fbPostId!);
        
        await prisma.post.update({
          where: { id: post.id },
          data: {
            likesCount: insights.likesCount,
            commentsCount: insights.commentsCount,
            sharesCount: insights.sharesCount,
            insightsLastSync: new Date(),
          },
        });
        syncedCount++;
      } catch (err) {
        console.error(`Failed to sync insights for post ${post.id}`, err);
      }
    }

    return { success: true, data: { syncedCount } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to sync insights" };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getDashboardAnalytics(fbPageId: string): Promise<ActionResult<{ data: AnalyticsSummary[], topPost: any }>> {
  try {
    const userId = await requireUserId();

    // Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const posts = await prisma.post.findMany({
      where: {
        fbPageId,
        userId,
        status: "POSTED",
        publishedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { publishedAt: "asc" },
      select: {
        id: true,
        title: true,
        body: true,
        publishedAt: true,
        likesCount: true,
        commentsCount: true,
        sharesCount: true,
      },
    });

    // Group by date (YYYY-MM-DD)
    const groupedData: Record<string, AnalyticsSummary> = {};
    let topPost = null;
    let maxEngagement = -1;

    for (const post of posts) {
      const dateStr = post.publishedAt!.toISOString().split('T')[0];
      if (!groupedData[dateStr]) {
        groupedData[dateStr] = {
          date: dateStr,
          likes: 0,
          comments: 0,
          shares: 0,
          totalPosts: 0,
        };
      }

      const likes = post.likesCount || 0;
      const comments = post.commentsCount || 0;
      const shares = post.sharesCount || 0;

      groupedData[dateStr].likes += likes;
      groupedData[dateStr].comments += comments;
      groupedData[dateStr].shares += shares;
      groupedData[dateStr].totalPosts += 1;

      const engagement = likes + comments * 2 + shares * 3;
      if (engagement > maxEngagement) {
        maxEngagement = engagement;
        topPost = post;
      }
    }

    const data = Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date));

    return { success: true, data: { data, topPost } };
  } catch {
    return { success: false, error: "Failed to load analytics" };
  }
}

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function generateAnalyticsSuggestions(pageName: string, topPostBody: string, topPostLikes: number): Promise<ActionResult<{ suggestion: string }>> {
  try {
    await requireUserId();
    
    if (!topPostBody) {
      return { success: true, data: { suggestion: "Publish more posts to get AI insights!" } };
    }

    const prompt = `You are a social media expert analyzing the performance of the Facebook page "${pageName}".
The best performing post recently was:
"${topPostBody}"
It received ${topPostLikes} likes.

Based on this top-performing post, provide 3 concrete suggestions for what type of content this page should post next to maximize engagement. Keep it concise, actionable, and formatted in Markdown bullet points.`;

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
    });

    return { success: true, data: { suggestion: text } };
  } catch (error) {
    console.error("Failed to generate suggestions", error);
    return { success: false, error: "Failed to generate AI suggestions" };
  }
}
