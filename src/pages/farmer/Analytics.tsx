import { useState, useEffect } from "react";
import { BarChart3, Eye, MousePointer, MessageCircle, Loader2, Lock } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";

const Analytics = () => {
  const { user } = useAuth();
  const { plan, hasFeature } = useSubscription();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ profileViews: 0, listingViews: 0, listingClicks: 0, messageContacts: 0 });
  const [topListings, setTopListings] = useState<{ id: string; title: string; views: number }[]>([]);

  useEffect(() => {
    if (!user || !hasFeature("analytics")) {
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      // Get analytics events
      const { data: events } = await supabase
        .from("analytics_events")
        .select("event_type")
        .eq("farmer_id", user.id);

      if (events) {
        setStats({
          profileViews: events.filter(e => e.event_type === "profile_view").length,
          listingViews: events.filter(e => e.event_type === "listing_view").length,
          listingClicks: events.filter(e => e.event_type === "listing_click").length,
          messageContacts: events.filter(e => e.event_type === "message_contact").length,
        });
      }

      // Get top listings by views
      const { data: listings } = await supabase
        .from("products")
        .select("id, title")
        .eq("farmer_id", user.id)
        .eq("status", "active");

      if (listings) {
        const listingsWithViews = await Promise.all(
          listings.map(async (l) => {
            const { count } = await supabase
              .from("listing_views")
              .select("*", { count: "exact", head: true })
              .eq("listing_id", l.id);
            return { ...l, views: count || 0 };
          })
        );
        setTopListings(listingsWithViews.sort((a, b) => b.views - a.views).slice(0, 5));
      }

      setLoading(false);
    };
    fetchAnalytics();
  }, [user, hasFeature]);

  if (!hasFeature("analytics")) {
    return (
      <MobileLayout>
        <PageHeader title="Analytics" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground text-center">Analytics Requires Growth Plan or Higher</h2>
          <p className="text-sm text-muted-foreground text-center">
            Upgrade your plan to see how your products are performing
          </p>
          <Button onClick={() => navigate("/plans")} className="rounded-full px-8 h-11 font-semibold">
            View Plans
          </Button>
        </div>
        <BottomNav />
      </MobileLayout>
    );
  }

  const statCards = [
    { icon: Eye, label: "Profile Views", value: stats.profileViews, color: "bg-blue-50 text-blue-500" },
    { icon: BarChart3, label: "Listing Views", value: stats.listingViews, color: "bg-primary/10 text-primary" },
    { icon: MousePointer, label: "Listing Clicks", value: stats.listingClicks, color: "bg-orange-50 text-orange-500" },
    { icon: MessageCircle, label: "Messages", value: stats.messageContacts, color: "bg-pink-50 text-pink-500" },
  ];

  return (
    <MobileLayout>
      <PageHeader title={plan === "pro" ? "Full Analytics" : "Basic Analytics"} />

      <div className="flex-1 pb-20 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {statCards.map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {plan === "pro" && topListings.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Top Listings by Views</h3>
                {topListings.map((l, i) => (
                  <button
                    key={l.id}
                    onClick={() => navigate(`/product/${l.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border text-left"
                  >
                    <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}</span>
                    <span className="flex-1 text-sm font-medium text-foreground truncate">{l.title}</span>
                    <span className="text-sm text-muted-foreground">{l.views} views</span>
                  </button>
                ))}
              </div>
            )}

            {plan === "growth" && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center space-y-2">
                <p className="text-sm text-foreground font-medium">Want detailed listing analytics?</p>
                <Button onClick={() => navigate("/plans")} size="sm" className="rounded-full">
                  Upgrade to Pro
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </MobileLayout>
  );
};

export default Analytics;
