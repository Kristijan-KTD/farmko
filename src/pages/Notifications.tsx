import { useState } from "react";
import { Bell, MessageCircle, Package, CheckCheck } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const initialNotifications = [
  { id: 1, type: "message", title: "New message", description: "Jane Smith sent you a message", time: "2m ago", read: false, path: "/chat/1" },
  { id: 2, type: "product", title: "Product viewed", description: "Your Organic Eggs listing got 15 views today", time: "1h ago", read: false, path: "/product/1" },
  { id: 3, type: "update", title: "App Update", description: "New features available! Check out the latest update.", time: "3h ago", read: true, path: null },
  { id: 4, type: "message", title: "New message", description: "Bob Johnson wants to buy your tomatoes", time: "5h ago", read: true, path: "/chat/2" },
  { id: 5, type: "product", title: "Price alert", description: "Similar products in your area have updated prices", time: "1d ago", read: true, path: "/explore" },
];

const iconMap = {
  message: MessageCircle,
  product: Package,
  update: Bell,
};

const Notifications = () => {
  const [notifications, setNotifications] = useState(initialNotifications);
  const navigate = useNavigate();
  const { toast } = useToast();

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notif: typeof initialNotifications[0]) => {
    // Mark as read
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    // Navigate if there's a path
    if (notif.path) {
      navigate(notif.path);
    }
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast({ title: "All notifications marked as read" });
  };

  return (
    <MobileLayout>
      <PageHeader title="Notifications" rightAction={
        unreadCount > 0 ? (
          <button onClick={markAllRead} className="text-primary">
            <CheckCheck className="w-5 h-5" />
          </button>
        ) : undefined
      } />

      {unreadCount > 0 && (
        <p className="text-xs text-muted-foreground mb-3">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
      )}

      <div className="flex-1 pb-20 space-y-2">
        {notifications.map((notif) => {
          const Icon = iconMap[notif.type as keyof typeof iconMap] || Bell;
          return (
            <button
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`w-full flex items-start gap-3 p-3 rounded-xl transition-colors text-left ${
                notif.read ? "bg-background hover:bg-secondary" : "bg-primary/5 hover:bg-primary/10"
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                notif.read ? "bg-muted" : "bg-primary/10"
              }`}>
                <Icon className={`w-5 h-5 ${notif.read ? "text-muted-foreground" : "text-primary"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-medium ${notif.read ? "text-foreground" : "text-foreground font-semibold"}`}>
                    {notif.title}
                  </h3>
                  <span className="text-[10px] text-muted-foreground">{notif.time}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{notif.description}</p>
              </div>
              {!notif.read && <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

export default Notifications;
