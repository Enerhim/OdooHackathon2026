"use server";

import { db } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth-utils";
import type { AuditScopeType, AuditItemResult } from "@prisma/client";
import { createNotification } from "./notification.actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ---------------------------------------------------------------------------
// createAuditCycle
// ---------------------------------------------------------------------------

export async function createAuditCycle(data: {
  name: string;
  scopeType: AuditScopeType;
  scopeDepartmentId?: string;
  scopeLocation?: string;
  startDate: Date;
  endDate: Date;
}): Promise<ActionResult> {
  try {
    const session = await requireRole(["ADMIN"]);
    const userId = session.user.id;

    const result = await db.$transaction(async (tx) => {
      // 1. Create the audit cycle
      const cycle = await tx.auditCycle.create({
        data: {
          name: data.name,
          scopeType: data.scopeType,
          scopeDepartmentId: data.scopeDepartmentId ?? null,
          scopeLocation: data.scopeLocation ?? null,
          startDate: data.startDate,
          endDate: data.endDate,
          createdById: userId,
          status: "PLANNED",
        },
      });

      // 2. Determine which assets fall within the scope
      const assetWhere: Record<string, unknown> = {};

      switch (data.scopeType) {
        case "DEPARTMENT": {
          // Find all assets currently allocated to the scoped department
          if (!data.scopeDepartmentId) {
            throw new Error(
              "scopeDepartmentId is required when scopeType is DEPARTMENT",
            );
          }
          const allocations = await tx.assetAllocation.findMany({
            where: {
              departmentId: data.scopeDepartmentId,
              status: "ACTIVE",
            },
            select: { assetId: true },
          });
          const assetIds = allocations.map((a) => a.assetId);

          // Also include unallocated assets that belong to users in this dept
          const deptUserAllocations = await tx.assetAllocation.findMany({
            where: {
              employee: { departmentId: data.scopeDepartmentId },
              status: "ACTIVE",
            },
            select: { assetId: true },
          });
          const allAssetIds = [
            ...new Set([
              ...assetIds,
              ...deptUserAllocations.map((a) => a.assetId),
            ]),
          ];

          assetWhere.id = { in: allAssetIds };
          break;
        }
        case "LOCATION": {
          if (!data.scopeLocation) {
            throw new Error(
              "scopeLocation is required when scopeType is LOCATION",
            );
          }
          assetWhere.location = data.scopeLocation;
          break;
        }
        case "ORGANIZATION": {
          // All assets across the entire organization — no filter
          break;
        }
      }

      const assets = await tx.asset.findMany({
        where: assetWhere,
        select: { id: true },
      });

      // 3. Create audit items for each asset
      if (assets.length > 0) {
        await tx.auditItem.createMany({
          data: assets.map((asset) => ({
            auditCycleId: cycle.id,
            assetId: asset.id,
            result: "PENDING" as const,
          })),
        });
      }

      return { cycle, assetCount: assets.length };
    });

    await db.activityLog.create({
      data: {
        userId,
        action: "AUDIT_CYCLE_CREATED",
        entityType: "AuditCycle",
        entityId: result.cycle.id,
        metadata: {
          name: data.name,
          scopeType: data.scopeType,
          assetCount: result.assetCount,
        },
      },
    });

    return { success: true, data: result.cycle };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create audit cycle";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// assignAuditors
// ---------------------------------------------------------------------------

export async function assignAuditors(
  cycleId: string,
  auditorIds: string[],
): Promise<ActionResult> {
  try {
    const session = await requireRole(["ADMIN"]);
    const userId = session.user.id;

    // Verify the cycle exists
    const cycle = await db.auditCycle.findUnique({
      where: { id: cycleId },
    });
    if (!cycle) {
      return { success: false, error: "Audit cycle not found" };
    }

    const records = await db.auditCycleAuditor.createMany({
      data: auditorIds.map((auditorId) => ({
        auditCycleId: cycleId,
        auditorId,
      })),
      skipDuplicates: true,
    });

    await db.activityLog.create({
      data: {
        userId,
        action: "AUDIT_AUDITORS_ASSIGNED",
        entityType: "AuditCycle",
        entityId: cycleId,
        metadata: { auditorIds, count: records.count },
      },
    });

    for (const auditorId of auditorIds) {
      await createNotification({
        userId: auditorId,
        type: "ASSET_ASSIGNED",
        title: "Assigned to Audit Cycle",
        message: `You have been assigned as an auditor for the audit cycle: ${cycle.name}.`,
        relatedEntityType: "AuditCycle",
        relatedEntityId: cycle.id,
      });
    }

    return { success: true, data: { assignedCount: records.count } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to assign auditors";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// recordAuditItem
// ---------------------------------------------------------------------------

export async function recordAuditItem(
  itemId: string,
  result: AuditItemResult,
  notes?: string,
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    // Fetch the item to find its cycle
    const item = await db.auditItem.findUnique({
      where: { id: itemId },
      select: { id: true, auditCycleId: true, assetId: true },
    });
    if (!item) {
      return { success: false, error: "Audit item not found" };
    }

    // Verify the user is an assigned auditor for this cycle
    const assignment = await db.auditCycleAuditor.findUnique({
      where: {
        auditCycleId_auditorId: {
          auditCycleId: item.auditCycleId,
          auditorId: userId,
        },
      },
    });
    if (!assignment) {
      return {
        success: false,
        error: "You are not an assigned auditor for this cycle",
      };
    }

    const updated = await db.$transaction(async (tx) => {
      const updatedItem = await tx.auditItem.update({
        where: { id: itemId },
        data: {
          result,
          notes: notes ?? null,
          checkedAt: new Date(),
          auditorId: userId,
        },
      });

      // Auto-create discrepancy if result is MISSING or DAMAGED
      if (result === "MISSING" || result === "DAMAGED") {
        await tx.auditDiscrepancy.upsert({
          where: { auditItemId: itemId },
          create: {
            auditItemId: itemId,
            status: "OPEN",
          },
          update: {
            status: "OPEN",
          },
        });
      }

      return updatedItem;
    });

    await db.activityLog.create({
      data: {
        userId,
        action: "AUDIT_ITEM_RECORDED",
        entityType: "AuditItem",
        entityId: itemId,
        metadata: {
          auditCycleId: item.auditCycleId,
          assetId: item.assetId,
          result,
        },
      },
    });

    return { success: true, data: updated };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to record audit item";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// closeAuditCycle
// ---------------------------------------------------------------------------

export async function closeAuditCycle(
  cycleId: string,
): Promise<ActionResult> {
  try {
    const session = await requireRole(["ADMIN"]);
    const userId = session.user.id;

    const result = await db.$transaction(async (tx) => {
      // Close the cycle
      const cycle = await tx.auditCycle.update({
        where: { id: cycleId },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
        },
      });

      // Find all items marked MISSING and update those assets to LOST
      const missingItems = await tx.auditItem.findMany({
        where: {
          auditCycleId: cycleId,
          result: "MISSING",
        },
        select: { assetId: true },
      });

      if (missingItems.length > 0) {
        const missingAssetIds = missingItems.map((item) => item.assetId);
        await tx.asset.updateMany({
          where: { id: { in: missingAssetIds } },
          data: { status: "LOST" },
        });
      }

      return { cycle, missingCount: missingItems.length };
    });

    await db.activityLog.create({
      data: {
        userId,
        action: "AUDIT_CYCLE_CLOSED",
        entityType: "AuditCycle",
        entityId: cycleId,
        metadata: { missingAssetsMarkedLost: result.missingCount },
      },
    });

    return { success: true, data: result.cycle };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to close audit cycle";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// getAuditCycleDetails
// ---------------------------------------------------------------------------

export async function getAuditCycleDetails(
  id: string,
): Promise<ActionResult> {
  try {
    await requireSession();

    const cycle = await db.auditCycle.findUnique({
      where: { id },
      include: {
        auditors: {
          include: {
            auditor: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        auditItems: {
          include: {
            asset: true,
            discrepancy: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!cycle) {
      return { success: false, error: "Audit cycle not found" };
    }

    return { success: true, data: cycle };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch audit cycle details";
    return { success: false, error: message };
  }
}
