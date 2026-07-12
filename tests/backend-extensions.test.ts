import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { db } from "../lib/db";
import { createCategory, getCategories } from "../lib/actions/category.actions";
import { getUpcomingReturns } from "../lib/actions/dashboard.actions";
import { checkOverdueAllocations } from "../lib/actions/notification.actions";
import * as authUtils from "../lib/auth-utils";

import { Role } from "@prisma/client";

// Mock auth-utils
vi.mock("../lib/auth-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/auth-utils")>();
  return {
    ...actual,
    requireSession: vi.fn(),
    requireRole: vi.fn(),
  };
});

describe("Backend Extensions", () => {
  const mockUserId = "test-admin-id";

  beforeAll(async () => {
    // Setup mock user
    await db.user.upsert({
      where: { email: "admin@test.com" },
      update: { id: mockUserId, role: Role.SUPERADMIN },
      create: { id: mockUserId, name: "Admin Test", email: "admin@test.com", role: Role.SUPERADMIN },
    });
  });

  afterAll(async () => {
    // Cleanup
    await db.assetCategory.deleteMany({ where: { name: "Test Category Extensions" } });
  });

  it("should create and retrieve a category", async () => {
    vi.mocked(authUtils.requireRole).mockResolvedValue({ user: { id: mockUserId, role: "SUPERADMIN" } } as any);
    vi.mocked(authUtils.requireSession).mockResolvedValue({ user: { id: mockUserId, role: "SUPERADMIN" } } as any);

    const createRes = await createCategory({ name: "Test Category Extensions", description: "Desc" });
    expect(createRes.success).toBe(true);

    const getRes = await getCategories();
    expect(getRes.success).toBe(true);
    expect((getRes.data as any[]).some(c => c.name === "Test Category Extensions")).toBe(true);
  });

  it("should check upcoming returns", async () => {
    vi.mocked(authUtils.requireSession).mockResolvedValue({ user: { id: mockUserId, role: "SUPERADMIN" } } as any);
    
    const res = await getUpcomingReturns();
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("should check overdue allocations and create notifications", async () => {
    const res = await checkOverdueAllocations();
    expect(res.success).toBe(true);
    expect(res.data).toHaveProperty("checked");
    expect(res.data).toHaveProperty("notificationsCreated");
  });
});
