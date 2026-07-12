import { z } from "zod";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { prisma } from "@/lib/prisma";
import { AppError, ErrorCodes } from "@/lib/errors";

// ─────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────

export const GeneratedPostSchema = z.object({
  title: z.string().max(100),
  body: z.string().min(10).max(2000),
  hashtags: z.array(z.string()).max(5),
  tone: z.enum(["educational", "inspirational", "conversational", "humorous"]),
  suggestImage: z.boolean(),
  imagePrompt: z.string(),
});

export type GeneratedPostType = z.infer<typeof GeneratedPostSchema>;

// ─────────────────────────────────────────────
// Multi-Provider Model Resolution
// ─────────────────────────────────────────────

type ProviderName = "google" | "anthropic" | "openai" | "mock";

interface ResolvedModel {
  provider: ProviderName;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any;
  displayName: string;
}

/**
 * Detect which AI provider to use based on available API keys.
 * Priority: Google Gemini → Anthropic Claude → OpenAI → Mock fallback
 */
function resolveModel(): ResolvedModel {
  // 1. Google Gemini (free tier available via AI Studio)
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    return {
      provider: "google",
      model: google("gemini-2.5-flash"),
      displayName: "Gemini 2.5 Flash",
    };
  }

  // 2. Anthropic Claude
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const anthropic = createAnthropic({ apiKey: anthropicKey });
    return {
      provider: "anthropic",
      model: anthropic("claude-sonnet-4-20250514"),
      displayName: "Claude Sonnet 4",
    };
  }

  // 3. OpenAI (with key pool rotation)
  const openaiKey = getOpenAiApiKey();
  if (openaiKey) {
    const oai = createOpenAI({ apiKey: openaiKey });
    return {
      provider: "openai",
      model: oai("gpt-4o"),
      displayName: "GPT-4o",
    };
  }

  // 4. No keys → mock fallback
  return { provider: "mock", model: null, displayName: "Mock (No API Key)" };
}

/** Helper to retrieve and rotate OpenAI API Keys from pool */
function getOpenAiApiKey(): string | null {
  const keysEnv = process.env.OPENAI_API_KEYS;
  if (keysEnv) {
    const keys = keysEnv.split(",").map((k) => k.trim()).filter(Boolean);
    if (keys.length > 0) {
      const randomIndex = Math.floor(Math.random() * keys.length);
      return keys[randomIndex];
    }
  }
  return process.env.OPENAI_API_KEY || null;
}

// ─────────────────────────────────────────────
// Core Services
// ─────────────────────────────────────────────

/**
 * Generate a structured post using whichever AI provider is configured.
 * Priority: Google Gemini → Anthropic Claude → OpenAI → Mock fallback.
 */
export async function generatePostContent(params: {
  pageName: string;
  topic: string;
  personaPrompt?: string | null;
  tone: "educational" | "inspirational" | "conversational" | "humorous";
  customInstructions?: string;
}): Promise<GeneratedPostType> {
  const resolved = resolveModel();

  if (resolved.provider === "mock") {
    console.warn("No AI API key found. Returning mock AI post.");
    return getMockAiPost(params);
  }

  console.log(`[AI] Using provider: ${resolved.displayName}`);

  const systemInstructions = [
    `You are an AI assistant writing social media posts for a Facebook Page named "${params.pageName}".`,
    `The topic of this page is: "${params.topic}".`,
    params.personaPrompt
      ? `Write in accordance with this persona: "${params.personaPrompt}".`
      : `Write in a high-quality, professional, engaging tone.`,
    `Tone constraint: write a post that is strictly "${params.tone}".`,
    `Do not include placeholders, bracketed text, or templates. Return complete, ready-to-publish copy.`,
    `If you suggest an image (suggestImage=true), provide a descriptive imagePrompt for generating it. Otherwise set imagePrompt to an empty string.`,
  ].join("\n");

  const userPrompt = [
    `Generate one post about: "${params.topic}".`,
    params.customInstructions
      ? `Incorporate these specific instructions: "${params.customInstructions}".`
      : "",
  ].filter(Boolean).join("\n");

  try {
    const { object } = await generateObject({
      model: resolved.model,
      schema: GeneratedPostSchema,
      system: systemInstructions,
      prompt: userPrompt,
      temperature: 0.8,
    });

    return object;
  } catch (error) {
    console.error(`[AI] ${resolved.displayName} generation failed:`, error);
    throw new AppError(
      ErrorCodes.AI_GENERATION_FAILED,
      `AI post generation failed: ${(error as Error).message || "Provider error"}`,
      500,
    );
  }
}

/**
 * Perform a lightweight local Jaccard token-overlap check to verify content uniqueness.
 * Prevents publishing duplicate/semantically-identical captions within a 24-hour window.
 */
export async function isContentUnique(
  body: string,
  fbPageId: string,
): Promise<boolean> {
  const threshold = 0.8; // Reject if similarity is 80% or higher
  const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentPosts = await prisma.post.findMany({
    where: {
      fbPageId,
      createdAt: {
        gte: past24Hours,
      },
    },
    select: { body: true },
  });

  for (const post of recentPosts) {
    const similarity = calculateJaccardSimilarity(body, post.body);
    if (similarity >= threshold) {
      console.warn(`Content rejected as duplicate. Similarity: ${similarity.toFixed(2)}`);
      return false;
    }
  }

  return true;
}

// ─────────────────────────────────────────────
// Helper Utils
// ─────────────────────────────────────────────

function calculateJaccardSimilarity(str1: string, str2: string): number {
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2); // ignore small words

  const set1 = new Set(normalize(str1));
  const set2 = new Set(normalize(str2));

  if (set1.size === 0 || set2.size === 0) return 0;

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

function getMockAiPost(params: {
  topic: string;
  tone: string;
  customInstructions?: string;
}): GeneratedPostType {
  const details = params.customInstructions
    ? ` focusing on "${params.customInstructions}"`
    : "";
  return {
    title: `AI generated post about ${params.topic.substring(0, 30)}`,
    body: `Here is an automated ${params.tone} post about our favorite topic: ${params.topic}! We are discussing this today${details}. Follow for more updates! #AI #Automation`,
    hashtags: ["ai", "automation", params.tone],
    tone: params.tone as "educational" | "inspirational" | "conversational" | "humorous",
    suggestImage: true,
    imagePrompt: `A beautiful high-quality editorial photograph illustrating ${params.topic}`,
  };
}

/**
 * Analyze a page's name and category using AI to recommend a relevant topic and persona.
 */
export async function generatePageTopicAndPersona(
  pageName: string,
  category: string,
): Promise<{ topic: string; personaPrompt: string }> {
  const resolved = resolveModel();

  if (resolved.provider === "mock") {
    return {
      topic: category || "General",
      personaPrompt: `An engaging and professional voice representing ${pageName}.`,
    };
  }

  try {
    const systemInstructions = `You are a social media branding expert. Given a Facebook page name and category, generate a concise, engaging primary topic (1-5 words) and a detailed persona prompt (2-3 sentences) defining the writing tone and style for content automation on this page.`;
    const userPrompt = `Page Name: "${pageName}"\nCategory: "${category}"`;

    const resultSchema = z.object({
      topic: z.string().max(80),
      personaPrompt: z.string().max(300),
    });

    const { object } = await generateObject({
      model: resolved.model,
      schema: resultSchema,
      system: systemInstructions,
      prompt: userPrompt,
      temperature: 0.7,
    });

    return object;
  } catch (error) {
    console.error("[AI] Topic & Persona generation failed:", error);
    return {
      topic: category || "General",
      personaPrompt: `An engaging and professional voice representing ${pageName}.`,
    };
  }
}

