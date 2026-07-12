import { getNotifications, markAllAsRead } from "@/lib/actions/notification.actions";
import { GlassCard } from "@/app/components/ui/GlassCard";
import { Bell, CheckCircle } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { revalidatePath } from "next/cache";

export default async function NotificationsPage() {
  const { success, data } = await getNotifications();
  const notifications = (success && data) ? data : [];

  const handleMarkAllAsRead = async () => {
    "use server";
    await markAllAsRead();
    revalidatePath("/dashboard/notifications");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
        <form action={handleMarkAllAsRead}>
          <Button type="submit" variant="outline">
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        </form>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-foreground/50 flex flex-col items-center">
            <Bell className="h-12 w-12 mb-4 opacity-50" />
            <p>You have no notifications at this time.</p>
          </div>
        ) : (
          <div className="divide-y divide-card-border">
            {notifications.map((notif: any) => (
              <div key={notif.id} className={`p-6 flex items-start space-x-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${notif.isRead ? 'opacity-70' : 'bg-primary/5'}`}>
                <div className={`p-2 rounded-full ${notif.isRead ? 'bg-black/10 dark:bg-white/10' : 'bg-primary/20 text-primary'}`}>
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1 cursor-pointer">
                  <div className="flex justify-between items-start">
                    <p className={`text-base ${notif.isRead ? 'font-medium' : 'font-bold'}`}>{notif.title}</p>
                    <span className="text-xs text-foreground/50">{new Date(notif.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-foreground/70">{notif.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
