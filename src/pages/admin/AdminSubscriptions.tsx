import { useState, useEffect } from "react";
import { Loader2, User, Crown, Zap, Leaf } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminGuard from "@/components/admin/AdminGuard";
import { useAdmin } from "@/contexts/AdminContext";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Subscription {
  id: string;
  farmer_id: string;
  plan: string;
  status: string;
  stripe_subscription_id: string | null;
  renewal_date: string | null;
  created_at: string;
  farmer: { id: string; name: string; email: string | null; avatar_url: string | null } | null;
}

const planIcons: Record<string, any> = { starter: Leaf, growth: Zap, pro: Crown };
const planColors: Record<string, string> = {
  starter: "bg-muted text-muted-foreground",
  growth: "bg-primary/10 text-primary",
  pro: "bg-yellow-50 text-yellow-600",
};

const AdminSubscriptions = () => {
  const { adminAction } = useAdmin();
  const { toast } = useToast();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await adminAction<Subscription[]>("get_subscriptions");
        setSubs(data || []);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handlePlanChange = async (farmerId: string, newPlan: string) => {
    try {
      await adminAction("update_subscription", { farmerId, plan: newPlan, status: "active" });
      setSubs(subs.map(s => s.farmer_id === farmerId ? { ...s, plan: newPlan } : s));
      toast({ title: "Plan updated", description: `Farmer plan changed to ${newPlan}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AdminGuard>
      <AdminLayout title="Subscriptions">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : subs.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">No subscriptions found</p>
        ) : (
          <div className="space-y-3">
            {subs.map((sub) => {
              const Icon = planIcons[sub.plan] || Leaf;
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
                    <p className="text-sm font-semibold text-foreground truncate">{sub.farmer?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{sub.farmer?.email}</p>
                    {sub.renewal_date && (
                      <p className="text-[10px] text-muted-foreground">
                        Renews: {new Date(sub.renewal_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${planColors[sub.plan] || "bg-muted"}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <Select value={sub.plan} onValueChange={(v) => handlePlanChange(sub.farmer_id, v)}>
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
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminSubscriptions;
