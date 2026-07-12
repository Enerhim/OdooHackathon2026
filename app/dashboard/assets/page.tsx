import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-utils";
import { AssetList } from "./components/AssetList";

export const metadata = {
  title: "Assets | AssetFlow",
};

export default async function AssetsPage() {
  const session = await requireSession();
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  const userRole = user?.role;
  const userDeptId = user?.departmentId;

  const categories = await db.assetCategory.findMany({ select: { id: true, name: true } });

  const assets = await db.asset.findMany({
    include: {
      category: { select: { name: true } },
      allocations: {
        where: { status: "ACTIVE" },
        include: { employee: true }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const serializedAssets = assets.map((a: any) => ({
    ...a,
    acquisitionDate: a.acquisitionDate.toISOString(),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    acquisitionCost: a.acquisitionCost ? a.acquisitionCost.toString() : null,
    activeAllocation: a.allocations[0] || null
  }));

  return (
    <div className="w-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Assets Directory</h2>
      </div>
      <AssetList initialAssets={serializedAssets} userRole={userRole} userDeptId={userDeptId} categories={categories} />
    </div>
  );
}
