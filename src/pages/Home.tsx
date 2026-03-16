import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, ShoppingBag, Camera, Store, Search, MessageCircle, Bell, MapPin, Users, BarChart3, Crown, Package, Eye, Zap, Plus, Heart } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";
import SideMenu from "@/components/layout/SideMenu";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { getPlanBadge } from "@/services/planService";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  activeListings: number;
  unreadChats: number;
  profileViews: number;
  favorites: number;
}

const Home = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plan } = useSubscription();
  const [stats, setStats] = useState<DashboardStats>({ activeListings: 0, unreadChats: 0, profileViews: 0, favorites: 0 });

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const fetchStats = async () => {
      try {
        const promises: Promise<any>[] = [
          // Unread chats
          supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("read", false)
            .neq("sender_id", user.id),
        ];

        if (user.role === "farmer") {
          promises.push(
            // Active listings
            supabase
              .from("products")
              .select("id", { count: "exact", head: true })
              .eq("farmer_id", user.id)
              .eq("status", "active"),
            // Profile views (last 7 days)
            supabase
              .from("analytics_events")
              .select("id", { count: "exact", head: true })
              .eq("farmer_id", user.id)
              .eq("event_type", "profile_view")
              .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
            // Favorites
            supabase
              .from("analytics_events")
              .select("id", { count: "exact", head: true })
              .eq("farmer_id", user.id)
              .eq("event_type", "favorite_listing"),
          );
        }

        const results = await Promise.all(promises);
        if (!mounted) return;

        setStats({
          unreadChats: results[0]?.count ?? 0,
          activeListings: results[1]?.count ?? 0,
          profileViews: results[2]?.count ?? 0,
          favorites: results[3]?.count ?? 0,
        });
      } catch {
        // Non-critical, fail silently
      }
    };

    fetchStats();
    return () => { mounted = false; };
  }, [user]);

  const planBadge = getPlanBadge(plan);

  const farmerFeatures = [
    { icon: ShoppingBag, label: "Post Item", path: "/post-item", color: "bg-orange-50 text-orange-500" },
    { icon: Camera, label: "Instafarm", path: "/instafarm", color: "bg-blue-50 text-blue-500" },
    { icon: Store, label: "My Store", path: "/my-store", color: "bg-purple-50 text-purple-500" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", color: "bg-teal-50 text-teal-500" },
    { icon: Crown, label: "Plans", path: "/plans", color: "bg-yellow-50 text-yellow-600" },
    { icon: Search, label: "Explore", path: "/explore", color: "bg-primary/10 text-primary" },
    { icon: MessageCircle, label: "Chat", path: "/chat", color: "bg-pink-50 text-pink-500" },
    { icon: Bell, label: "Notifications", path: "/notifications", color: "bg-red-50 text-red-500" },
    { icon: MapPin, label: "Radar", path: "/radar", color: "bg-teal-50 text-teal-500" },
  ];

  const customerFeatures = [
    { icon: Search, label: "Explore", path: "/explore", color: "bg-primary/10 text-primary" },
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

      <div className="flex-1 pb-20 lg:pb-4 space-y-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-muted overflow-hidden flex items-center justify-center">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-7 h-7 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground truncate">{user?.name || "User"}</h2>
              {planBadge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${planBadge.color}`}>
                  {planBadge.label}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>

        {/* Farmer Summary Stats */}
        {user?.role === "farmer" && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate("/my-store")} className="p-3 rounded-xl border border-border bg-card text-left hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Active Listings</span>
              </div>
              <p className="text-xl font-bold text-foreground">{stats.activeListings}</p>
            </button>
            <button onClick={() => navigate("/chat")} className="p-3 rounded-xl border border-border bg-card text-left hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-4 h-4 text-pink-500" />
                <span className="text-xs text-muted-foreground">Unread Chats</span>
              </div>
              <p className="text-xl font-bold text-foreground">{stats.unreadChats}</p>
            </button>
            <button onClick={() => navigate("/analytics")} className="p-3 rounded-xl border border-border bg-card text-left hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Profile Views (7d)</span>
              </div>
              <p className="text-xl font-bold text-foreground">{stats.profileViews}</p>
            </button>
            <button onClick={() => navigate("/analytics")} className="p-3 rounded-xl border border-border bg-card text-left hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Favorites</span>
              </div>
              <p className="text-xl font-bold text-foreground">{stats.favorites}</p>
            </button>
          </div>
        )}

        {/* Quick Post Button (Farmer) */}
        {user?.role === "farmer" && (
          <Button onClick={() => navigate("/post-item")} className="w-full rounded-full h-11 font-semibold gap-2">
            <Plus className="w-4 h-4" />
            Post New Product
          </Button>
        )}

        {/* Customer Summary */}
        {user?.role === "customer" && (
          <div className="flex gap-3">
            <button onClick={() => navigate("/chat")} className="flex-1 p-3 rounded-xl border border-border bg-card text-left hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-4 h-4 text-pink-500" />
                <span className="text-xs text-muted-foreground">Unread Chats</span>
              </div>
              <p className="text-xl font-bold text-foreground">{stats.unreadChats}</p>
            </button>
            <button onClick={() => navigate("/explore")} className="flex-1 p-3 rounded-xl border border-border bg-card text-left hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <Search className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Discover</span>
              </div>
              <p className="text-sm font-semibold text-primary mt-1">Browse Products</p>
            </button>
          </div>
        )}

        {/* Navigation Grid */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Quick Access</h3>
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
            {features.map(({ icon: Icon, label, path, color }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-card border border-border hover:shadow-md transition-shadow"
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium text-foreground">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <BottomNav />
      </div>
    </MobileLayout>
  );
};

export default Home;
