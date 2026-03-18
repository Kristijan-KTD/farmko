import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  Eye,
  MousePointer,
  MessageCircle,
  Heart,
  Loader2,
  Lock,
  TrendingUp,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DateRange = "7d" | "30d" | "90d";

interface Stats {
  profileViews: number;
  listingViews: number;
  contactClicks: number;
  favorites: number;
}

interface TopListing {
  id: string;
  title: string;
  views: number;
  favorites: number;
  contactClicks: number;
  lastViewed: string | null;
}

interface TrendData {
  date: string;
  views: number;
}

interface CategoryInsight {
  category: string;
  count: number;
}

const Analytics = () => {
  const { user } = useAuth();
  const { plan, hasFeature } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [stats, setStats] = useState<Stats>({
    profileViews: 0,
    listingViews: 0,
    contactClicks: 0,
    favorites: 0,
  });
  const [topListings, setTopListings] = useState<TopListing[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [categoryInsights, setCategoryInsights] = useState<CategoryInsight[]>([]);

  const dateRangeMs = useMemo(() => {
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    return days * 24 * 60 * 60 * 1000;
  }, [dateRange]);

  const startDate = useMemo(() => {
    return new Date(Date.now() - dateRangeMs).toISOString();
  }, [dateRangeMs]);

  useEffect(() => {
    if (!user || !hasFeature("analytics")) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchAnalytics = async () => {
      setLoading(true);
      setFetchError(false);

      try {
        const { data: events, error: eventsError } = await supabase
          .from("analytics_events")
          .select("event_type, listing_id, created_at")
          .eq("farmer_id", user.id)
          .gte("created_at", startDate);

        if (eventsError) throw eventsError;
        if (!mounted) return;

        const safeEvents = events ?? [];

        setStats({
          profileViews: safeEvents.filter((e) => e.event_type === "profile_view").length,
          listingViews: safeEvents.filter((e) => e.event_type === "listing_view").length,
          contactClicks: safeEvents.filter((e) => e.event_type === "contact_farmer").length,
          favorites: safeEvents.filter((e) => e.event_type === "favorite_listing").length,
        });

        // Trend data
        const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
        const trendMap = new Map<string, number>();
        for (let i = 0; i < days; i++) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          trendMap.set(date.toISOString().split("T")[0], 0);
        }
        safeEvents
          .filter((e) => e.event_type === "profile_view" || e.event_type === "listing_view")
          .forEach((e) => {
            const dateStr = new Date(e.created_at).toISOString().split("T")[0];
            trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + 1);
          });
        setTrendData(
          Array.from(trendMap.entries())
            .map(([date, views]) => ({ date, views }))
            .sort((a, b) => a.date.localeCompare(b.date))
        );

        // Products
        const { data: products, error: prodError } = await supabase
          .from("products")
          .select("id, title, category")
          .eq("farmer_id", user.id)
          .eq("status", "active");

        if (prodError) throw prodError;
        if (!mounted) return;

        const safeProducts = products ?? [];

        const listingsWithStats: TopListing[] = safeProducts.map((p) => {
          const listingEvents = safeEvents.filter((e) => e.listing_id === p.id);
          return {
            id: p.id,
            title: p.title,
            views: listingEvents.filter((e) => e.event_type === "listing_view").length,
            favorites: listingEvents.filter((e) => e.event_type === "favorite_listing").length,
            contactClicks: listingEvents.filter((e) => e.event_type === "contact_farmer").length,
            lastViewed: listingEvents.filter((e) => e.event_type === "listing_view")
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at || null,
          };
        });

        setTopListings(listingsWithStats.sort((a, b) => b.views - a.views).slice(0, 10));

        if (plan === "pro") {
          const categoryMap = new Map<string, number>();
          safeProducts.forEach((p) => {
            const cat = p.category || "Uncategorized";
            const count = safeEvents.filter((e) => e.listing_id === p.id).length;
            categoryMap.set(cat, (categoryMap.get(cat) || 0) + count);
          });
          setCategoryInsights(
            Array.from(categoryMap.entries())
              .map(([category, count]) => ({ category, count }))
              .sort((a, b) => b.count - a.count)
          );
        }
      } catch (e: unknown) {
        if (!mounted) return;
        const msg = e instanceof Error ? e.message : "Unknown error";
        console.error("[Analytics] Fetch error:", msg);
        toast({ title: "Failed to load analytics", description: msg, variant: "destructive" });
        setFetchError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAnalytics();
    return () => { mounted = false; };
  }, [user, hasFeature, startDate, dateRange, plan, toast]);

  // Locked state for Starter plan
  if (!hasFeature("analytics")) {
    return (
      <MobileLayout>
        <PageHeader title="Analytics" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground text-center">Unlock Analytics</h2>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Upgrade your plan to unlock analytics and see how customers interact with your farm.
          </p>
          <div className="w-full relative mt-4">
            <div className="absolute inset-0 backdrop-blur-md bg-background/50 z-10 rounded-xl flex items-center justify-center">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-3 opacity-50">
              {[
                { label: "Profile Views", value: "124" },
                { label: "Listing Views", value: "89" },
                { label: "Contact Clicks", value: "32" },
                { label: "Favorites", value: "18" },
              ].map(({ label, value }) => (
                <div key={label} className="p-4 rounded-xl border border-border bg-card">
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => navigate("/plans")} className="rounded-full px-8 h-11 font-semibold">
              Upgrade Plan
            </Button>
            <Button variant="outline" onClick={() => navigate("/plans")} className="rounded-full px-6 h-11">
              View Pricing
            </Button>
          </div>
        </div>
        <BottomNav />
      </MobileLayout>
    );
  }

  const statCards = [
    { icon: Eye, label: "Profile Views", value: stats.profileViews, color: "bg-blue-50 text-blue-500" },
    { icon: BarChart3, label: "Listing Views", value: stats.listingViews, color: "bg-primary/10 text-primary" },
    { icon: MessageCircle, label: "Contact Clicks", value: stats.contactClicks, color: "bg-orange-50 text-orange-500" },
    { icon: Heart, label: "Favorites", value: stats.favorites, color: "bg-pink-50 text-pink-500" },
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <MobileLayout>
      <PageHeader title={plan === "pro" ? "Full Analytics" : "Basic Analytics"} />

      <div className="flex-1 pb-20 section-gap">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertTriangle className="w-12 h-12 text-destructive/50 mb-4" />
            <p className="text-muted-foreground text-sm mb-4">Failed to load analytics</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="rounded-full">Retry</Button>
          </div>
        ) : (
          <>
            {/* Time Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Time period</span>
              </div>
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Overview Metrics */}
            <div className="grid grid-cols-2 gap-3">
              {statCards.map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="card-interactive p-4 space-y-2.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{value ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {/* Traffic Trend Chart */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Traffic Trend</h3>
              </div>
              <div className="card-interactive p-4">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={30} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} labelFormatter={formatDate} />
                      <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">No data available</div>
                )}
              </div>
            </div>

            {/* Top Performing Products */}
            {topListings.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Top Performing Products</h3>
                <div className="space-y-2">
                  {topListings.slice(0, 5).map((listing, i) => (
                    <button key={listing.id} onClick={() => navigate(`/product/${listing.id}`)} className="card-interactive w-full flex items-center gap-3 p-3.5 text-left">
                      <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{listing.title}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{listing.views} views</span>
                          <span>{listing.favorites} ♥</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Product Performance (Pro only) */}
            {plan === "pro" && topListings.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Product Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-muted-foreground font-medium">Product</th>
                        <th className="text-center py-2 text-muted-foreground font-medium">Views</th>
                        <th className="text-center py-2 text-muted-foreground font-medium">♥</th>
                        <th className="text-center py-2 text-muted-foreground font-medium">Contacts</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Last View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topListings.map((listing) => (
                        <tr key={listing.id} onClick={() => navigate(`/product/${listing.id}`)} className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/50">
                          <td className="py-2 text-foreground truncate max-w-[120px]">{listing.title}</td>
                          <td className="py-2 text-center text-foreground">{listing.views}</td>
                          <td className="py-2 text-center text-foreground">{listing.favorites}</td>
                          <td className="py-2 text-center text-foreground">{listing.contactClicks}</td>
                          <td className="py-2 text-right text-muted-foreground text-xs">{timeAgo(listing.lastViewed)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Category Insights (Pro only) */}
            {plan === "pro" && categoryInsights.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Customer Interest Insights</h3>
                <div className="card-interactive p-4 space-y-3">
                  <p className="text-xs text-muted-foreground">Most viewed categories</p>
                  {categoryInsights.slice(0, 5).map((cat, i) => (
                    <div key={cat.category} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-primary w-5">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground">{cat.category}</span>
                          <span className="text-muted-foreground">{cat.count} interactions</span>
                        </div>
                        <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(100, (cat.count / (categoryInsights[0]?.count || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable Insights */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">💡 Insights & Tips</h3>
              <div className="space-y-2">
                {(() => {
                  const insights: { text: string; type: "success" | "tip" | "info" }[] = [];
                  const best = topListings[0];
                  if (best && best.views > 0) {
                    insights.push({ text: `Your best performing product is "${best.title}" with ${best.views} views`, type: "success" });
                  }
                  if (stats.listingViews > 0 && stats.contactClicks === 0) {
                    insights.push({ text: "People are viewing your products but not contacting you. Try adding more details or photos.", type: "tip" });
                  }
                  if (stats.favorites > stats.contactClicks && stats.contactClicks > 0) {
                    insights.push({ text: "You have more saves than contacts — consider adding competitive pricing.", type: "tip" });
                  }
                  if (topListings.length > 0 && topListings.some(l => l.views === 0)) {
                    insights.push({ text: "Some listings have zero views. Try sharing them on Instafarm to boost visibility.", type: "tip" });
                  }
                  if (stats.profileViews > 5) {
                    insights.push({ text: `${stats.profileViews} people visited your profile this period — keep your bio updated!`, type: "info" });
                  }
                  if (insights.length === 0) {
                    insights.push({ text: "Post more products and share on Instafarm to start getting insights.", type: "info" });
                  }
                  return insights.slice(0, 4).map((insight, i) => (
                    <div key={i} className={`p-3.5 rounded-xl text-xs font-medium leading-relaxed ${
                      insight.type === "success" ? "bg-primary/10 text-primary" :
                      insight.type === "tip" ? "bg-orange-50 text-orange-700" :
                      "bg-secondary text-muted-foreground"
                    }`}>
                      {insight.type === "success" ? "🏆 " : insight.type === "tip" ? "💡 " : "ℹ️ "}
                      {insight.text}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Upsell for Growth */}
            {plan === "growth" && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center space-y-2">
                <p className="text-sm text-foreground font-medium">Want detailed product analytics & insights?</p>
                <Button onClick={() => navigate("/plans")} size="sm" className="rounded-full">Upgrade to Pro</Button>
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
