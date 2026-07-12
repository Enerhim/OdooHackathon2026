"use server";

import { db } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth-utils";
import type { MaintenancePriority, MaintenanceStatus } from "@prisma/client";
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
// createMaintenanceRequest
// ---------------------------------------------------------------------------

export async function createMaintenanceRequest(data: {
  assetId: string;
  issueDescription: string;
  priority?: MaintenancePriority;
  photoUrl?: string;
}): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const request = await db.maintenanceRequest.create({
      data: {
        assetId: data.assetId,
        raisedById: userId,
        issueDescription: data.issueDescription,
        priority: data.priority ?? "MEDIUM",
        photoUrl: data.photoUrl,
        status: "PENDING",
      },
    });

    await db.activityLog.create({
      data: {
        userId,
        action: "MAINTENANCE_REQUEST_CREATED",
        entityType: "MaintenanceRequest",
        entityId: request.id,
        metadata: {
          assetId: data.assetId,
          priority: data.priority ?? "MEDIUM",
        },
      },
    });

    return { success: true, data: request };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create maintenance request";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// approveMaintenanceRequest
// ---------------------------------------------------------------------------

export async function approveMaintenanceRequest(
  id: string,
): Promise<ActionResult> {
  try {
    const session = await requireRole(["ASSET_MANAGER", "ADMIN"]);
    const userId = session.user.id;

    const result = await db.$transaction(async (tx) => {
      const request = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: userId,
        },
        include: { asset: true },
      });

      await tx.asset.update({
        where: { id: request.assetId },
        data: { status: "UNDER_MAINTENANCE" },
      });

      return request;
    });

    await db.activityLog.create({
      data: {
        userId,
        action: "MAINTENANCE_REQUEST_APPROVED",
        entityType: "MaintenanceRequest",
        entityId: id,
        metadata: { assetId: result.assetId },
      },
    });

    await createNotification({
      userId: result.raisedById,
      type: "MAINTENANCE_APPROVED",
      title: "Maintenance Request Approved",
      message: `Your maintenance request for asset ${result.asset.name} has been approved.`,
      relatedEntityType: "MaintenanceRequest",
      relatedEntityId: result.id,
    });

    return { success: true, data: result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to approve maintenance request";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// rejectMaintenanceRequest
// ---------------------------------------------------------------------------

export async function rejectMaintenanceRequest(
  id: string,
  reason?: string,
): Promise<ActionResult> {
  try {
    const session = await requireRole(["ASSET_MANAGER", "ADMIN"]);
    const userId = session.user.id;

    const request = await db.maintenanceRequest.update({
      where: { id },
      data: { status: "REJECTED" },
      include: { asset: true },
    });

    await db.activityLog.create({
      data: {
        userId,
        action: "MAINTENANCE_REQUEST_REJECTED",
        entityType: "MaintenanceRequest",
        entityId: id,
        metadata: { assetId: request.assetId, reason: reason ?? null },
      },
    });

    await createNotification({
      userId: request.raisedById,
      type: "MAINTENANCE_REJECTED",
      title: "Maintenance Request Rejected",
      message: `Your maintenance request for asset ${request.asset.name} has been rejected.`,
      relatedEntityType: "MaintenanceRequest",
      relatedEntityId: request.id,
    });

    return { success: true, data: request };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reject maintenance request";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// assignTechnician
// ---------------------------------------------------------------------------

export async function assignTechnician(
  id: string,
  technicianName: string,
): Promise<ActionResult> {
  try {
    const session = await requireRole(["ASSET_MANAGER", "ADMIN"]);
    const userId = session.user.id;

    const request = await db.maintenanceRequest.update({
      where: { id },
      data: {
        status: "TECHNICIAN_ASSIGNED",
        technicianName,
      },
    });

    await db.activityLog.create({
      data: {
        userId,
        action: "MAINTENANCE_TECHNICIAN_ASSIGNED",
        entityType: "MaintenanceRequest",
        entityId: id,
        metadata: { assetId: request.assetId, technicianName },
      },
    });

    return { success: true, data: request };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to assign technician";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// resolveMaintenanceRequest
// ---------------------------------------------------------------------------

export async function resolveMaintenanceRequest(
  id: string,
): Promise<ActionResult> {
  try {
    const session = await requireRole(["ASSET_MANAGER", "ADMIN"]);
    const userId = session.user.id;

    const result = await db.$transaction(async (tx) => {
      const request = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
        },
      });

      await tx.asset.update({
        where: { id: request.assetId },
        data: { status: "AVAILABLE" },
      });

      return request;
    });

    await db.activityLog.create({
      data: {
        userId,
        action: "MAINTENANCE_REQUEST_RESOLVED",
        entityType: "MaintenanceRequest",
        entityId: id,
        metadata: { assetId: result.assetId },
      },
    });

    return { success: true, data: result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to resolve maintenance request";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// getMaintenanceRequests
// ---------------------------------------------------------------------------

export async function getMaintenanceRequests(filters?: {
  assetId?: string;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
}): Promise<ActionResult> {
  try {
    await requireSession();

    const where: Record<string, unknown> = {};
    if (filters?.assetId) where.assetId = filters.assetId;
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;

    const requests = await db.maintenanceRequest.findMany({
      where,
      include: {
        asset: true,
        raisedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: requests };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch maintenance requests";
    return { success: false, error: message };
  }
}
