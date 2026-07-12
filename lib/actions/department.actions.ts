"use server";

import { db } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth-utils";
import type { AccountStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

type CreateDepartmentData = {
  name: string;
  parentDepartmentId?: string;
  departmentHeadId?: string;
};

type UpdateDepartmentData = {
  name?: string;
  parentDepartmentId?: string;
  departmentHeadId?: string;
  status?: AccountStatus;
};

// ---------------------------------------------------------------------------
// getDepartments — Authenticated. List all departments with head & count.
// ---------------------------------------------------------------------------

export async function getDepartments(): Promise<ActionResult> {
  try {
    await requireSession();

    const departments = await db.department.findMany({
      include: {
        departmentHead: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return { success: true, data: departments };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch departments";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// getDepartmentById — Authenticated. Get department with employees and head.
// ---------------------------------------------------------------------------

export async function getDepartmentById(
  id: string
): Promise<ActionResult> {
  try {
    await requireSession();

    const department = await db.department.findUnique({
      where: { id },
      include: {
        departmentHead: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        employees: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            status: true,
          },
        },
        parentDepartment: {
          select: {
            id: true,
            name: true,
          },
        },
        childDepartments: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!department) {
      return { success: false, error: "Department not found" };
    }

    return { success: true, data: department };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch department";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// createDepartment — Admin only. Create department and log activity.
// ---------------------------------------------------------------------------

export async function createDepartment(
  data: CreateDepartmentData
): Promise<ActionResult> {
  try {
    const session = await requireRole(["ADMIN"]);

    // Validate parent department exists if provided
    if (data.parentDepartmentId) {
      const parent = await db.department.findUnique({
        where: { id: data.parentDepartmentId },
      });
      if (!parent) {
        return { success: false, error: "Parent department not found" };
      }
    }

    // Validate department head exists if provided
    if (data.departmentHeadId) {
      const head = await db.user.findUnique({
        where: { id: data.departmentHeadId },
      });
      if (!head) {
        return { success: false, error: "Department head user not found" };
      }
    }

    const department = await db.department.create({
      data: {
        name: data.name,
        parentDepartmentId: data.parentDepartmentId ?? null,
        departmentHeadId: data.departmentHeadId ?? null,
      },
      include: {
        departmentHead: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: { employees: true },
        },
      },
    });

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: `Created department "${data.name}"`,
        entityType: "Department",
        entityId: department.id,
      },
    });

    return { success: true, data: department };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create department";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// updateDepartment — Admin only. Update department and log activity.
// ---------------------------------------------------------------------------

export async function updateDepartment(
  id: string,
  data: UpdateDepartmentData
): Promise<ActionResult> {
  try {
    const session = await requireRole(["ADMIN"]);

    const existing = await db.department.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Department not found" };
    }

    // Validate parent department if being changed
    if (data.parentDepartmentId) {
      if (data.parentDepartmentId === id) {
        return {
          success: false,
          error: "A department cannot be its own parent",
        };
      }
      const parent = await db.department.findUnique({
        where: { id: data.parentDepartmentId },
      });
      if (!parent) {
        return { success: false, error: "Parent department not found" };
      }
    }

    // Validate department head if being changed
    if (data.departmentHeadId) {
      const head = await db.user.findUnique({
        where: { id: data.departmentHeadId },
      });
      if (!head) {
        return { success: false, error: "Department head user not found" };
      }
    }

    const updated = await db.department.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.parentDepartmentId !== undefined && {
          parentDepartmentId: data.parentDepartmentId,
        }),
        ...(data.departmentHeadId !== undefined && {
          departmentHeadId: data.departmentHeadId,
        }),
        ...(data.status !== undefined && { status: data.status }),
      },
      include: {
        departmentHead: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: { employees: true },
        },
      },
    });

    // Build a human-readable description of the changes
    const changes: string[] = [];
    if (data.name !== undefined) changes.push(`name to "${data.name}"`);
    if (data.parentDepartmentId !== undefined)
      changes.push("parent department");
    if (data.departmentHeadId !== undefined) changes.push("department head");
    if (data.status !== undefined) changes.push(`status to ${data.status}`);

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: `Updated department "${existing.name}": changed ${changes.join(", ")}`,
        entityType: "Department",
        entityId: id,
      },
    });

    return { success: true, data: updated };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update department";
    return { success: false, error: message };
  }
}
