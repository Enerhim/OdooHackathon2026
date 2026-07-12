import { ReactNode } from "react";
import { GlassCard } from "@/app/components/ui/GlassCard";
import Link from "next/link";
import { LayoutDashboard, Building, Package, ArrowRightLeft } from "lucide-react";
import { requireSession } from "@/lib/auth-utils";
import { ProfileDropdown } from "./components/ProfileDropdown";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full relative">
      <GlassCard className="flex items-center justify-between py-4 px-6 rounded-3xl relative z-40">
        <div className="flex items-center space-x-6">
          <h1 className="text-2xl font-bold tracking-tight text-primary">AssetFlow</h1>
          <nav className="hidden md:flex items-center space-x-4">
            <Link href="/dashboard" className="flex items-center space-x-2 text-sm font-medium bg-primary/10 text-primary px-3 py-2 rounded-xl transition-colors hover:bg-primary/20">
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <Link href="/dashboard/organization" className="flex items-center space-x-2 text-sm font-medium bg-primary/10 text-primary px-3 py-2 rounded-xl transition-colors hover:bg-primary/20">
              <Building className="h-4 w-4" />
              <span>Organization</span>
            </Link>
            <Link href="/dashboard/assets" className="flex items-center space-x-2 text-sm font-medium bg-primary/10 text-primary px-3 py-2 rounded-xl transition-colors hover:bg-primary/20">
              <Package className="h-4 w-4" />
              <span>Assets</span>
            </Link>
            <Link href="/dashboard/allocation" className="flex items-center space-x-2 text-sm font-medium bg-primary/10 text-primary px-3 py-2 rounded-xl transition-colors hover:bg-primary/20">
              <ArrowRightLeft className="h-4 w-4" />
              <span>Allocation</span>
            </Link>
          </nav>
        </div>
        <div className="flex items-center space-x-4 relative">
          <div className="hidden md:block text-right">
            <p className="text-sm font-semibold">{session.user.name}</p>
            <p className="text-xs text-foreground/50 capitalize">{((session.user as any).role || 'Employee').toLowerCase()}</p>
          </div>
          <ProfileDropdown />
        </div>
      </GlassCard>
      
      <main className="flex-1 relative z-10">
        {children}
      </main>
    </div>
  );
}
