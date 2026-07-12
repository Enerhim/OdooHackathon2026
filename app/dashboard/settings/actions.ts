"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-utils";

export async function updateEmail(newEmail: string) {
  try {
    const session = await requireSession();
    
    // Check if email is already taken by another user
    const existing = await db.user.findUnique({ where: { email: newEmail } });
    if (existing && existing.id !== session.user.id) {
      return { success: false, error: "Email is already taken by another account." };
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { email: newEmail }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
