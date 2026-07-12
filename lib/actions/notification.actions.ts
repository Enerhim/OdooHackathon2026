"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-utils";
import type { NotificationType } from "@prisma/client";

export async function getNotifications(unreadOnly: boolean = false) {
  try {
    const session = await requireSession();

    const where: any = { userId: session.user.id };
    if (unreadOnly) {
      where.isRead = false;
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return { success: true, data: notifications };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markAsRead(id: string) {
  try {
    const session = await requireSession();

    const notification = await db.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== session.user.id) {
      throw new Error("Notification not found or unauthorized");
    }

    const updated = await db.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markAllAsRead() {
  try {
    const session = await requireSession();

    const result = await db.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { success: true, data: result.count };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Server-only helper (no auth check needed, meant to be called internally)
export async function createNotification(data: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}) {
  try {
    const notification = await db.notification.create({
      data,
    });
    return { success: true, data: notification };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUnreadCount() {
  try {
    const session = await requireSession();

    const count = await db.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    });

    return { success: true, data: count };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
