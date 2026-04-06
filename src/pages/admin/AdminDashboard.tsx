import { useState, useEffect, useCallback } from "react";
import { Users, ShoppingBag, Crown, Loader2, Leaf, Zap, RefreshCw, MessageCircle, TrendingUp, UserPlus, User } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminGuard from "@/components/admin/AdminGuard";
import { adminService } from "@/services/adminService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import type { DashboardStats } from "@/types/admin";

const AdminDashboard = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchStats = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const data = await adminService.getDashboardStats();
      if (signal?.aborted) return;
      setStats(data);
    } catch (e: unknown) {
      if (signal?.aborted) return;
      toast({ title: "Error", description: "Failed to load dashboard data", variant: "destructive" });
      setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchStats(controller.signal);
    return () => controller.abort();
  }, [fetchStats]);

  const safePercent = (count: number, total: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

  return (
    <AdminGuard>
      <AdminLayout title="Dashboard">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error || !stats ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-muted-foreground">Failed to load dashboard data</p>
            <Button variant="outline" onClick={() => fetchStats()} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Farmers", value: stats.totalFarmers ?? 0, icon: Users, color: "bg-primary/10 text-primary" },
                { label: "Total Customers", value: stats.totalCustomers ?? 0, icon: Users, color: "bg-blue-50 text-blue-500" },
                { label: "Total Products", value: stats.totalProducts ?? 0, icon: ShoppingBag, color: "bg-orange-50 text-orange-500" },
                { label: "Active Chats", value: stats.activeChats ?? 0, icon: MessageCircle, color: "bg-purple-50 text-purple-500" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {/* Analytics - Last 7 Days */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">New Users (7 days)</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.newUsersLast7Days ?? 0}</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-medium text-muted-foreground">Products Created (7 days)</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.productsCreatedLast7Days ?? 0}</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-600" />
                  <span className="text-xs font-medium text-muted-foreground">Paid Subscribers</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{(stats.planCounts?.growth ?? 0) + (stats.planCounts?.pro ?? 0)}</p>
              </div>
            </div>

            {/* Subscription Distribution */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="font-semibold text-foreground">Subscription Distribution</h3>
              <div className="space-y-3">
                {[
                  { plan: "Starter", price: "Free", count: stats.planCounts?.starter ?? 0, icon: Leaf, color: "bg-muted text-muted-foreground" },
                  { plan: "Growth", price: "$9/mo · $6/mo annual", count: stats.planCounts?.growth ?? 0, icon: Zap, color: "bg-primary/10 text-primary" },
                  { plan: "Pro", price: "$19/mo · $16/mo annual", count: stats.planCounts?.pro ?? 0, icon: Crown, color: "bg-yellow-50 text-yellow-600" },
                ].map(({ plan, price, count, icon: Icon, color }) => {
                  const total = stats.totalFarmers ?? 0;
                  const pct = safePercent(count, total);
                  return (
                    <div key={plan} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{plan}</span>
                            <span className="text-[10px] text-muted-foreground">{price}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Most Active Farmers */}
            {stats.mostActiveFarmers && stats.mostActiveFarmers.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Most Active Farmers
                </h3>
                <div className="space-y-3">
                  {stats.mostActiveFarmers.map((farmer, i) => (
                    <div key={farmer.id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {farmer.avatar_url ? (
                          <img src={farmer.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{farmer.name}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{farmer.productCount} products</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminDashboard;
