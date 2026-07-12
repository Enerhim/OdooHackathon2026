"use server";

import { db } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

async function verifyAssetManagerDeptConstraint(assetId: string) {
  const session = await requireSession();
  const user = session.user as any;
  if (user.role === "ADMIN") return;

  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  
  const currentAllocation = await db.assetAllocation.findFirst({
    where: { assetId, status: "ACTIVE" },
    include: { employee: true }
  });

  if (currentAllocation && currentAllocation.employee?.departmentId !== dbUser?.departmentId) {
    throw new Error("Forbidden: This asset is allocated to a different department.");
  }
}

export async function createAsset(data: any) {
  try {
    await requireRole(["ADMIN", "ASSET_MANAGER"]);
    const asset = await db.asset.create({
      data: {
        assetTag: data.assetTag,
        name: data.name,
        categoryId: data.categoryId,
        acquisitionDate: new Date(data.acquisitionDate),
        acquisitionCost: data.acquisitionCost ? parseFloat(data.acquisitionCost) : null,
        condition: data.condition || "NEW",
        status: data.status || "AVAILABLE",
        location: data.location || null,
        photoUrl: data.photoUrl || null,
      }
    });
    revalidatePath("/dashboard/assets");
    return { success: true, data: asset };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAsset(id: string, data: any) {
  try {
    await requireRole(["ADMIN", "ASSET_MANAGER"]);
    await verifyAssetManagerDeptConstraint(id);
    
    const asset = await db.asset.update({
      where: { id },
      data: {
        assetTag: data.assetTag,
        name: data.name,
        categoryId: data.categoryId,
        acquisitionDate: new Date(data.acquisitionDate),
        acquisitionCost: data.acquisitionCost ? parseFloat(data.acquisitionCost) : null,
        condition: data.condition,
        status: data.status,
        location: data.location || null,
        photoUrl: data.photoUrl || null,
      }
    });
    revalidatePath("/dashboard/assets");
    return { success: true, data: asset };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAsset(id: string) {
  try {
    await requireRole(["ADMIN", "ASSET_MANAGER"]);
    await verifyAssetManagerDeptConstraint(id);
    
    await db.asset.delete({ where: { id } });
    revalidatePath("/dashboard/assets");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createCategory(data: any) {
  try {
    await requireRole(["ADMIN", "ASSET_MANAGER"]);
    await db.assetCategory.create({
      data: {
        name: data.name,
        description: data.description || null
      }
    });
    revalidatePath("/dashboard/organization");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteCategory(id: string) {
  try {
    await requireRole(["ADMIN", "ASSET_MANAGER"]);
    await db.assetCategory.delete({ where: { id } });
    revalidatePath("/dashboard/organization");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
