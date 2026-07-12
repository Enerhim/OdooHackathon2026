"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

export async function requestTransfer(assetId: string, toEmployeeId: string, notes?: string) {
  try {
    const session = await requireSession();
    const userId = session.user.id;
    
    const currentAllocation = await db.assetAllocation.findFirst({
      where: { assetId, employeeId: userId, status: "ACTIVE" }
    });
    
    if (!currentAllocation) {
      throw new Error("You can only request transfer for assets currently allocated to you.");
    }
    
    await db.transferRequest.create({
      data: {
        assetId,
        fromAllocationId: currentAllocation.id,
        requestedById: userId,
        toEmployeeId,
        notes
      }
    });
    
    revalidatePath("/dashboard/allocation");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function acceptTransfer(requestId: string) {
  try {
    const session = await requireSession();
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user || (user.role !== "ADMIN" && user.role !== "ASSET_MANAGER")) {
       throw new Error("Forbidden: Only Asset Managers can approve transfers.");
    }
    
    const request = await db.transferRequest.findUnique({
      where: { id: requestId },
      include: { asset: true, fromAllocation: { include: { employee: true } }, toEmployee: true }
    });
    
    if (!request) throw new Error("Request not found");
    
    if (user.role === "ASSET_MANAGER") {
       if (request.fromAllocation && request.fromAllocation.employee?.departmentId !== user.departmentId) {
          throw new Error("Forbidden: This asset belongs to another department.");
       }
    }
    
    await db.$transaction(async (tx) => {
       if (request.fromAllocationId) {
         await tx.assetAllocation.update({
           where: { id: request.fromAllocationId },
           data: { status: "TRANSFERRED", actualReturnDate: new Date() }
         });
       }
       
       await tx.transferRequest.update({
         where: { id: requestId },
         data: { status: "APPROVED", approvedById: user.id, approvedAt: new Date(), completedAt: new Date() }
       });
       
       await tx.assetAllocation.create({
         data: {
           assetId: request.assetId,
           employeeId: request.toEmployeeId,
           departmentId: request.toEmployee?.departmentId,
           allocatedById: user.id
         }
       });
       
       await tx.asset.update({
         where: { id: request.assetId },
         data: { status: "ALLOCATED" }
       });
    });
    
    revalidatePath("/dashboard/allocation");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function denyTransfer(requestId: string) {
  try {
    const session = await requireSession();
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user || (user.role !== "ADMIN" && user.role !== "ASSET_MANAGER")) {
       throw new Error("Forbidden: Only Asset Managers can deny transfers.");
    }
    
    const request = await db.transferRequest.findUnique({
      where: { id: requestId },
      include: { fromAllocation: { include: { employee: true } } }
    });
    
    if (!request) throw new Error("Request not found");
    
    if (user.role === "ASSET_MANAGER") {
       if (request.fromAllocation && request.fromAllocation.employee?.departmentId !== user.departmentId) {
          throw new Error("Forbidden: This asset belongs to another department.");
       }
    }
    
    await db.transferRequest.update({
       where: { id: requestId },
       data: { status: "REJECTED", approvedById: user.id, approvedAt: new Date() }
    });
    
    revalidatePath("/dashboard/allocation");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function allocateAsset(assetId: string, toEmployeeId: string) {
   try {
    const session = await requireSession();
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user || (user.role !== "ADMIN" && user.role !== "ASSET_MANAGER")) {
       throw new Error("Forbidden: Only Asset Managers can allocate assets.");
    }
    
    const asset = await db.asset.findUnique({
       where: { id: assetId },
       include: { allocations: { where: { status: "ACTIVE" }, include: { employee: true } } }
    });
    
    if (!asset) throw new Error("Asset not found");
    
    const currentAllocation = asset.allocations[0];
    if (user.role === "ASSET_MANAGER") {
       if (currentAllocation && currentAllocation.employee?.departmentId !== user.departmentId) {
          throw new Error("Forbidden: You can only reallocate assets currently in your department.");
       }
    }
    
    const targetUser = await db.user.findUnique({ where: { id: toEmployeeId } });
    
    await db.$transaction(async (tx) => {
       if (currentAllocation) {
          await tx.assetAllocation.update({
             where: { id: currentAllocation.id },
             data: { status: "TRANSFERRED", actualReturnDate: new Date() }
          });
       }
       await tx.assetAllocation.create({
          data: {
             assetId,
             employeeId: toEmployeeId,
             departmentId: targetUser?.departmentId,
             allocatedById: user.id
          }
       });
       await tx.asset.update({
          where: { id: assetId },
          data: { status: "ALLOCATED" }
       });
    });
    
    revalidatePath("/dashboard/allocation");
    return { success: true };
   } catch (e: any) {
      return { success: false, error: e.message };
   }
}
