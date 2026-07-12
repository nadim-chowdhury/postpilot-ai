"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { AppError } from "@/lib/errors";
import type { ActionResult } from "@/types/api.types";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface ActivityEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// ─────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────

/**
 * Log an activity entry. Used internally by other actions.
 */
export async function logActivity(data: {
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        metadata: data.metadata
          ? (JSON.parse(JSON.stringify(data.metadata)) as undefined)
          : undefined,
      },
    });
  } catch (error) {
    // Activity logging should never block the main operation
    console.error("Failed to log activity:", error);
  }
}

// ─────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────

export async function getActivities(filters?: {
  entityType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ items: ActivityEntry[]; total: number }>> {
  try {
    const userId = await requireUserId();
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 30;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId };
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.action) {
      where.action = { contains: filters.action, mode: "insensitive" };
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.activityLog.count({ where }),
    ]);

    const items: ActivityEntry[] = activities.map((a) => ({
      id: a.id,
      entityType: a.entityType,
      entityId: a.entityId,
      action: a.action,
      metadata: a.metadata as Record<string, unknown> | null,
      createdAt: a.createdAt,
    }));

    return { success: true, data: { items, total } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: "Failed to fetch activities" };
  }
}
