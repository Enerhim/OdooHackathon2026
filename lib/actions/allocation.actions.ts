"use server";

import { db } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth-utils";
import type {
  AllocationStatus,
  AssetAllocation,
  Prisma,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

interface AllocateAssetData {
  assetId: string;
  employeeId?: string;
  departmentId?: string;
  expectedReturnDate?: Date;
}

interface GetAllocationsFilters {
  assetId?: string;
  employeeId?: string;
  departmentId?: string;
  status?: AllocationStatus;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Allocate an asset to an employee and/or department.
 * ASSET_MANAGER or ADMIN only.
 * The asset must have status AVAILABLE; otherwise an error with the current
 * holder info is returned.
 */
export async function allocateAsset(
  data: AllocateAssetData
): Promise<ActionResult<AssetAllocation>> {
  try {
    const session = await requireRole(["ASSET_MANAGER", "ADMIN"]);
    const userId = session.user.id;

    // Verify the asset exists and is available
    const asset = await db.asset.findUnique({
      where: { id: data.assetId },
      include: {
        allocations: {
          where: { status: "ACTIVE" },
          include: { employee: true, department: true },
          take: 1,
        },
      },
    });

    if (!asset) {
      return { success: false, error: "Asset not found" };
    }

    if (asset.status !== "AVAILABLE") {
      const activeAllocation = asset.allocations[0];
      const holderInfo = activeAllocation
        ? `Currently held by ${activeAllocation.employee?.name ?? "unknown"} (${activeAllocation.department?.name ?? "no department"})`
        : `Current status: ${asset.status}`;

      return {
        success: false,
        error: `Asset is not available for allocation. ${holderInfo}`,
      };
    }

    // Use a transaction to create the allocation and update the asset atomically
    const allocation = await db.$transaction(async (tx) => {
      const newAllocation = await tx.assetAllocation.create({
        data: {
          assetId: data.assetId,
          employeeId: data.employeeId,
          departmentId: data.departmentId,
          allocatedById: userId,
          expectedReturnDate: data.expectedReturnDate,
        },
        include: {
          asset: true,
          employee: true,
          department: true,
        },
      });

      await tx.asset.update({
        where: { id: data.assetId },
        data: { status: "ALLOCATED" },
      });

      return newAllocation;
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        action: "ASSET_ALLOCATED",
        entityType: "AssetAllocation",
        entityId: allocation.id,
        metadata: {
          assetId: data.assetId,
          employeeId: data.employeeId ?? null,
          departmentId: data.departmentId ?? null,
        },
      },
    });

    return { success: true, data: allocation };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to allocate asset";
    return { success: false, error: message };
  }
}

/**
 * Return a previously allocated asset.
 * ASSET_MANAGER or ADMIN only.
 * Marks the allocation as RETURNED and sets the asset status back to AVAILABLE.
 */
export async function returnAsset(
  allocationId: string,
  notes?: string
): Promise<ActionResult<AssetAllocation>> {
  try {
    const session = await requireRole(["ASSET_MANAGER", "ADMIN"]);
    const userId = session.user.id;

    const existing = await db.assetAllocation.findUnique({
      where: { id: allocationId },
      include: { asset: true },
    });

    if (!existing) {
      return { success: false, error: "Allocation not found" };
    }

    if (existing.status !== "ACTIVE") {
      return {
        success: false,
        error: `Allocation is not active (current status: ${existing.status})`,
      };
    }

    const allocation = await db.$transaction(async (tx) => {
      const updated = await tx.assetAllocation.update({
        where: { id: allocationId },
        data: {
          status: "RETURNED",
          actualReturnDate: new Date(),
          returnConditionNotes: notes,
        },
        include: {
          asset: true,
          employee: true,
          department: true,
        },
      });

      await tx.asset.update({
        where: { id: existing.assetId },
        data: { status: "AVAILABLE" },
      });

      return updated;
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        action: "ASSET_RETURNED",
        entityType: "AssetAllocation",
        entityId: allocation.id,
        metadata: {
          assetId: existing.assetId,
          returnNotes: notes ?? null,
        },
      },
    });

    return { success: true, data: allocation };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to return asset";
    return { success: false, error: message };
  }
}

/**
 * Find all active allocations that are past their expected return date.
 * ASSET_MANAGER, DEPARTMENT_HEAD, or ADMIN only.
 */
export async function getOverdueAllocations(): Promise<
  ActionResult<AssetAllocation[]>
> {
  try {
    await requireRole(["ASSET_MANAGER", "DEPARTMENT_HEAD", "ADMIN"]);

    const now = new Date();

    const overdueAllocations = await db.assetAllocation.findMany({
      where: {
        status: "ACTIVE",
        expectedReturnDate: { lt: now },
      },
      include: {
        asset: true,
        employee: true,
        department: true,
      },
      orderBy: { expectedReturnDate: "asc" },
    });

    return { success: true, data: overdueAllocations };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch overdue allocations";
    return { success: false, error: message };
  }
}

/**
 * List / filter allocations. Requires authentication.
 */
export async function getAllocations(
  filters?: GetAllocationsFilters
): Promise<ActionResult<AssetAllocation[]>> {
  try {
    await requireSession();

    const where: Prisma.AssetAllocationWhereInput = {};

    if (filters?.assetId) {
      where.assetId = filters.assetId;
    }
    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }
    if (filters?.departmentId) {
      where.departmentId = filters.departmentId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    const allocations = await db.assetAllocation.findMany({
      where,
      include: {
        asset: true,
        employee: true,
        department: true,
      },
      orderBy: { allocatedAt: "desc" },
    });

    return { success: true, data: allocations };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch allocations";
    return { success: false, error: message };
  }
}
