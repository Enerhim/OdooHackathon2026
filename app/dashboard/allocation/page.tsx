import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-utils";
import { AllocationDashboard } from "./components/AllocationDashboard";

export const metadata = {
  title: "Allocation | AssetFlow"
};

export default async function AllocationPage() {
  const session = await requireSession();
  const currentUser = await db.user.findUnique({ where: { id: session.user.id } });
  
  // Fetch assets with their full allocation history
  const allAssets = await db.asset.findMany({
     include: {
        category: { select: { name: true } },
        allocations: {
           include: { 
             employee: { select: { id: true, name: true, departmentId: true, department: { select: { name: true } } } }, 
             allocatedBy: { select: { id: true, name: true } } 
           },
           orderBy: { createdAt: 'desc' }
        },
        transferRequests: {
           where: { status: "REQUESTED" },
           include: { requestedBy: { select: { name: true } }, toEmployee: { select: { name: true } } }
        }
     },
     orderBy: { name: 'asc' }
  });
  
  // Fetch active users for assignment
  const allUsers = await db.user.findMany({
     where: { status: "ACTIVE" },
     select: { id: true, name: true, email: true, department: { select: { name: true } } }
  });
  
  // Fetch pending requests if manager
  let pendingRequests: any[] = [];
  if (currentUser?.role === "ADMIN" || currentUser?.role === "ASSET_MANAGER") {
     pendingRequests = await db.transferRequest.findMany({
        where: { 
           status: "REQUESTED",
           ...(currentUser.role === "ASSET_MANAGER" ? { fromAllocation: { employee: { departmentId: currentUser.departmentId } } } : {})
        },
        include: {
           asset: { select: { name: true, assetTag: true } },
           requestedBy: { select: { name: true } },
           toEmployee: { select: { name: true } },
           fromAllocation: { include: { employee: { select: { name: true, departmentId: true } } } }
        },
        orderBy: { requestedAt: 'desc' }
     });
  }

  // Need to serialize dates
  const serializedAssets = allAssets.map(a => ({
     ...a,
     acquisitionDate: a.acquisitionDate.toISOString(),
     createdAt: a.createdAt.toISOString(),
     updatedAt: a.updatedAt.toISOString(),
     acquisitionCost: a.acquisitionCost ? a.acquisitionCost.toString() : null,
     allocations: a.allocations.map(al => ({
        ...al,
        allocatedAt: al.allocatedAt.toISOString(),
        expectedReturnDate: al.expectedReturnDate?.toISOString() || null,
        actualReturnDate: al.actualReturnDate?.toISOString() || null,
        createdAt: al.createdAt.toISOString(),
        updatedAt: al.updatedAt.toISOString(),
     })),
     transferRequests: a.transferRequests.map(tr => ({
        ...tr,
        requestedAt: tr.requestedAt.toISOString()
     }))
  }));

  const serializedRequests = pendingRequests.map(req => ({
     ...req,
     requestedAt: req.requestedAt.toISOString()
  }));

  return (
    <div className="w-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Asset Allocation</h2>
      </div>
      <AllocationDashboard 
        assets={serializedAssets} 
        users={allUsers} 
        currentUser={currentUser} 
        pendingRequests={serializedRequests} 
      />
    </div>
  );
}
