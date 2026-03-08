import { useState, useEffect } from "react";
import { Bell, MessageCircle, Package, CheckCheck, Loader2 } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean | null;
  reference_id: string | null;
  created_at: string;
}

const iconMap: Record<string, typeof MessageCircle> = {
  message: MessageCircle,
  product: Package,
  update: Bell,
};

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setNotifications(data);
      setLoading(false);
    };
    fetchNotifications();

    // Realtime
    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const handleClick = async (notif: Notification) => {
    if (!notif.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }
    if (notif.type === "message" && notif.reference_id) navigate(`/chat/${notif.reference_id}`);
    else if (notif.type === "product" && notif.reference_id) navigate(`/product/${notif.reference_id}`);
  };

  const markAllRead = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", user?.id).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast({ title: "All notifications marked as read" });
  };

  return (
    <MobileLayout>
      <PageHeader title="Notifications" rightAction={
        unreadCount > 0 ? (
          <button onClick={markAllRead} className="text-primary"><CheckCheck className="w-5 h-5" /></button>
        ) : undefined
      } />

      {unreadCount > 0 && (
        <p className="text-xs text-muted-foreground mb-3">{unreadCount} unread</p>
      )}

      <div className="flex-1 pb-20 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Bell className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const Icon = iconMap[notif.type] || Bell;
            return (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl transition-colors text-left ${
                  notif.read ? "bg-background hover:bg-secondary" : "bg-primary/5 hover:bg-primary/10"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notif.read ? "bg-muted" : "bg-primary/10"}`}>
                  <Icon className={`w-5 h-5 ${notif.read ? "text-muted-foreground" : "text-primary"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm ${notif.read ? "font-medium text-foreground" : "font-semibold text-foreground"}`}>{notif.title}</h3>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(notif.created_at)}</span>
                  </div>
                  {notif.body && <p className="text-xs text-muted-foreground mt-0.5">{notif.body}</p>}
                </div>
                {!notif.read && <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />}
              </button>
            );
          })
        )}
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

export default Notifications;
