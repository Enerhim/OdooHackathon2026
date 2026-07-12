"use server";

import { db } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/auth-utils";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function getCategories(): Promise<ActionResult> {
  try {
    await requireSession();
    const categories = await db.assetCategory.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { assets: true },
        },
      },
    });
    return { success: true, data: categories };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCategoryById(id: string): Promise<ActionResult> {
  try {
    await requireSession();
    const category = await db.assetCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { assets: true },
        },
      },
    });
    if (!category) {
      return { success: false, error: "Category not found" };
    }
    return { success: true, data: category };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createCategory(data: {
  name: string;
  description?: string;
  customFieldSchema?: any;
}): Promise<ActionResult> {
  try {
    const session = await requireRole(["ADMIN"]);
    const category = await db.assetCategory.create({
      data: {
        name: data.name,
        description: data.description,
        customFieldSchema: data.customFieldSchema ?? null,
      },
    });

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: `Created asset category "${data.name}"`,
        entityType: "AssetCategory",
        entityId: category.id,
      },
    });

    return { success: true, data: category };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCategory(
  id: string,
  data: {
    name?: string;
    description?: string;
    customFieldSchema?: any;
  }
): Promise<ActionResult> {
  try {
    const session = await requireRole(["ADMIN"]);
    const existing = await db.assetCategory.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Category not found" };
    }

    const updated = await db.assetCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.customFieldSchema !== undefined && {
          customFieldSchema: data.customFieldSchema,
        }),
      },
    });

    const changes: string[] = [];
    if (data.name !== undefined) changes.push(`name to "${data.name}"`);
    if (data.description !== undefined) changes.push("description");
    if (data.customFieldSchema !== undefined) changes.push("schema");

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: `Updated category "${existing.name}": changed ${changes.join(", ")}`,
        entityType: "AssetCategory",
        entityId: id,
      },
    });

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
