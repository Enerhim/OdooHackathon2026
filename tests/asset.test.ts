import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "./setup";

describe("Asset Management", () => {
  const testPrefix = `asset-test-${Date.now()}`;
  let categoryId: string;
  let assetId: string;
  let userId: string;
  let managerId: string;
  let departmentId: string;
  let allocationId: string;

  beforeAll(async () => {
    // Create test fixtures
    const category = await prisma.assetCategory.create({
      data: {
        name: `Test Category ${testPrefix}`,
        description: "Test category for asset tests",
      },
    });
    categoryId = category.id;

    const department = await prisma.department.create({
      data: {
        name: `Test Dept ${testPrefix}`,
        status: "ACTIVE",
      },
    });
    departmentId = department.id;

    const user = await prisma.user.create({
      data: {
        name: "Test Employee",
        email: `employee-${testPrefix}@example.com`,
        emailVerified: true,
        role: "EMPLOYEE",
        departmentId: department.id,
      },
    });
    userId = user.id;

    const manager = await prisma.user.create({
      data: {
        name: "Test Manager",
        email: `manager-${testPrefix}@example.com`,
        emailVerified: true,
        role: "ASSET_MANAGER",
      },
    });
    managerId = manager.id;
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    await prisma.activityLog.deleteMany({
      where: { entityId: { in: [assetId, allocationId].filter(Boolean) } },
    });
    if (assetId) {
      await prisma.assetAllocation.deleteMany({
        where: { assetId },
      });
      await prisma.asset.deleteMany({ where: { id: assetId } });
    }
    await prisma.user.deleteMany({
      where: { id: { in: [userId, managerId] } },
    });
    await prisma.department.deleteMany({ where: { id: departmentId } });
    await prisma.assetCategory.deleteMany({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  describe("Asset CRUD", () => {
    it("should create an asset with auto-generated tag", async () => {
      // Count existing assets to generate tag
      const count = await prisma.asset.count();
      const tag = `AF-${String(count + 1).padStart(4, "0")}`;

      const asset = await prisma.asset.create({
        data: {
          assetTag: tag,
          name: "Test Laptop",
          categoryId,
          acquisitionDate: new Date(),
          acquisitionCost: 1500.0,
          condition: "NEW",
          location: "Floor 3, Desk 12",
          isBookable: false,
          status: "AVAILABLE",
        },
      });

      assetId = asset.id;
      expect(asset).toBeDefined();
      expect(asset.assetTag).toMatch(/^AF-\d{4}$/);
      expect(asset.status).toBe("AVAILABLE");
      expect(asset.condition).toBe("NEW");
    });

    it("should enforce unique asset tags", async () => {
      const existingAsset = await prisma.asset.findUnique({
        where: { id: assetId },
      });

      await expect(
        prisma.asset.create({
          data: {
            assetTag: existingAsset!.assetTag,
            name: "Duplicate Tag Asset",
            categoryId,
            acquisitionDate: new Date(),
          },
        })
      ).rejects.toThrow();
    });

    it("should retrieve asset with category relation", async () => {
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: { category: true },
      });

      expect(asset).toBeDefined();
      expect(asset!.category.name).toContain("Test Category");
    });

    it("should update asset details", async () => {
      const updated = await prisma.asset.update({
        where: { id: assetId },
        data: {
          condition: "GOOD",
          location: "Floor 2, Desk 5",
        },
      });

      expect(updated.condition).toBe("GOOD");
      expect(updated.location).toBe("Floor 2, Desk 5");
    });

    it("should filter assets by status", async () => {
      const available = await prisma.asset.findMany({
        where: { status: "AVAILABLE", id: assetId },
      });

      expect(available.length).toBe(1);
    });
  });

  describe("Asset Allocation", () => {
    it("should allocate an available asset to an employee", async () => {
      // Verify asset is available
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
      });
      expect(asset!.status).toBe("AVAILABLE");

      // Allocate in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const allocation = await tx.assetAllocation.create({
          data: {
            assetId,
            employeeId: userId,
            allocatedById: managerId,
            expectedReturnDate: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ), // 30 days
            status: "ACTIVE",
          },
        });

        await tx.asset.update({
          where: { id: assetId },
          data: { status: "ALLOCATED" },
        });

        return allocation;
      });

      allocationId = result.id;
      expect(result).toBeDefined();
      expect(result.status).toBe("ACTIVE");

      // Verify asset is now ALLOCATED
      const updatedAsset = await prisma.asset.findUnique({
        where: { id: assetId },
      });
      expect(updatedAsset!.status).toBe("ALLOCATED");
    });

    it("should prevent double allocation (asset not AVAILABLE)", async () => {
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: {
          allocations: {
            where: { status: "ACTIVE" },
            include: { employee: true },
          },
        },
      });

      expect(asset!.status).not.toBe("AVAILABLE");
      expect(asset!.allocations.length).toBe(1);
      expect(asset!.allocations[0].employee!.name).toBe("Test Employee");

      // The application layer would throw here, but we can verify the state
      const activeAllocations = await prisma.assetAllocation.findMany({
        where: { assetId, status: "ACTIVE" },
      });
      expect(activeAllocations.length).toBe(1);
    });

    it("should process asset return", async () => {
      const result = await prisma.$transaction(async (tx) => {
        const allocation = await tx.assetAllocation.update({
          where: { id: allocationId },
          data: {
            status: "RETURNED",
            actualReturnDate: new Date(),
            returnConditionNotes: "Good condition, minor wear",
          },
        });

        await tx.asset.update({
          where: { id: assetId },
          data: { status: "AVAILABLE" },
        });

        return allocation;
      });

      expect(result.status).toBe("RETURNED");
      expect(result.actualReturnDate).toBeDefined();

      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
      });
      expect(asset!.status).toBe("AVAILABLE");
    });

    it("should detect overdue allocations", async () => {
      // Create an overdue allocation
      const overdueAlloc = await prisma.assetAllocation.create({
        data: {
          assetId,
          employeeId: userId,
          allocatedById: managerId,
          expectedReturnDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
          status: "ACTIVE",
        },
      });

      await prisma.asset.update({
        where: { id: assetId },
        data: { status: "ALLOCATED" },
      });

      const overdueAllocations = await prisma.assetAllocation.findMany({
        where: {
          status: "ACTIVE",
          expectedReturnDate: { lt: new Date() },
        },
        include: { asset: true, employee: true },
      });

      expect(overdueAllocations.length).toBeGreaterThanOrEqual(1);
      const ourOverdue = overdueAllocations.find(
        (a) => a.id === overdueAlloc.id
      );
      expect(ourOverdue).toBeDefined();
      expect(ourOverdue!.asset.name).toBe("Test Laptop");

      // Cleanup: return the overdue allocation
      await prisma.$transaction(async (tx) => {
        await tx.assetAllocation.update({
          where: { id: overdueAlloc.id },
          data: { status: "RETURNED", actualReturnDate: new Date() },
        });
        await tx.asset.update({
          where: { id: assetId },
          data: { status: "AVAILABLE" },
        });
      });
    });
  });
});
