import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-utils";
import { OrganizationTabs } from "./components/OrganizationTabs";

export const metadata = {
  title: "Organization Setup | AssetFlow",
};

export default async function OrganizationPage() {
  const session = await requireSession();
  const userRole = (session.user as any).role;
  const userId = session.user.id;

  const departments = await db.department.findMany({
    include: {
      departmentHead: { select: { name: true } },
      parentDepartment: { select: { name: true } },
    }
  });

  const categories = await db.assetCategory.findMany({
    include: {
      _count: { select: { assets: true } }
    }
  });

  const employees = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      department: { select: { name: true } }
    }
  });

  return (
    <div className="w-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Organization Setup</h2>
      </div>
      <OrganizationTabs 
        initialDepartments={departments}
        initialCategories={categories}
        initialEmployees={employees}
        userRole={userRole}
        currentUserId={userId}
      />
    </div>
  );
}
