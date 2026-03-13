import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, User, Crown, Zap, Leaf, Search, RefreshCw } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminGuard from "@/components/admin/AdminGuard";
import { adminService } from "@/services/adminService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Subscription, Plan, SubscriptionStatus } from "@/types/admin";

const PLANS: Plan[] = ["starter", "growth", "pro"];
const STATUSES: SubscriptionStatus[] = ["active", "cancelled", "expired", "past_due"];

const planIcons: Record<Plan, React.ElementType> = { starter: Leaf, growth: Zap, pro: Crown };
const planColors: Record<Plan, string> = {
  starter: "bg-muted text-muted-foreground",
  growth: "bg-primary/10 text-primary",
  pro: "bg-yellow-50 text-yellow-600",
};
const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
  expired: "bg-muted text-muted-foreground",
  past_due: "bg-orange-100 text-orange-600",
  trialing: "bg-blue-100 text-blue-600",
};

const AdminSubscriptions = () => {
  const { toast } = useToast();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<Plan | "all">("all");
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | "all">("all");

  const fetchSubs = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const data = await adminService.getSubscriptions();
      if (signal?.aborted) return;
      setSubs(data ?? []);
    } catch (e: unknown) {
      if (signal?.aborted) return;
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error("Subscriptions fetch error:", msg);
      toast({ title: "Error", description: "Failed to load subscriptions", variant: "destructive" });
      setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchSubs(controller.signal);
    return () => controller.abort();
  }, [fetchSubs]);

  const filtered = useMemo(() => {
    let list = subs;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.farmer?.name?.toLowerCase().includes(q) ||
        s.farmer?.email?.toLowerCase().includes(q)
      );
    }
    if (planFilter !== "all") {
      list = list.filter(s => s.plan === planFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter(s => s.status === statusFilter);
    }
    return list;
  }, [subs, search, planFilter, statusFilter]);

  const handlePlanChange = async (farmerId: string, newPlan: Plan) => {
    try {
      await adminService.updateSubscription(farmerId, newPlan);
      toast({ title: "Plan updated", description: `Farmer plan changed to ${newPlan}` });
      // Refetch to stay in sync
      await fetchSubs();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  return (
    <AdminGuard>
      <AdminLayout title="Subscriptions">
        {/* Search & Filters */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by farmer name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", ...PLANS] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlanFilter(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  planFilter === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {p === "all" ? "All Plans" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
            <div className="h-6 w-px bg-border mx-1" />
            {(["all", ...STATUSES] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-muted-foreground">Failed to load subscriptions</p>
            <Button variant="outline" onClick={() => fetchSubs()} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Retry
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">
            {search || planFilter !== "all" || statusFilter !== "all" ? "No subscriptions match your filters" : "No subscriptions found"}
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((sub) => {
              const plan = (sub.plan ?? "starter") as Plan;
              const Icon = planIcons[plan] ?? Leaf;
              const status = sub.status ?? "active";
              return (
                <div key={sub.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {sub.farmer?.avatar_url ? (
                      <img src={sub.farmer.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{sub.farmer?.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{sub.farmer?.email ?? "No email"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[status] ?? statusColors.active}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
                      </span>
                      {sub.renewal_date && (
                        <span className="text-[10px] text-muted-foreground">
                          Renews: {new Date(sub.renewal_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${planColors[plan] ?? "bg-muted"}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <Select value={plan} onValueChange={(v) => handlePlanChange(sub.farmer_id, v as Plan)}>
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="growth">Growth</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground text-center mt-2">
              {filtered.length} subscription{filtered.length !== 1 ? "s" : ""} total
            </p>
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminSubscriptions;
