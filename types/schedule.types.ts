import type { ScheduleStatus, SocialPlatform } from "@/lib/generated/prisma/enums";

// ─────────────────────────────────────────────
// Schedule Types
// ─────────────────────────────────────────────

export type { ScheduleStatus, SocialPlatform };

export interface ScheduleSummary {
  id: string;
  postId: string;
  postTitle: string | null;
  postBody: string;
  pageName: string;
  pageAvatarUrl: string | null;
  scheduledAt: Date;
  status: ScheduleStatus;
  retryCount: number;
  platform?: SocialPlatform;
}

export interface ScheduleDetail extends ScheduleSummary {
  fbPageId: string;
  publishedAt: Date | null;
  jitterSeconds: number;
  errorMessage: string | null;
  qstashMsgId: string | null;
  createdAt: Date;
}

export interface CreateScheduleInput {
  postId: string;
  fbPageId: string;
  scheduledAt: Date;
}

export interface BulkScheduleInput {
  items: CreateScheduleInput[];
}
