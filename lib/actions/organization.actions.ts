"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

export async function toggleUserStatus(userId: string, newStatus: string) {
  try {
    const session = await requireSession();
    const userRole = (session.user as any).role;
    
    if (userRole !== "ADMIN" && userRole !== "DEPARTMENT_HEAD") {
       throw new Error("Forbidden: Insufficient permissions.");
    }
    
    if (userRole === "DEPARTMENT_HEAD") {
      const myUser = await db.user.findUnique({ where: { id: session.user.id } });
      const targetUser = await db.user.findUnique({ where: { id: userId } });
      
      if (!myUser || !targetUser || myUser.departmentId !== targetUser.departmentId) {
         throw new Error("Forbidden: You can only modify employees in your own department.");
      }
    }
    
    await db.user.update({
      where: { id: userId },
      data: { status: newStatus as any }
    });
    
    revalidatePath("/dashboard/organization");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
