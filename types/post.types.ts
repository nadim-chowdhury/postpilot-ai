import type { PostStatus, MediaType, SocialPlatform } from "@/lib/generated/prisma/enums";

// ─────────────────────────────────────────────
// Post Types
// ─────────────────────────────────────────────

export type { PostStatus, MediaType, SocialPlatform };

export interface PostSummary {
  id: string;
  title: string | null;
  body: string;
  mediaType: MediaType;
  status: PostStatus;
  aiGenerated: boolean;
  pageName: string;
  pageAvatarUrl: string | null;
  fbPageId: string;
  createdAt: Date;
  publishedAt: Date | null;
  platform?: SocialPlatform;
}

export interface PostDetail extends PostSummary {
  fbPageId: string;
  mediaUrl: string | null;
  fbPostId: string | null;
  aiModel: string | null;
  updatedAt: Date;
}

export interface CreatePostInput {
  fbPageId: string;
  title?: string;
  body: string;
  mediaUrl?: string;
  mediaType?: MediaType;
}

export interface UpdatePostInput {
  title?: string;
  body?: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  status?: PostStatus;
}

export interface GeneratePostInput {
  fbPageId: string;
  topic?: string;
  tone?: "educational" | "inspirational" | "conversational" | "humorous";
  customPrompt?: string;
}

export interface GeneratedPost {
  title: string;
  body: string;
  hashtags: string[];
  tone: "educational" | "inspirational" | "conversational" | "humorous";
  suggestImage: boolean;
  imagePrompt?: string;
}
