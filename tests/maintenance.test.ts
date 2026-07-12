import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "./setup";

describe("Maintenance Workflow", () => {
  const testPrefix = `maint-test-${Date.now()}`;
  let categoryId: string;
  let assetId: string;
  let userId: string;
  let managerId: string;
  let requestId: string;

  beforeAll(async () => {
    const category = await prisma.assetCategory.create({
      data: { name: `Eqp ${testPrefix}` },
    });
    categoryId = category.id;

    const asset = await prisma.asset.create({
      data: {
        assetTag: `EQP-${Date.now()}`,
        name: "Office Printer",
        categoryId,
        acquisitionDate: new Date(),
        status: "AVAILABLE",
      },
    });
    assetId = asset.id;

    const user = await prisma.user.create({
      data: {
        name: "Test User",
        email: `user-${testPrefix}@example.com`,
        role: "EMPLOYEE",
      },
    });
    userId = user.id;

    const manager = await prisma.user.create({
      data: {
        name: "Test Manager",
        email: `mgr-${testPrefix}@example.com`,
        role: "ASSET_MANAGER",
      },
    });
    managerId = manager.id;
  });

  afterAll(async () => {
    await prisma.maintenanceRequest.deleteMany({ where: { assetId } });
    await prisma.asset.delete({ where: { id: assetId } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, managerId] } } });
    await prisma.assetCategory.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it("should create a maintenance request in PENDING state", async () => {
    const request = await prisma.maintenanceRequest.create({
      data: {
        assetId,
        raisedById: userId,
        issueDescription: "Paper jam issue",
        priority: "HIGH",
        status: "PENDING",
      },
    });

    requestId = request.id;
    expect(request.status).toBe("PENDING");
    expect(request.priority).toBe("HIGH");

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    expect(asset!.status).toBe("AVAILABLE"); // Status doesn't change until approved
  });

  it("should transition asset to UNDER_MAINTENANCE when request is APPROVED", async () => {
    await prisma.$transaction(async (tx) => {
      await tx.maintenanceRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          approvedById: managerId,
        },
      });

      await tx.asset.update({
        where: { id: assetId },
        data: { status: "UNDER_MAINTENANCE" },
      });
    });

    const request = await prisma.maintenanceRequest.findUnique({ where: { id: requestId } });
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });

    expect(request!.status).toBe("APPROVED");
    expect(asset!.status).toBe("UNDER_MAINTENANCE");
  });

  it("should assign technician", async () => {
    const updated = await prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status: "TECHNICIAN_ASSIGNED",
        technicianName: "Bob Fixer",
      },
    });

    expect(updated.status).toBe("TECHNICIAN_ASSIGNED");
    expect(updated.technicianName).toBe("Bob Fixer");
  });

  it("should transition asset back to AVAILABLE when request is RESOLVED", async () => {
    await prisma.$transaction(async (tx) => {
      await tx.maintenanceRequest.update({
        where: { id: requestId },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
        },
      });

      await tx.asset.update({
        where: { id: assetId },
        data: { status: "AVAILABLE" },
      });
    });

    const request = await prisma.maintenanceRequest.findUnique({ where: { id: requestId } });
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });

    expect(request!.status).toBe("RESOLVED");
    expect(request!.resolvedAt).toBeDefined();
    expect(asset!.status).toBe("AVAILABLE");
  });
});
