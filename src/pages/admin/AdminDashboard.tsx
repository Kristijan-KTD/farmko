import { useState, useEffect } from "react";
import { Users, ShoppingBag, Crown, Loader2, Leaf, Zap } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminGuard from "@/components/admin/AdminGuard";
import { useAdmin } from "@/contexts/AdminContext";

interface DashboardStats {
  totalFarmers: number;
  totalCustomers: number;
  totalProducts: number;
  planCounts: { starter: number; growth: number; pro: number };
}

const AdminDashboard = () => {
  const { adminAction } = useAdmin();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminAction<DashboardStats>("get_dashboard_stats");
        setStats(data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  return (
    <AdminGuard>
      <AdminLayout title="Dashboard">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Farmers", value: stats.totalFarmers || 0, icon: Users, color: "bg-primary/10 text-primary" },
                { label: "Total Customers", value: stats.totalCustomers || 0, icon: Users, color: "bg-blue-50 text-blue-500" },
                { label: "Total Products", value: stats.totalProducts || 0, icon: ShoppingBag, color: "bg-orange-50 text-orange-500" },
                { label: "Paid Subscribers", value: (stats.planCounts.growth + stats.planCounts.pro) || 0, icon: Crown, color: "bg-yellow-50 text-yellow-600" },
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

            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="font-semibold text-foreground">Subscription Distribution</h3>
              <div className="space-y-3">
                {[
                  { plan: "Starter (Free)", count: stats.planCounts.starter, icon: Leaf, color: "bg-muted text-muted-foreground" },
                  { plan: "Growth ($12/mo)", count: stats.planCounts.growth, icon: Zap, color: "bg-primary/10 text-primary" },
                  { plan: "Pro ($29/mo)", count: stats.planCounts.pro, icon: Crown, color: "bg-yellow-50 text-yellow-600" },
                ].map(({ plan, count, icon: Icon, color }) => {
                  const total = (stats.totalFarmers || 1);
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={plan} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{plan}</span>
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
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-20">Failed to load dashboard data</p>
        )}
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminDashboard;
