"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { decrypt } from "@/lib/services/encryption.service";
import { fetchPostInsights, fetchPageFeed } from "@/lib/services/meta-api.service";
import { AppError } from "@/lib/errors";
import type { ActionResult } from "@/types/api.types";

export interface AnalyticsSummary {
  date: string;
  likes: number;
  comments: number;
  shares: number;
  totalPosts: number;
}

// ─────────────────────────────────────────────
// Page Detailed Stats
// ─────────────────────────────────────────────

export interface PostStatusCounts {
  draft: number;
  approved: number;
  scheduled: number;
  publishing: number;
  posted: number;
  failed: number;
  archived: number;
}

export interface ScheduleHealthStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  cancelled: number;
  successRate: number;
}

export interface TopPost {
  id: string;
  title: string | null;
  body: string;
  publishedAt: Date | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  engagementScore: number;
  aiGenerated: boolean;
}

export interface RecentPost {
  id: string;
  title: string | null;
  body: string;
  status: string;
  createdAt: Date;
  publishedAt: Date | null;
  aiGenerated: boolean;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
}

export interface HeatmapEntry {
  day: number;
  hourBlock: number;
  engagement: number;
  count: number;
}

export interface PageDetailedStats {
  postStatusCounts: PostStatusCounts;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalEngagement: number;
  aiGeneratedCount: number;
  manualCount: number;
  aiRatio: number;
  engagementTimeline: AnalyticsSummary[];
  topPosts: TopPost[];
  recentPosts: RecentPost[];
  scheduleHealth: ScheduleHealthStats;
  avgEngagementPerPost: number;
  publishingFrequency: { date: string; count: number }[];
  bestPostingTimes: HeatmapEntry[];
}

export async function getPageDetailedStats(
  fbPageId: string,
  options?: { startDate?: string; endDate?: string },
): Promise<ActionResult<PageDetailedStats>> {
  try {
    const userId = await requireUserId();

    // Verify page ownership
    const page = await prisma.fbPage.findFirst({
      where: { id: fbPageId, userId },
      select: { id: true },
    });

    if (!page) {
      return { success: false, error: "Page not found" };
    }

    // Determine date range
    const endDate = options?.endDate ? new Date(options.endDate) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = options?.startDate
      ? new Date(options.startDate)
      : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
    startDate.setHours(0, 0, 0, 0);

    // Run all queries in parallel for performance
    const [
      allPosts,
      scheduleStats,
    ] = await Promise.all([
      // Posts within the date range
      prisma.post.findMany({
        where: {
          fbPageId,
          userId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          title: true,
          body: true,
          status: true,
          aiGenerated: true,
          likesCount: true,
          commentsCount: true,
          sharesCount: true,
          createdAt: true,
          publishedAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      // Schedule stats within the date range
      prisma.schedule.groupBy({
        by: ["status"],
        where: {
          fbPageId,
          userId,
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: { id: true },
      }),
    ]);

    // Post status counts
    const postStatusCounts: PostStatusCounts = {
      draft: 0,
      approved: 0,
      scheduled: 0,
      publishing: 0,
      posted: 0,
      failed: 0,
      archived: 0,
    };

    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let aiGeneratedCount = 0;

    for (const post of allPosts) {
      const key = post.status.toLowerCase() as keyof PostStatusCounts;
      if (key in postStatusCounts) {
        postStatusCounts[key]++;
      }

      const likes = post.likesCount ?? 0;
      const comments = post.commentsCount ?? 0;
      const shares = post.sharesCount ?? 0;

      totalLikes += likes;
      totalComments += comments;
      totalShares += shares;

      if (post.aiGenerated) aiGeneratedCount++;
    }

    const totalPosts = allPosts.length;
    const manualCount = totalPosts - aiGeneratedCount;
    const totalEngagement = totalLikes + totalComments + totalShares;
    const aiRatio = totalPosts > 0 ? Math.round((aiGeneratedCount / totalPosts) * 100) : 0;
    const avgEngagementPerPost = postStatusCounts.posted > 0
      ? Math.round(totalEngagement / postStatusCounts.posted)
      : 0;

    // Engagement timeline (within date range, grouped by date)
    const publishedPosts = allPosts.filter(
      (p) => p.status === "POSTED" && p.publishedAt,
    );

    const timelineMap: Record<string, AnalyticsSummary> = {};
    const freqMap: Record<string, number> = {};

    for (const post of publishedPosts) {
      const dateStr = post.publishedAt!.toISOString().split("T")[0];

      freqMap[dateStr] = (freqMap[dateStr] || 0) + 1;

      if (!timelineMap[dateStr]) {
        timelineMap[dateStr] = {
          date: dateStr,
          likes: 0,
          comments: 0,
          shares: 0,
          totalPosts: 0,
        };
      }
      timelineMap[dateStr].likes += post.likesCount ?? 0;
      timelineMap[dateStr].comments += post.commentsCount ?? 0;
      timelineMap[dateStr].shares += post.sharesCount ?? 0;
      timelineMap[dateStr].totalPosts += 1;
    }

    const engagementTimeline = Object.values(timelineMap).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    // Publishing frequency
    const publishingFrequency = Object.entries(freqMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Best posting time heatmap (7 days x 8 hour blocks of 3 hours each)
    const heatmapGrid: Record<string, { totalEngagement: number; count: number }> = {};
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 8; h++) {
        heatmapGrid[`${d}_${h}`] = { totalEngagement: 0, count: 0 };
      }
    }

    for (const post of publishedPosts) {
      if (!post.publishedAt) continue;

      const pubDate = new Date(post.publishedAt);
      const day = pubDate.getDay(); // 0 (Sun) - 6 (Sat)
      const hour = pubDate.getHours(); // 0-23
      const hourBlock = Math.floor(hour / 3); // 0-7

      const likes = post.likesCount ?? 0;
      const comments = post.commentsCount ?? 0;
      const shares = post.sharesCount ?? 0;
      const engagement = likes + comments * 2 + shares * 3;

      const key = `${day}_${hourBlock}`;
      if (heatmapGrid[key]) {
        heatmapGrid[key].totalEngagement += engagement;
        heatmapGrid[key].count += 1;
      }
    }

    const bestPostingTimes: HeatmapEntry[] = [];
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 8; h++) {
        const key = `${d}_${h}`;
        const cell = heatmapGrid[key];
        bestPostingTimes.push({
          day: d,
          hourBlock: h,
          engagement: cell.count > 0 ? Math.round(cell.totalEngagement / cell.count) : 0,
          count: cell.count,
        });
      }
    }

    // Top posts by engagement score
    const topPosts: TopPost[] = publishedPosts
      .map((p) => {
        const likes = p.likesCount ?? 0;
        const comments = p.commentsCount ?? 0;
        const shares = p.sharesCount ?? 0;
        return {
          id: p.id,
          title: p.title,
          body: p.body,
          publishedAt: p.publishedAt,
          likesCount: likes,
          commentsCount: comments,
          sharesCount: shares,
          engagementScore: likes + comments * 2 + shares * 3,
          aiGenerated: p.aiGenerated,
        };
      })
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 5);

    // Recent posts (latest 10)
    const recentPosts: RecentPost[] = allPosts.slice(0, 10).map((p) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      status: p.status,
      createdAt: p.createdAt,
      publishedAt: p.publishedAt,
      aiGenerated: p.aiGenerated,
      likesCount: p.likesCount ?? 0,
      commentsCount: p.commentsCount ?? 0,
      sharesCount: p.sharesCount ?? 0,
    }));

    // Schedule health
    const scheduleHealth: ScheduleHealthStats = {
      total: 0,
      completed: 0,
      pending: 0,
      failed: 0,
      cancelled: 0,
      successRate: 0,
    };

    for (const group of scheduleStats) {
      const count = group._count.id;
      scheduleHealth.total += count;
      const status = group.status.toLowerCase();
      if (status === "completed") scheduleHealth.completed = count;
      else if (status === "pending" || status === "in_progress") scheduleHealth.pending += count;
      else if (status === "failed") scheduleHealth.failed = count;
      else if (status === "cancelled") scheduleHealth.cancelled = count;
    }

    const finishedSchedules = scheduleHealth.completed + scheduleHealth.failed;
    scheduleHealth.successRate =
      finishedSchedules > 0
        ? Math.round((scheduleHealth.completed / finishedSchedules) * 100)
        : 100;

    return {
      success: true,
      data: {
        postStatusCounts,
        totalPosts,
        totalLikes,
        totalComments,
        totalShares,
        totalEngagement,
        aiGeneratedCount,
        manualCount,
        aiRatio,
        engagementTimeline,
        topPosts,
        recentPosts,
        scheduleHealth,
        avgEngagementPerPost,
        publishingFrequency,
        bestPostingTimes,
      },
    };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to load page stats" };
  }
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

    const accessToken = decrypt(page.accessToken);

    // 1. Fetch latest feed posts from Meta API (with Dev Fallback for mock pages)
    const feedPosts = await fetchPageFeed(accessToken, page.metaPageId, 50);

    // 2. Import posts that do not exist in the database yet
    for (const feedPost of feedPosts) {
      const existing = await prisma.post.findFirst({
        where: { fbPostId: feedPost.id, userId },
      });

      if (!existing) {
        const titleStr = feedPost.message 
          ? (feedPost.message.length > 30 ? feedPost.message.slice(0, 30) + "..." : feedPost.message)
          : "Imported Feed Post";

        await prisma.post.create({
          data: {
            fbPageId,
            userId,
            fbPostId: feedPost.id,
            title: titleStr,
            body: feedPost.message || "No commentary text.",
            status: "POSTED",
            publishedAt: new Date(feedPost.created_time),
            createdAt: new Date(feedPost.created_time),
            aiGenerated: false,
          },
        });
      }
    }

    // 3. Query all posts under this page that need insights syncing
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

// ─────────────────────────────────────────────
// Multi-Page Comparison Stats
// ─────────────────────────────────────────────

export interface ComparativePageStats {
  id: string;
  name: string;
  avatarUrl: string | null;
  platform: string;
  totalPosts: number;
  postedCount: number;
  scheduledCount: number;
  failedCount: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalEngagement: number;
  aiGeneratedCount: number;
  aiRatio: number;
}

export interface MultiPageComparisonData {
  pages: Record<string, { name: string; avatarUrl: string | null; platform: string }>;
  pagePerformance: ComparativePageStats[];
  timeline: {
    date: string;
    [key: string]: number | string; // e.g. `${pageId}_engagement`
  }[];
}

export async function getMultiPageComparisonStats(
  fbPageIds: string[],
  options?: { startDate?: string; endDate?: string },
): Promise<ActionResult<MultiPageComparisonData>> {
  try {
    const userId = await requireUserId();

    if (fbPageIds.length === 0) {
      return { success: true, data: { pages: {}, pagePerformance: [], timeline: [] } };
    }

    // Verify all pages belong to user
    const dbPages = await prisma.fbPage.findMany({
      where: { id: { in: fbPageIds }, userId },
      select: { id: true, name: true, avatarUrl: true, platform: true },
    });

    if (dbPages.length === 0) {
      return { success: false, error: "No valid pages found" };
    }

    const validPageIds = dbPages.map((p) => p.id);
    const pagesMetadata: Record<string, { name: string; avatarUrl: string | null; platform: string }> = {};
    for (const p of dbPages) {
      pagesMetadata[p.id] = { name: p.name, avatarUrl: p.avatarUrl, platform: p.platform };
    }

    // Determine date range
    const endDate = options?.endDate ? new Date(options.endDate) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = options?.startDate
      ? new Date(options.startDate)
      : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
    startDate.setHours(0, 0, 0, 0);

    // Fetch all posts for the selected pages in the date range
    const posts = await prisma.post.findMany({
      where: {
        fbPageId: { in: validPageIds },
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        fbPageId: true,
        status: true,
        aiGenerated: true,
        likesCount: true,
        commentsCount: true,
        sharesCount: true,
        publishedAt: true,
      },
    });

    // Group posts by page
    const pageStatsMap: Record<string, ComparativePageStats> = {};
    for (const pageId of validPageIds) {
      const meta = pagesMetadata[pageId];
      pageStatsMap[pageId] = {
        id: pageId,
        name: meta.name,
        avatarUrl: meta.avatarUrl,
        platform: meta.platform,
        totalPosts: 0,
        postedCount: 0,
        scheduledCount: 0,
        failedCount: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalEngagement: 0,
        aiGeneratedCount: 0,
        aiRatio: 0,
      };
    }

    // timeline: date -> pageId -> engagement/likes
    const timelineMap: Record<string, Record<string, { likes: number; comments: number; shares: number; engagement: number }>> = {};

    for (const post of posts) {
      const stats = pageStatsMap[post.fbPageId];
      if (!stats) continue;

      stats.totalPosts++;
      if (post.aiGenerated) stats.aiGeneratedCount++;

      const likes = post.likesCount ?? 0;
      const comments = post.commentsCount ?? 0;
      const shares = post.sharesCount ?? 0;
      const engagement = likes + comments * 2 + shares * 3;

      if (post.status === "POSTED") {
        stats.postedCount++;
        stats.totalLikes += likes;
        stats.totalComments += comments;
        stats.totalShares += shares;
        stats.totalEngagement += engagement;

        if (post.publishedAt) {
          const dateStr = post.publishedAt.toISOString().split("T")[0];
          if (!timelineMap[dateStr]) {
            timelineMap[dateStr] = {};
          }
          if (!timelineMap[dateStr][post.fbPageId]) {
            timelineMap[dateStr][post.fbPageId] = { likes: 0, comments: 0, shares: 0, engagement: 0 };
          }
          timelineMap[dateStr][post.fbPageId].likes += likes;
          timelineMap[dateStr][post.fbPageId].comments += comments;
          timelineMap[dateStr][post.fbPageId].shares += shares;
          timelineMap[dateStr][post.fbPageId].engagement += engagement;
        }
      } else if (post.status === "FAILED") {
        stats.failedCount++;
      } else if (post.status === "SCHEDULED") {
        stats.scheduledCount++;
      } else if (post.status === "DRAFT") {
        // counted in total, not posted/failed/scheduled
      }
    }

    // Add scheduled counts from schedules as well to ensure accuracy if needed, 
    // but relying on posts status is fine.

    // Calculate ratios
    const pagePerformance = Object.values(pageStatsMap).map((stats) => {
      stats.aiRatio = stats.totalPosts > 0 ? Math.round((stats.aiGeneratedCount / stats.totalPosts) * 100) : 0;
      return stats;
    });

    // Construct unified timeline for recharts
    const timeline: { date: string; [key: string]: number | string }[] = [];
    const dateStrings = Object.keys(timelineMap).sort();

    for (const dStr of dateStrings) {
      const entry: { date: string; [key: string]: number | string } = { date: dStr };
      for (const pageId of validPageIds) {
        const pageTimeline = timelineMap[dStr][pageId];
        entry[`${pageId}_likes`] = pageTimeline ? pageTimeline.likes : 0;
        entry[`${pageId}_comments`] = pageTimeline ? pageTimeline.comments : 0;
        entry[`${pageId}_shares`] = pageTimeline ? pageTimeline.shares : 0;
        entry[`${pageId}_engagement`] = pageTimeline ? pageTimeline.engagement : 0;
      }
      timeline.push(entry);
    }

    return {
      success: true,
      data: {
        pages: pagesMetadata,
        pagePerformance,
        timeline,
      },
    };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to load comparative page stats" };
  }
}

