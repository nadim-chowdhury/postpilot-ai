import type {
  PageStatus,
  PostStatus,
  ScheduleStatus,
  MediaType,
} from "@/lib/generated/prisma/enums";

// ─────────────────────────────────────────────
// Page Types
// ─────────────────────────────────────────────

export type { PageStatus };

export interface PageSummary {
  id: string;
  name: string;
  topic: string;
  status: PageStatus;
  avatarUrl: string | null;
  postCount: number;
  lastPostedAt: Date | null;
  personaPrompt?: string | null;
  game?: string | null;
}

export interface PageDetail extends PageSummary {
  metaPageId: string;
  personaPrompt: string | null;
  tokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectPageInput {
  metaPageId: string;
  name: string;
  accessToken: string;
  topic: string;
  avatarUrl?: string;
}

export interface UpdatePageInput {
  topic?: string;
  personaPrompt?: string;
  status?: PageStatus;
  game?: string | null;
}
