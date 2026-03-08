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
} from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
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
  const [loading, setLoading] = useState(true);
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

    const fetchAnalytics = async () => {
      setLoading(true);

      // Fetch analytics events within date range
      const { data: events } = await supabase
        .from("analytics_events")
        .select("event_type, listing_id, created_at")
        .eq("farmer_id", user.id)
        .gte("created_at", startDate);

      if (events) {
        setStats({
          profileViews: events.filter((e) => e.event_type === "profile_view").length,
          listingViews: events.filter((e) => e.event_type === "listing_view").length,
          contactClicks: events.filter((e) => e.event_type === "contact_farmer").length,
          favorites: events.filter((e) => e.event_type === "favorite_listing").length,
        });

        // Process trend data for chart
        const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
        const trendMap = new Map<string, number>();
        
        // Initialize all days
        for (let i = 0; i < days; i++) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split("T")[0];
          trendMap.set(dateStr, 0);
        }

        // Count views per day
        events
          .filter((e) => e.event_type === "profile_view" || e.event_type === "listing_view")
          .forEach((e) => {
            const dateStr = new Date(e.created_at).toISOString().split("T")[0];
            trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + 1);
          });

        const trend = Array.from(trendMap.entries())
          .map(([date, views]) => ({ date, views }))
          .sort((a, b) => a.date.localeCompare(b.date));
        setTrendData(trend);
      }

      // Fetch top listings with analytics
      const { data: products } = await supabase
        .from("products")
        .select("id, title, category")
        .eq("farmer_id", user.id)
        .eq("status", "active");

      if (products && events) {
        const listingsWithStats: TopListing[] = products.map((p) => {
          const listingEvents = events.filter((e) => e.listing_id === p.id);
          const views = listingEvents.filter((e) => e.event_type === "listing_view").length;
          const favorites = listingEvents.filter((e) => e.event_type === "favorite_listing").length;
          const contactClicks = listingEvents.filter(
            (e) => e.event_type === "contact_farmer"
          ).length;
          const lastViewEvent = listingEvents
            .filter((e) => e.event_type === "listing_view")
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

          return {
            id: p.id,
            title: p.title,
            views,
            favorites,
            contactClicks,
            lastViewed: lastViewEvent?.created_at || null,
          };
        });

        setTopListings(
          listingsWithStats.sort((a, b) => b.views - a.views).slice(0, 10)
        );

        // Category insights for pro plan
        if (plan === "pro") {
          const categoryMap = new Map<string, number>();
          products.forEach((p) => {
            const cat = p.category || "Uncategorized";
            const listingEvents = events.filter((e) => e.listing_id === p.id);
            categoryMap.set(cat, (categoryMap.get(cat) || 0) + listingEvents.length);
          });
          setCategoryInsights(
            Array.from(categoryMap.entries())
              .map(([category, count]) => ({ category, count }))
              .sort((a, b) => b.count - a.count)
          );
        }
      }

      setLoading(false);
    };

    fetchAnalytics();
  }, [user, hasFeature, startDate, dateRange, plan]);

  // Locked state for Starter plan
  if (!hasFeature("analytics")) {
    return (
      <MobileLayout>
        <PageHeader title="Analytics" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground text-center">
            Unlock Analytics
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Upgrade your plan to unlock analytics and see how customers interact
            with your farm.
          </p>

          {/* Blurred preview */}
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
                <div
                  key={label}
                  className="p-4 rounded-xl border border-border bg-card"
                >
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => navigate("/plans")}
              className="rounded-full px-8 h-11 font-semibold"
            >
              Upgrade Plan
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/plans")}
              className="rounded-full px-6 h-11"
            >
              View Pricing
            </Button>
          </div>
        </div>
        <BottomNav />
      </MobileLayout>
    );
  }

  const statCards = [
    {
      icon: Eye,
      label: "Profile Views",
      value: stats.profileViews,
      color: "bg-blue-50 text-blue-500",
    },
    {
      icon: BarChart3,
      label: "Listing Views",
      value: stats.listingViews,
      color: "bg-primary/10 text-primary",
    },
    {
      icon: MessageCircle,
      label: "Contact Clicks",
      value: stats.contactClicks,
      color: "bg-orange-50 text-orange-500",
    },
    {
      icon: Heart,
      label: "Favorites",
      value: stats.favorites,
      color: "bg-pink-50 text-pink-500",
    },
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
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

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

            {/* Section 1: Overview Metrics */}
            <div className="grid grid-cols-2 gap-3">
              {statCards.map(({ icon: Icon, label, value, color }) => (
                <div
                  key={label}
                  className="p-4 rounded-xl border border-border bg-card space-y-2"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {/* Section 2: Traffic Trend Chart */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Traffic Trend
                </h3>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        width={30}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelFormatter={formatDate}
                      />
                      <Line
                        type="monotone"
                        dataKey="views"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                    No data available
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Top Performing Products (Growth+) */}
            {topListings.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Top Performing Products
                </h3>
                <div className="space-y-2">
                  {topListings.slice(0, 5).map((listing, i) => (
                    <button
                      key={listing.id}
                      onClick={() => navigate(`/product/${listing.id}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border text-left"
                    >
                      <span className="text-sm font-bold text-muted-foreground w-6">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {listing.title}
                        </p>
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

            {/* Section 4: Product Performance (Pro only) */}
            {plan === "pro" && topListings.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Product Performance
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-muted-foreground font-medium">
                          Product
                        </th>
                        <th className="text-center py-2 text-muted-foreground font-medium">
                          Views
                        </th>
                        <th className="text-center py-2 text-muted-foreground font-medium">
                          ♥
                        </th>
                        <th className="text-center py-2 text-muted-foreground font-medium">
                          Contacts
                        </th>
                        <th className="text-right py-2 text-muted-foreground font-medium">
                          Last View
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topListings.map((listing) => (
                        <tr
                          key={listing.id}
                          onClick={() => navigate(`/product/${listing.id}`)}
                          className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/50"
                        >
                          <td className="py-2 text-foreground truncate max-w-[120px]">
                            {listing.title}
                          </td>
                          <td className="py-2 text-center text-foreground">
                            {listing.views}
                          </td>
                          <td className="py-2 text-center text-foreground">
                            {listing.favorites}
                          </td>
                          <td className="py-2 text-center text-foreground">
                            {listing.contactClicks}
                          </td>
                          <td className="py-2 text-right text-muted-foreground text-xs">
                            {timeAgo(listing.lastViewed)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section 5: Customer Interest Insights (Pro only) */}
            {plan === "pro" && categoryInsights.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Customer Interest Insights
                </h3>
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Most viewed categories
                  </p>
                  {categoryInsights.slice(0, 5).map((cat, i) => (
                    <div key={cat.category} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-primary w-5">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground">{cat.category}</span>
                          <span className="text-muted-foreground">
                            {cat.count} interactions
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                (cat.count / (categoryInsights[0]?.count || 1)) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upsell for Growth plan */}
            {plan === "growth" && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center space-y-2">
                <p className="text-sm text-foreground font-medium">
                  Want detailed product analytics & insights?
                </p>
                <Button
                  onClick={() => navigate("/plans")}
                  size="sm"
                  className="rounded-full"
                >
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
