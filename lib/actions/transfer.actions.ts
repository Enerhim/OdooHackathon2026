"use server";

import { db } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth-utils";
import type { TransferStatus } from "@prisma/client";
import { createNotification } from "./notification.actions";

export async function createTransferRequest(data: {
  assetId: string;
  toEmployeeId?: string;
  toDepartmentId?: string;
  notes?: string;
}) {
  try {
    const session = await requireSession();

    // Find the current active allocation for this asset
    const currentAllocation = await db.assetAllocation.findFirst({
      where: {
        assetId: data.assetId,
        status: "ACTIVE",
      },
    });

    if (!currentAllocation) {
      throw new Error("Cannot transfer: No active allocation found for this asset");
    }

    const transfer = await db.transferRequest.create({
      data: {
        assetId: data.assetId,
        fromAllocationId: currentAllocation.id,
        requestedById: session.user.id,
        toEmployeeId: data.toEmployeeId,
        toDepartmentId: data.toDepartmentId,
        notes: data.notes,
        status: "REQUESTED",
      },
    });

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "Requested asset transfer",
        entityType: "TransferRequest",
        entityId: transfer.id,
      },
    });

    return { success: true, data: transfer };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function approveTransfer(id: string) {
  try {
    const session = await requireRole(["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD"]);

    const transfer = await db.transferRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
      include: { asset: true },
    });

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "Approved asset transfer",
        entityType: "TransferRequest",
        entityId: transfer.id,
      },
    });

    await createNotification({
      userId: transfer.requestedById,
      type: "TRANSFER_APPROVED",
      title: "Transfer Request Approved",
      message: `Your transfer request for asset ${transfer.asset.name} has been approved.`,
      relatedEntityType: "TransferRequest",
      relatedEntityId: transfer.id,
    });

    return { success: true, data: transfer };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function rejectTransfer(id: string, reason?: string) {
  try {
    const session = await requireRole(["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD"]);

    const transfer = await db.transferRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        notes: reason,
      },
      include: { asset: true },
    });

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "Rejected asset transfer",
        entityType: "TransferRequest",
        entityId: transfer.id,
      },
    });

    await createNotification({
      userId: transfer.requestedById,
      type: "TRANSFER_REJECTED",
      title: "Transfer Request Rejected",
      message: `Your transfer request for asset ${transfer.asset.name} has been rejected.`,
      relatedEntityType: "TransferRequest",
      relatedEntityId: transfer.id,
    });

    return { success: true, data: transfer };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function completeTransfer(id: string) {
  try {
    const session = await requireRole(["ADMIN", "ASSET_MANAGER"]);

    const result = await db.$transaction(async (tx) => {
      const transfer = await tx.transferRequest.findUnique({
        where: { id },
        include: { asset: true },
      });

      if (!transfer || transfer.status !== "APPROVED") {
        throw new Error("Transfer must be in APPROVED state to complete");
      }

      // 1. Mark transfer completed
      const updatedTransfer = await tx.transferRequest.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      // 2. Mark old allocation as TRANSFERRED
      if (transfer.fromAllocationId) {
        await tx.assetAllocation.update({
          where: { id: transfer.fromAllocationId },
          data: {
            status: "TRANSFERRED",
            actualReturnDate: new Date(),
          },
        });
      }

      // 3. Create new allocation
      await tx.assetAllocation.create({
        data: {
          assetId: transfer.assetId,
          employeeId: transfer.toEmployeeId,
          departmentId: transfer.toDepartmentId,
          allocatedById: session.user.id,
          status: "ACTIVE",
        },
      });

      return updatedTransfer;
    });

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "Completed asset transfer",
        entityType: "TransferRequest",
        entityId: id,
      },
    });

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTransferRequests(filters?: {
  assetId?: string;
  status?: TransferStatus;
}) {
  try {
    await requireSession();

    const where: any = {};
    if (filters?.assetId) where.assetId = filters.assetId;
    if (filters?.status) where.status = filters.status;

    const transfers = await db.transferRequest.findMany({
      where,
      include: {
        asset: true,
        requestedBy: true,
        toEmployee: true,
        toDepartment: true,
      },
      orderBy: { requestedAt: "desc" },
    });

    return { success: true, data: transfers };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
