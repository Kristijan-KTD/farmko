import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Plus, Package, MessageCircle, Eye, Heart, Search, Bell, Store, Crown, Loader2 } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";
import SideMenu from "@/components/layout/SideMenu";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { getPlanBadge } from "@/services/planService";
import { Button } from "@/components/ui/button";
import HorizontalScroll from "@/components/HorizontalScroll";

interface DashboardStats {
  activeListings: number;
  unreadChats: number;
  profileViews: number;
  favorites: number;
}

interface StoreProduct {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  status: string;
}

const Home = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plan } = useSubscription();
  const [stats, setStats] = useState<DashboardStats>({ activeListings: 0, unreadChats: 0, profileViews: 0, favorites: 0 });
  const [storePreview, setStorePreview] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const fetchData = async () => {
      try {
        const chatRes = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("read", false)
          .neq("sender_id", user.id);

        let activeListings = 0, profileViews = 0, favorites = 0;

        if (user.role === "farmer") {
          const [listRes, viewRes, favRes, storeRes] = await Promise.all([
            supabase.from("products").select("id", { count: "exact", head: true }).eq("farmer_id", user.id).eq("status", "active"),
            supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("farmer_id", user.id).eq("event_type", "profile_view").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
            supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("farmer_id", user.id).eq("event_type", "favorite_listing"),
            supabase.from("products").select("id, title, price, images, status").eq("farmer_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(3),
          ]);
          activeListings = listRes.count ?? 0;
          profileViews = viewRes.count ?? 0;
          favorites = favRes.count ?? 0;
          if (mounted) setStorePreview(storeRes.data || []);
        }

        if (!mounted) return;
        setStats({ unreadChats: chatRes.count ?? 0, activeListings, profileViews, favorites });
      } catch {
        // Non-critical
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, [user]);

  const planBadge = getPlanBadge(plan);
  const viewsInsight = stats.profileViews > 0
    ? `Your profile received ${stats.profileViews} views this week`
    : "Post products to start getting views";

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

      <div className="flex-1 pb-20 lg:pb-4 section-gap">
        {/* Profile Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-full bg-muted overflow-hidden flex items-center justify-center ring-2 ring-border" style={{ width: 52, height: 52 }}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground truncate leading-tight">{user?.name || "User"}</h2>
              {planBadge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${planBadge.color}`}>
                  {planBadge.label}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{user?.role}</p>
          </div>
        </div>

        {/* FARMER DASHBOARD */}
        {user?.role === "farmer" && (
          <>
            {/* Section 1: Primary CTA */}
            <Button onClick={() => navigate("/post-item")} className="w-full rounded-md h-12 font-semibold gap-2.5 text-base">
              <Plus className="w-5 h-5" />
              Post New Product
            </Button>

            {/* Section 2: Performance Summary */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Performance</h3>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Package, label: "Listings", value: stats.activeListings, path: "/my-store", color: "text-primary", bg: "bg-primary/8" },
                      { icon: Eye, label: "Views (7d)", value: stats.profileViews, path: "/analytics", color: "text-blue-500", bg: "bg-blue-500/8" },
                      { icon: MessageCircle, label: "Unread Chats", value: stats.unreadChats, path: "/chat", color: "text-pink-500", bg: "bg-pink-500/8" },
                      { icon: Heart, label: "Favorites", value: stats.favorites, path: "/analytics", color: "text-red-500", bg: "bg-red-500/8" },
                    ].map(({ icon: Icon, label, value, path, color, bg }) => (
                      <button key={label} onClick={() => navigate(path)} className="card-interactive p-4 text-left">
                        <div className={`w-9 h-9 rounded-md ${bg} flex items-center justify-center mb-2.5`}>
                          <Icon className={`w-4.5 h-4.5 ${color}`} style={{ width: 18, height: 18 }} />
                        </div>
                        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
                      </button>
                    ))}
                  </div>
                  <div className="rounded-md bg-secondary/80 px-4 py-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      💡 {viewsInsight}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Section 3: Quick Management */}
            {storePreview.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Store</h3>
                  <button onClick={() => navigate("/my-store")} className="text-xs font-semibold text-primary">View all</button>
                </div>
                <div className="space-y-2">
                  {storePreview.map((p) => (
                    <button key={p.id} onClick={() => navigate(`/product/${p.id}`)} className="list-item-subtle">
                      <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-muted-foreground/30" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                        <p className="text-xs font-semibold text-primary mt-0.5">${p.price.toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Section 4: Quick Links */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Access</h3>
              <HorizontalScroll className="gap-2.5 pb-1" snap={false}>
                {[
                  { icon: Store, label: "My Store", path: "/my-store" },
                  { icon: Crown, label: "Plans", path: "/plans" },
                  { icon: Bell, label: "Notifications", path: "/notifications" },
                  { icon: Search, label: "Explore", path: "/explore" },
                ].map(({ icon: Icon, label, path }) => (
                  <button key={path} onClick={() => navigate(path)} className="list-item-subtle gap-2 px-4 py-2.5 shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground whitespace-nowrap">{label}</span>
                  </button>
                ))}
              </HorizontalScroll>
            </div>
          </>
        )}

        {/* CUSTOMER DASHBOARD */}
        {user?.role === "customer" && (
          <>
            <div className="flex gap-3">
              <button onClick={() => navigate("/chat")} className="card-interactive flex-1 p-4 text-left">
                <div className="w-9 h-9 rounded-md bg-pink-500/8 flex items-center justify-center mb-2.5">
                  <MessageCircle className="w-[18px] h-[18px] text-pink-500" />
                </div>
                <p className="text-2xl font-bold text-foreground leading-none">{stats.unreadChats}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Unread Chats</p>
              </button>
              <button onClick={() => navigate("/explore")} className="card-interactive flex-1 p-4 text-left">
                <div className="w-9 h-9 rounded-md bg-primary/8 flex items-center justify-center mb-2.5">
                  <Search className="w-[18px] h-[18px] text-primary" />
                </div>
                <p className="text-sm font-semibold text-primary mt-2">Browse Products</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Discover</p>
              </button>
            </div>

            <Button onClick={() => navigate("/explore")} className="w-full rounded-md h-12 font-semibold gap-2">
              <Search className="w-4 h-4" />
              Explore Local Products
            </Button>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Access</h3>
              <HorizontalScroll className="gap-2.5 pb-1" snap={false}>
                {[
                  { icon: Heart, label: "Saved", path: "/favorites" },
                  { icon: Search, label: "Explore", path: "/explore" },
                  { icon: Bell, label: "Notifications", path: "/notifications" },
                ].map(({ icon: Icon, label, path }) => (
                  <button key={path} onClick={() => navigate(path)} className="list-item-subtle gap-2 px-4 py-2.5 shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground whitespace-nowrap">{label}</span>
                  </button>
                ))}
              </HorizontalScroll>
            </div>
          </>
        )}
      </div>

      <div className="lg:hidden">
        <BottomNav />
      </div>
    </MobileLayout>
  );
};

export default Home;
