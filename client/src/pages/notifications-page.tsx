import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { leet } from "@/lib/leet";
import { Bell, MessageSquare, Calendar, User as UserIcon } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["/api/notifications"],
  });

  const markRead = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/read"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  // Помечаем как прочитанные при входе на страницу
  useEffect(() => {
    if (notifications.some((n: any) => !n.isRead)) {
      markRead.mutate();
    }
  }, [notifications]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4 border-b border-primary/20 pb-4">
          <Bell className="w-8 h-8 text-primary animate-pulse" />
          <h1 className="text-3xl font-display font-bold tracking-tighter text-primary">
            {leet("USER_NOTIFICATIONS")}
          </h1>
        </div>

        {isLoading ? (
          <div className="text-primary animate-pulse font-mono text-sm">{leet("SCANNING_UPLINK...")}</div>
        ) : notifications.length === 0 ? (
          <div className="text-muted-foreground font-mono text-sm border border-dashed border-border p-8 text-center">
            {leet("NO_NEW_DATA_FOUND")}
          </div>
        ) : (
          <div className="grid gap-4">
            {notifications.map((notif: any) => (
              <Link key={notif.id} href={`/thread/${notif.threadId}`}>
                <Card className={`p-4 bg-black/40 border-primary/20 hover:border-primary/50 transition-all cursor-pointer group ${!notif.isRead ? 'border-l-4 border-l-primary' : ''}`}>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded group-hover:bg-primary/20 transition-colors">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-mono text-primary/80">
                        <span className="text-primary font-bold">{leet("SYSTEM_ALERT")}:</span>{" "}
                        {leet("YOU_WERE_MENTIONED_IN_THREAD")} #{notif.threadId}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground uppercase tracking-widest">
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3" /> UID:{notif.fromUserId}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {new Date(notif.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
