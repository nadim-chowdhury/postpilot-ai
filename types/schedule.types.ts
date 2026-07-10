import type { ScheduleStatus } from "@/lib/generated/prisma/enums";

// ─────────────────────────────────────────────
// Schedule Types
// ─────────────────────────────────────────────

export type { ScheduleStatus };

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
