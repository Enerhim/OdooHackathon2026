"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

export async function getActivityLogs(
  filters?: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
  },
  page: number = 1,
  pageSize: number = 50
) {
  try {
    await requireRole(["ADMIN", "ASSET_MANAGER"]);

    const where: any = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.entityId) where.entityId = filters.entityId;
    
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const skip = (page - 1) * pageSize;

    const [logs, total] = await Promise.all([
      db.activityLog.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.activityLog.count({ where }),
    ]);

    return {
      success: true,
      data: {
        logs,
        total,
        page,
        pageSize,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
