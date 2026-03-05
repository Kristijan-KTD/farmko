import { Bell, MessageCircle, Package, User } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";

const mockNotifications = [
  { id: 1, type: "message", title: "New message", description: "Jane Smith sent you a message", time: "2m ago", read: false },
  { id: 2, type: "product", title: "Product viewed", description: "Your Organic Eggs listing got 15 views today", time: "1h ago", read: false },
  { id: 3, type: "update", title: "App Update", description: "New features available! Check out the latest update.", time: "3h ago", read: true },
  { id: 4, type: "message", title: "New message", description: "Bob Johnson wants to buy your tomatoes", time: "5h ago", read: true },
  { id: 5, type: "product", title: "Price alert", description: "Similar products in your area have updated prices", time: "1d ago", read: true },
];

const iconMap = {
  message: MessageCircle,
  product: Package,
  update: Bell,
};

const Notifications = () => {
  return (
    <MobileLayout>
      <PageHeader title="Notifications" />

      <div className="flex-1 pb-20 space-y-2">
        {mockNotifications.map((notif) => {
          const Icon = iconMap[notif.type as keyof typeof iconMap] || Bell;
          return (
            <div
              key={notif.id}
              className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                notif.read ? "bg-background" : "bg-primary/5"
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
            </div>
          );
        })}
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

export default Notifications;
