import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "./setup";

describe("Resource Booking", () => {
  const testPrefix = `booking-test-${Date.now()}`;
  let categoryId: string;
  let assetId: string;
  let userId: string;
  let bookingId: string;

  beforeAll(async () => {
    // Setup test data
    const category = await prisma.assetCategory.create({
      data: { name: `Rooms ${testPrefix}` },
    });
    categoryId = category.id;

    const asset = await prisma.asset.create({
      data: {
        assetTag: `RM-${Date.now()}`,
        name: "Conference Room A",
        categoryId,
        acquisitionDate: new Date(),
        isBookable: true,
        status: "AVAILABLE",
      },
    });
    assetId = asset.id;

    const user = await prisma.user.create({
      data: {
        name: "Test Booker",
        email: `booker-${testPrefix}@example.com`,
        role: "EMPLOYEE",
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.activityLog.deleteMany({
      where: { entityType: "ResourceBooking" },
    });
    await prisma.resourceBooking.deleteMany({
      where: { assetId },
    });
    await prisma.asset.delete({ where: { id: assetId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.assetCategory.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it("should create a booking for a bookable asset", async () => {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1); // 1 hour from now
    
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 2); // 3 hours from now

    const booking = await prisma.resourceBooking.create({
      data: {
        assetId,
        bookedById: userId,
        startTime,
        endTime,
        purpose: "Team Sync",
        status: "UPCOMING",
      },
    });

    bookingId = booking.id;
    expect(booking).toBeDefined();
    expect(booking.purpose).toBe("Team Sync");
    expect(booking.status).toBe("UPCOMING");
  });

  it("should detect overlapping bookings", async () => {
    const newStart = new Date();
    newStart.setHours(newStart.getHours() + 2); // Overlaps with the existing 1h->3h booking
    
    const newEnd = new Date(newStart);
    newEnd.setHours(newEnd.getHours() + 1);

    const overlappingBookings = await prisma.resourceBooking.findMany({
      where: {
        assetId,
        status: { not: "CANCELLED" },
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
    });

    expect(overlappingBookings.length).toBeGreaterThan(0);
    expect(overlappingBookings[0].id).toBe(bookingId);
  });

  it("should not detect overlap for consecutive bookings", async () => {
    const existingBooking = await prisma.resourceBooking.findUnique({
      where: { id: bookingId },
    });

    const newStart = existingBooking!.endTime;
    const newEnd = new Date(newStart.getTime() + 3600000); // 1 hour later

    const overlappingBookings = await prisma.resourceBooking.findMany({
      where: {
        assetId,
        status: { not: "CANCELLED" },
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
    });

    expect(overlappingBookings.length).toBe(0);
  });

  it("should be able to cancel a booking", async () => {
    const updated = await prisma.resourceBooking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });

    expect(updated.status).toBe("CANCELLED");
  });
});
