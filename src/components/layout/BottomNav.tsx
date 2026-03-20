import { Home, Search, MessageCircle, MapPin, Store, Camera, Heart } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const farmerItems = [
    { icon: Home, path: "/home", label: "Home" },
    { icon: Store, path: "/my-store", label: "Store" },
    { icon: Camera, path: "/instafarm", label: "Instafarm" },
    { icon: Search, path: "/explore", label: "Explore" },
    { icon: MessageCircle, path: "/chat", label: "Chat" },
  ];

  const customerItems = [
    { icon: Home, path: "/home", label: "Home" },
    { icon: Search, path: "/explore", label: "Explore" },
    { icon: Heart, path: "/favorites", label: "Saved" },
    { icon: MessageCircle, path: "/chat", label: "Chat" },
    { icon: MapPin, path: "/radar", label: "Radar" },
  ];

  const items = user?.role === "farmer" ? farmerItems : customerItems;

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-background border-t border-border z-50 lg:hidden">
      <nav className="flex justify-around items-center h-14 px-2">
        {items.map(({ icon: Icon, path, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center gap-0.5 w-14 h-full transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
