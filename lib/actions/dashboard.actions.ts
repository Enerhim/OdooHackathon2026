"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-utils";

export async function getDashboardStats() {
  try {
    await requireSession();

    const [
      assetsAvailable,
      assetsAllocated,
      maintenanceToday,
      activeBookings,
      pendingTransfers,
      overdueReturns,
    ] = await Promise.all([
      db.asset.count({ where: { status: "AVAILABLE" } }),
      db.asset.count({ where: { status: "ALLOCATED" } }),
      
      // Maintenance requests created today
      db.maintenanceRequest.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      db.resourceBooking.count({
        where: {
          status: { in: ["ONGOING", "UPCOMING"] },
        },
      }),

      db.transferRequest.count({
        where: { status: "REQUESTED" },
      }),

      db.assetAllocation.count({
        where: {
          status: "ACTIVE",
          expectedReturnDate: { lt: new Date() },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        assetsAvailable,
        assetsAllocated,
        maintenanceToday,
        activeBookings,
        pendingTransfers,
        overdueReturns,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getOverdueReturns() {
  try {
    await requireSession();

    const overdueAllocations = await db.assetAllocation.findMany({
      where: {
        status: "ACTIVE",
        expectedReturnDate: { lt: new Date() },
      },
      include: {
        asset: { select: { name: true, assetTag: true } },
        employee: { select: { name: true, email: true } },
      },
      orderBy: { expectedReturnDate: "asc" },
    });

    return { success: true, data: overdueAllocations };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
