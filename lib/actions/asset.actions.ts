"use server";

import { db } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth-utils";
import type { AssetCondition, AssetStatus } from "@prisma/client";

export async function getAssets(filters?: {
  status?: AssetStatus;
  categoryId?: string;
  location?: string;
  search?: string;
  isBookable?: boolean;
}) {
  try {
    await requireSession();
    
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.location) where.location = filters.location;
    if (filters?.isBookable !== undefined) where.isBookable = filters.isBookable;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { assetTag: { contains: filters.search, mode: "insensitive" } },
        { serialNumber: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const assets = await db.asset.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { name: "asc" },
    });
    
    return { success: true, data: assets };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAssetById(id: string) {
  try {
    await requireSession();
    const asset = await db.asset.findUnique({
      where: { id },
      include: {
        category: true,
        allocations: {
          include: { employee: true },
          orderBy: { allocatedAt: "desc" },
        },
        maintenanceRequests: {
          orderBy: { createdAt: "desc" },
        },
        bookings: {
          orderBy: { startTime: "desc" },
        },
      },
    });

    if (!asset) throw new Error("Asset not found");
    return { success: true, data: asset };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createAsset(data: {
  name: string;
  categoryId: string;
  serialNumber?: string;
  acquisitionDate: Date;
  acquisitionCost?: number;
  condition?: AssetCondition;
  location?: string;
  photoUrl?: string;
  documentUrls?: string[];
  isBookable?: boolean;
  customFieldValues?: any;
}) {
  try {
    const session = await requireRole(["ADMIN", "ASSET_MANAGER"]);

    // Generate Asset Tag
    const count = await db.asset.count();
    const assetTag = `AF-${String(count + 1).padStart(4, "0")}`;

    const asset = await db.asset.create({
      data: {
        ...data,
        assetTag,
        status: "AVAILABLE",
      },
    });

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "Registered new asset",
        entityType: "Asset",
        entityId: asset.id,
      },
    });

    return { success: true, data: asset };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAsset(
  id: string,
  data: {
    name?: string;
    categoryId?: string;
    serialNumber?: string;
    condition?: AssetCondition;
    location?: string;
    photoUrl?: string;
    isBookable?: boolean;
    status?: AssetStatus;
    customFieldValues?: any;
  }
) {
  try {
    const session = await requireRole(["ADMIN", "ASSET_MANAGER"]);

    const asset = await db.asset.update({
      where: { id },
      data,
    });

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "Updated asset details",
        entityType: "Asset",
        entityId: asset.id,
      },
    });

    return { success: true, data: asset };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
