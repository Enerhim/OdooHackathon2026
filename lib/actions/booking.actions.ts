"use server";

import { db } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth-utils";
import type { Role } from "@prisma/client";
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
// createBooking
// ---------------------------------------------------------------------------

export async function createBooking(data: {
  assetId: string;
  startTime: Date;
  endTime: Date;
  departmentId?: string;
  purpose?: string;
}): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    // 1. Verify asset exists and is bookable
    const asset = await db.asset.findUnique({
      where: { id: data.assetId },
      select: { id: true, name: true, isBookable: true },
    });

    if (!asset) {
      return { success: false, error: "Asset not found." };
    }

    if (!asset.isBookable) {
      return {
        success: false,
        error: `Asset "${asset.name}" is not marked as bookable.`,
      };
    }

    // 2. Check for overlapping bookings
    //    Overlap condition: existing.startTime < new.endTime AND existing.endTime > new.startTime
    const overlappingBookings = await db.resourceBooking.findMany({
      where: {
        assetId: data.assetId,
        status: { not: "CANCELLED" },
        startTime: { lt: data.endTime },
        endTime: { gt: data.startTime },
      },
      include: {
        bookedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (overlappingBookings.length > 0) {
      const overlapDetails = overlappingBookings.map((b) => ({
        id: b.id,
        startTime: b.startTime,
        endTime: b.endTime,
        bookedBy: b.bookedBy.name,
        purpose: b.purpose,
      }));

      return {
        success: false,
        error: `Booking conflicts with ${overlappingBookings.length} existing booking(s).`,
        data: overlapDetails,
      };
    }

    // 3. Create the booking
    const booking = await db.resourceBooking.create({
      data: {
        assetId: data.assetId,
        bookedById: userId,
        departmentId: data.departmentId ?? null,
        startTime: data.startTime,
        endTime: data.endTime,
        purpose: data.purpose ?? null,
        status: "UPCOMING",
      },
      include: {
        asset: true,
        bookedBy: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    });

    // 4. Log activity
    await db.activityLog.create({
      data: {
        userId,
        action: "BOOKING_CREATED",
        entityType: "ResourceBooking",
        entityId: booking.id,
        metadata: {
          assetId: data.assetId,
          startTime: data.startTime.toISOString(),
          endTime: data.endTime.toISOString(),
          purpose: data.purpose ?? null,
        },
      },
    });

    await createNotification({
      userId,
      type: "BOOKING_CONFIRMED",
      title: "Booking Confirmed",
      message: `Your booking for resource ${booking.asset.name} from ${data.startTime.toLocaleString()} to ${data.endTime.toLocaleString()} is confirmed.`,
      relatedEntityType: "ResourceBooking",
      relatedEntityId: booking.id,
    });

    return { success: true, data: booking };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create booking";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// cancelBooking
// ---------------------------------------------------------------------------

export async function cancelBooking(id: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const userId = session.user.id;
    const userRole = (session.user as Record<string, unknown>).role as Role;

    const booking = await db.resourceBooking.findUnique({
      where: { id },
      include: {
        asset: { select: { id: true, name: true } },
      },
    });

    if (!booking) {
      return { success: false, error: "Booking not found." };
    }

    if (booking.status === "CANCELLED") {
      return { success: false, error: "Booking is already cancelled." };
    }

    // Only the booking owner, ASSET_MANAGER, or ADMIN can cancel
    const isOwner = booking.bookedById === userId;
    const isPrivileged =
      userRole === "ADMIN" || userRole === "ASSET_MANAGER";

    if (!isOwner && !isPrivileged) {
      return {
        success: false,
        error: "You do not have permission to cancel this booking.",
      };
    }

    const updatedBooking = await db.resourceBooking.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        asset: true,
        bookedBy: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    });

    await db.activityLog.create({
      data: {
        userId,
        action: "BOOKING_CANCELLED",
        entityType: "ResourceBooking",
        entityId: id,
        metadata: {
          assetId: booking.assetId,
          cancelledByOwner: isOwner,
        },
      },
    });

    await createNotification({
      userId,
      type: "BOOKING_CANCELLED",
      title: "Booking Cancelled",
      message: `Your booking for resource ${updatedBooking.asset.name} on ${updatedBooking.startTime.toLocaleString()} has been cancelled.`,
      relatedEntityType: "ResourceBooking",
      relatedEntityId: updatedBooking.id,
    });

    return { success: true, data: updatedBooking };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel booking";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// getBookingsForAsset
// ---------------------------------------------------------------------------

export async function getBookingsForAsset(
  assetId: string,
  dateRange?: { start: Date; end: Date },
): Promise<ActionResult> {
  try {
    await requireSession();

    const where: Record<string, unknown> = { assetId };

    if (dateRange) {
      where.startTime = { lte: dateRange.end };
      where.endTime = { gte: dateRange.start };
    }

    const bookings = await db.resourceBooking.findMany({
      where,
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        bookedBy: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "asc" },
    });

    return { success: true, data: bookings };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch bookings for asset";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// getMyBookings
// ---------------------------------------------------------------------------

export async function getMyBookings(): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const bookings = await db.resourceBooking.findMany({
      where: { bookedById: userId },
      include: {
        asset: { select: { id: true, name: true, assetTag: true, location: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "desc" },
    });

    return { success: true, data: bookings };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch your bookings";
    return { success: false, error: message };
  }
}
