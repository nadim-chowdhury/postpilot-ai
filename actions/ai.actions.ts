"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { generatePostContent, isContentUnique, type GeneratedPostType } from "@/lib/services/ai.service";
import { logActivity } from "@/actions/activity.actions";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { ActionResult } from "@/types/api.types";

/**
 * Generate a single post preview via AI.
 * The post is returned for client-side review/editing before saving.
 */
export async function generateSinglePost(
  pageId: string,
  tone: "educational" | "inspirational" | "conversational" | "humorous",
  customInstructions?: string,
): Promise<ActionResult<GeneratedPostType>> {
  try {
    const userId = await requireUserId();

    // Verify page belongs to user
    const page = await prisma.fbPage.findFirst({
      where: { id: pageId, userId },
    });

    if (!page) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Page not found", 404);
    }

    // Call service to run LLM generation
    const postData = await generatePostContent({
      pageName: page.name,
      topic: page.topic,
      personaPrompt: page.personaPrompt,
      tone,
      customInstructions,
    });

    return { success: true, data: postData };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    console.error("Failed to generate post:", error);
    return { success: false, error: "Failed to generate AI post content" };
  }
}

/**
 * Bulk Content Generator: Generates a week of drafts (7 posts) for every active page.
 * Enforces Jaccard uniqueness constraints. Saves them as drafts.
 */
export async function generateBulkWeeklyContent(): Promise<
  ActionResult<{ generatedCount: number }>
> {
  try {
    const userId = await requireUserId();

    // Fetch active pages for the user
    const pages = await prisma.fbPage.findMany({
      where: { userId, status: "ACTIVE" },
    });

    if (pages.length === 0) {
      return {
        success: false,
        error: "No active pages connected. Connect pages before generating content.",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    let generatedCount = 0;
    const modelName = process.env.OPENAI_API_KEY ? "gpt-4o" : "mock-model";

    for (const page of pages) {
      // Generate 7 posts (one per day for a week)
      for (let i = 0; i < 7; i++) {
        let uniquePost: GeneratedPostType | null = null;
        let attempts = 0;

        // Try up to 3 times to get a unique caption
        while (attempts < 3) {
          const tones: ("educational" | "inspirational" | "conversational" | "humorous")[] = [
            "educational",
            "inspirational",
            "conversational",
            "humorous",
          ];
          const randomTone = tones[Math.floor(Math.random() * tones.length)];

          const candidate = await generatePostContent({
            pageName: page.name,
            topic: page.topic,
            personaPrompt: page.personaPrompt,
            tone: randomTone,
            customInstructions: "Ensure this is highly unique compared to recent posts.",
          });

          // Check Jaccard overlap
          const unique = await isContentUnique(candidate.body, page.id);
          if (unique) {
            uniquePost = candidate;
            break;
          }
          attempts++;
        }

        // If unique, save to database as DRAFT
        if (uniquePost) {
          await prisma.post.create({
            data: {
              userId,
              fbPageId: page.id,
              title: uniquePost.title || `${page.topic} - AI Draft ${i + 1}`,
              body: uniquePost.body,
              mediaUrl: uniquePost.imagePrompt || null,
              mediaType: uniquePost.suggestImage ? "IMAGE" : "NONE",
              status: "DRAFT",
              aiGenerated: true,
              aiModel: modelName,
            },
          });
          generatedCount++;
        }
      }
    }

    // Log Activity
    await logActivity({
      userId,
      entityType: "post",
      entityId: "bulk-generation",
      action: "bulk_generation.completed",
      metadata: {
        generatedCount,
        pageCount: pages.length,
      },
    });

    return { success: true, data: { generatedCount } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    console.error("Bulk weekly generation failed:", error);
    return { success: false, error: "Bulk AI content generation failed" };
  }
}
