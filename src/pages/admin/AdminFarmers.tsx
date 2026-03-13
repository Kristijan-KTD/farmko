import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, User, Crown, Zap, Leaf, ShoppingBag, MapPin, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminGuard from "@/components/admin/AdminGuard";
import { adminService } from "@/services/adminService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Farmer, Plan } from "@/types/admin";

const PLANS: Plan[] = ["starter", "growth", "pro"];
const PAGE_SIZE = 20;

const planBadge: Record<Plan, { label: string; color: string; icon: React.ElementType }> = {
  starter: { label: "Starter", color: "bg-muted text-muted-foreground", icon: Leaf },
  growth: { label: "Growth", color: "bg-primary/10 text-primary", icon: Zap },
  pro: { label: "Pro", color: "bg-yellow-100 text-yellow-700", icon: Crown },
};

const AdminFarmers = () => {
  const { toast } = useToast();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState<Farmer | null>(null);
  const [promotePlan, setPromotePlan] = useState<Plan>("growth");
  const [promoting, setPromoting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<Plan | "all">("all");
  const [page, setPage] = useState(1);

  const fetchFarmers = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const data = await adminService.getFarmers();
      if (signal?.aborted) return;
      setFarmers(data ?? []);
    } catch (e: unknown) {
      if (signal?.aborted) return;
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error("Farmers fetch error:", msg);
      toast({ title: "Error", description: "Failed to load farmers", variant: "destructive" });
      setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchFarmers(controller.signal);
    return () => controller.abort();
  }, [fetchFarmers]);

  const filtered = useMemo(() => {
    let list = farmers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.name?.toLowerCase().includes(q) ||
        f.email?.toLowerCase().includes(q)
      );
    }
    if (planFilter !== "all") {
      list = list.filter(f => (f.subscription?.plan ?? "starter") === planFilter);
    }
    return list;
  }, [farmers, search, planFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, planFilter]);

  const handlePromote = async () => {
    if (!promoteTarget) return;
    setPromoting(true);
    try {
      await adminService.promoteFarmer(promoteTarget.id, promotePlan);
      toast({ title: "Farmer promoted!", description: `${promoteTarget.name} is now on the ${promotePlan} plan` });
      setPromoteTarget(null);
      // Refetch to stay in sync
      await fetchFarmers();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setPromoting(false);
    }
  };

  return (
    <AdminGuard>
      <AdminLayout title="Farmer Management">
        {/* Search & Filters */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
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
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-muted-foreground">Failed to load farmers</p>
            <Button variant="outline" onClick={() => fetchFarmers()} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Retry
            </Button>
          </div>
        ) : paged.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">
            {search || planFilter !== "all" ? "No farmers match your filters" : "No farmers found"}
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {paged.map((farmer) => {
                const currentPlan = (farmer.subscription?.plan ?? "starter") as Plan;
                const badge = planBadge[currentPlan] ?? planBadge.starter;
                const BadgeIcon = badge.icon;
                return (
                  <div key={farmer.id} className="p-4 rounded-xl border border-border bg-card space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {farmer.avatar_url ? (
                          <img src={farmer.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{farmer.name || "Unnamed"}</p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.color}`}>
                            <BadgeIcon className="w-3 h-3" />
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{farmer.email ?? "No email"}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPromoteTarget(farmer);
                          setPromotePlan(currentPlan === "pro" ? "pro" : currentPlan === "growth" ? "pro" : "growth");
                        }}
                        className="rounded-full text-xs h-8"
                      >
                        <Crown className="w-3 h-3 mr-1" />
                        Promote
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" />
                        {farmer.productCount ?? 0} products
                      </span>
                      {farmer.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[120px]">{farmer.location}</span>
                        </span>
                      )}
                      <span>Joined {farmer.created_at ? new Date(farmer.created_at).toLocaleDateString() : "N/A"}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center mt-2">
              {filtered.length} farmer{filtered.length !== 1 ? "s" : ""} total
            </p>
          </>
        )}

        <Dialog open={!!promoteTarget} onOpenChange={(o) => !o && setPromoteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Promote Farmer</DialogTitle>
              <DialogDescription>
                Change {promoteTarget?.name ?? "this farmer"}'s subscription plan.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              {PLANS.map((plan) => {
                const b = planBadge[plan];
                const Icon = b.icon;
                return (
                  <button
                    key={plan}
                    onClick={() => setPromotePlan(plan)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
                      promotePlan === plan ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${b.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-foreground capitalize">{b.label}</span>
                  </button>
                );
              })}
              <Button
                onClick={handlePromote}
                disabled={promoting}
                className="w-full rounded-full h-11 font-semibold"
              >
                {promoting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Update Plan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminFarmers;
