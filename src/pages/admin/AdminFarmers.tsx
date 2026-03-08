import { useState, useEffect } from "react";
import { Loader2, User, Crown, Zap, Leaf, ShoppingBag, MapPin } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminGuard from "@/components/admin/AdminGuard";
import { useAdmin } from "@/contexts/AdminContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Farmer {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  location: string | null;
  created_at: string;
  subscription: { plan: string; status: string };
  productCount: number;
}

const planBadge: Record<string, { label: string; color: string; icon: any }> = {
  starter: { label: "Starter", color: "bg-muted text-muted-foreground", icon: Leaf },
  growth: { label: "Growth", color: "bg-primary/10 text-primary", icon: Zap },
  pro: { label: "Pro", color: "bg-yellow-100 text-yellow-700", icon: Crown },
};

const AdminFarmers = () => {
  const { adminAction } = useAdmin();
  const { toast } = useToast();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoteTarget, setPromoteTarget] = useState<Farmer | null>(null);
  const [promotePlan, setPromotePlan] = useState<string>("growth");

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await adminAction<Farmer[]>("get_farmers");
        setFarmers(data || []);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handlePromote = async () => {
    if (!promoteTarget) return;
    try {
      await adminAction("promote_farmer", { farmerId: promoteTarget.id, plan: promotePlan });
      setFarmers(farmers.map(f =>
        f.id === promoteTarget.id
          ? { ...f, subscription: { ...f.subscription, plan: promotePlan } }
          : f
      ));
      toast({ title: "Farmer promoted!", description: `${promoteTarget.name} is now on the ${promotePlan} plan` });
      setPromoteTarget(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AdminGuard>
      <AdminLayout title="Farmer Management">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : farmers.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">No farmers found</p>
        ) : (
          <div className="space-y-3">
            {farmers.map((farmer) => {
              const badge = planBadge[farmer.subscription.plan] || planBadge.starter;
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
                        <p className="text-sm font-semibold text-foreground truncate">{farmer.name}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.color}`}>
                          <BadgeIcon className="w-3 h-3" />
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{farmer.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setPromoteTarget(farmer); setPromotePlan(farmer.subscription.plan === "pro" ? "pro" : farmer.subscription.plan === "growth" ? "pro" : "growth"); }}
                      className="rounded-full text-xs h-8"
                    >
                      <Crown className="w-3 h-3 mr-1" />
                      Promote
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3" />
                      {farmer.productCount} products
                    </span>
                    {farmer.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {farmer.location}
                      </span>
                    )}
                    <span>Joined {new Date(farmer.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={!!promoteTarget} onOpenChange={(o) => !o && setPromoteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Promote Farmer</DialogTitle>
              <DialogDescription>
                Change {promoteTarget?.name}'s subscription plan manually.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              {(["starter", "growth", "pro"] as const).map((plan) => {
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
              <Button onClick={handlePromote} className="w-full rounded-full h-11 font-semibold">
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
