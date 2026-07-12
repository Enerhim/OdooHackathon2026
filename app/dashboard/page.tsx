import { getDashboardStats, getOverdueReturns, getUpcomingReturns } from "@/lib/actions/dashboard.actions";
import { GlassCard } from "@/app/components/ui/GlassCard";
import { Package, Wrench, Calendar, FileText, AlertTriangle, ArrowDownToLine, Plus } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { DashboardCharts } from "./components/DashboardCharts";

export default async function DashboardPage() {
  const [statsRes, overdueRes, upcomingRes] = await Promise.all([
    getDashboardStats(),
    getOverdueReturns(),
    getUpcomingReturns()
  ]);

  const stats = statsRes.success ? statsRes.data : null;
  const overdueReturns = (overdueRes.success && overdueRes.data) ? overdueRes.data : [];
  const upcomingReturns = (upcomingRes.success && upcomingRes.data) ? upcomingRes.data : [];

  if (!stats) return <div className="p-8 text-center text-destructive">Failed to load dashboard data</div>;

  const KPICard = ({ title, value, icon: Icon, trend, alert }: any) => (
    <GlassCard className="flex flex-col space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground/60">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className={`p-2 rounded-xl ${alert ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && <p className="text-xs text-foreground/50">{trend}</p>}
    </GlassCard>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
          <p className="text-foreground/60">Here is what's happening with your assets today.</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline"><Calendar className="mr-2 h-4 w-4" /> Book Resource</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Assets Available" value={stats.assetsAvailable} icon={Package} />
        <KPICard title="Assets Allocated" value={stats.assetsAllocated} icon={ArrowDownToLine} />
        <KPICard title="Maintenance Today" value={stats.maintenanceToday} icon={Wrench} alert={stats.maintenanceToday > 0} />
        <KPICard title="Active Bookings" value={stats.activeBookings} icon={Calendar} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-lg">Action Needed: Overdue Returns</h3>
              <span className="bg-destructive/10 text-destructive text-xs font-semibold px-3 py-1 rounded-full">
                {stats.overdueReturns} Overdue
              </span>
            </div>
            
            <div className="flex-1 overflow-auto pr-2 space-y-3">
              {overdueReturns.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-foreground/40 space-y-2">
                  <Package className="h-10 w-10 opacity-50" />
                  <p>No overdue returns! Great job.</p>
                </div>
              ) : (
                overdueReturns.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-white/30 dark:bg-black/30 border border-card-border hover:bg-white/50 dark:hover:bg-black/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{item.asset.name} <span className="text-foreground/50 text-sm">({item.asset.assetTag})</span></p>
                        <p className="text-sm text-foreground/60">Held by {item.employee.name}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="text-xs h-8">Remind</Button>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <DashboardCharts stats={stats} />
          
          <GlassCard>
            <h3 className="font-semibold text-lg mb-4">Upcoming Returns</h3>
            <div className="space-y-3">
              {upcomingReturns.length === 0 ? (
                <p className="text-sm text-foreground/50 text-center py-4">No upcoming returns scheduled.</p>
              ) : (
                upcomingReturns.slice(0, 3).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-white/20 dark:bg-black/20 border border-card-border">
                    <div>
                      <p className="text-sm font-medium">{item.asset.name}</p>
                      <p className="text-xs text-foreground/60">{new Date(item.expectedReturnDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
