"use server";

import { db } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth-utils";
import type { Role, AccountStatus } from "@prisma/client";

export async function getUsers(filters?: {
  role?: Role;
  status?: AccountStatus;
  departmentId?: string;
  search?: string;
}) {
  try {
    await requireRole(["ADMIN"]);

    const where: any = {};
    if (filters?.role) where.role = filters.role;
    if (filters?.status) where.status = filters.status;
    if (filters?.departmentId) where.departmentId = filters.departmentId;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const users = await db.user.findMany({
      where,
      include: {
        department: true,
      },
      orderBy: { name: "asc" },
    });

    return { success: true, data: users };
  } catch (error: any) {
    console.error("Error in getUsers:", error);
    return { success: false, error: error.message };
  }
}

export async function getUserById(id: string) {
  try {
    await requireSession();
    const user = await db.user.findUnique({
      where: { id },
      include: { department: true },
    });
    
    if (!user) throw new Error("User not found");
    return { success: true, data: user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserRole(userId: string, role: Role) {
  try {
    const session = await requireRole(["ADMIN"]);
    
    const user = await db.user.update({
      where: { id: userId },
      data: { role },
    });

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: `Updated user role to ${role}`,
        entityType: "User",
        entityId: userId,
      }
    });

    return { success: true, data: user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserStatus(userId: string, status: AccountStatus) {
  try {
    const session = await requireRole(["ADMIN"]);
    
    const user = await db.user.update({
      where: { id: userId },
      data: { status },
    });

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: `Updated user status to ${status}`,
        entityType: "User",
        entityId: userId,
      }
    });

    return { success: true, data: user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCurrentUser() {
  try {
    const session = await requireSession();
    
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { department: true },
    });

    if (!user) throw new Error("User not found");
    return { success: true, data: user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
