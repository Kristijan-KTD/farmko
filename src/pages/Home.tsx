import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, ShoppingBag, Camera, Store, Search, MessageCircle, Bell, MapPin, Users, BarChart3, Crown } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";
import SideMenu from "@/components/layout/SideMenu";
import { useAuth } from "@/contexts/AuthContext";

const Home = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const farmerFeatures = [
    { icon: User, label: "Profile", path: "/profile", color: "bg-primary/10 text-primary" },
    { icon: ShoppingBag, label: "Post Item", path: "/post-item", color: "bg-orange-50 text-orange-500" },
    { icon: Camera, label: "Instafarm", path: "/instafarm", color: "bg-blue-50 text-blue-500" },
    { icon: Store, label: "My Store", path: "/my-store", color: "bg-purple-50 text-purple-500" },
    { icon: Search, label: "Explore", path: "/explore", color: "bg-yellow-50 text-yellow-600" },
    { icon: MessageCircle, label: "Chat", path: "/chat", color: "bg-pink-50 text-pink-500" },
    { icon: Bell, label: "Notifications", path: "/notifications", color: "bg-red-50 text-red-500" },
    { icon: MapPin, label: "Radar", path: "/radar", color: "bg-teal-50 text-teal-500" },
  ];

  const customerFeatures = [
    { icon: User, label: "Profile", path: "/profile", color: "bg-primary/10 text-primary" },
    { icon: Search, label: "Explore", path: "/explore", color: "bg-yellow-50 text-yellow-600" },
    { icon: Users, label: "Find Farmer", path: "/find-farmer", color: "bg-blue-50 text-blue-500" },
    { icon: MessageCircle, label: "Chat", path: "/chat", color: "bg-pink-50 text-pink-500" },
    { icon: Bell, label: "Notifications", path: "/notifications", color: "bg-red-50 text-red-500" },
    { icon: MapPin, label: "Radar", path: "/radar", color: "bg-teal-50 text-teal-500" },
  ];

  const features = user?.role === "farmer" ? farmerFeatures : customerFeatures;

  return (
    <MobileLayout>
      <div className="lg:hidden">
        <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      </div>
      <div className="lg:hidden">
        <TopBar onMenuOpen={() => setMenuOpen(true)} />
      </div>
      <div className="hidden lg:block py-4">
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
      </div>

      <div className="flex-1 pb-20 lg:pb-4">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-muted overflow-hidden flex items-center justify-center">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{user?.name || "User"}</h2>
            <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, label, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-foreground">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:hidden">
        <BottomNav />
      </div>
    </MobileLayout>
  );
};

export default Home;
