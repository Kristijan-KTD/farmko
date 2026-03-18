import { useState } from "react";
import { Check, Crown, Zap, Leaf, Loader2, Settings } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useSubscription, PLANS, PlanTier } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const planIcons = { starter: Leaf, growth: Zap, pro: Crown };
const planColors = {
  starter: "border-border",
  growth: "border-primary ring-1 ring-primary/20",
  pro: "border-yellow-500 ring-1 ring-yellow-500/20",
};

const Plans = () => {
  const { plan: currentPlan, subscribed, subscriptionEnd, refreshSubscription } = useSubscription();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [managingPortal, setManagingPortal] = useState(false);

  const handleSubscribe = async (tier: PlanTier) => {
    if (tier === "starter" || tier === currentPlan) return;
    const planConfig = PLANS[tier];
    if (!("priceId" in planConfig)) return;

    setLoading(tier);
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId: planConfig.priceId },
    });

    if (data?.url) {
      window.open(data.url, "_blank");
    } else {
      toast({ title: "Error", description: error?.message || data?.error || "Could not start checkout", variant: "destructive" });
    }
    setLoading(null);
  };

  const handleManageSubscription = async () => {
    setManagingPortal(true);
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (data?.url) {
      window.open(data.url, "_blank");
    } else {
      toast({ title: "Error", description: error?.message || data?.error || "Could not open portal", variant: "destructive" });
    }
    setManagingPortal(false);
  };

  const tiers: PlanTier[] = ["starter", "growth", "pro"];

  return (
    <MobileLayout>
      <PageHeader title="Subscription Plans" />

      <div className="flex-1 pb-8 space-y-4">
        {subscribed && subscriptionEnd && (
          <div className="p-3 rounded-md bg-primary/10 border border-primary/20">
            <p className="text-xs text-primary font-medium">
              Your <span className="font-bold capitalize">{PLANS[currentPlan].name}</span> plan renews on{" "}
              {new Date(subscriptionEnd).toLocaleDateString()}
            </p>
          </div>
        )}

        {tiers.map((tier) => {
          const plan = PLANS[tier];
          const Icon = planIcons[tier];
          const isCurrent = tier === currentPlan;
          const isUpgrade = tiers.indexOf(tier) > tiers.indexOf(currentPlan);

          return (
            <div
              key={tier}
              className={`rounded-2xl border-2 p-5 space-y-4 bg-card ${planColors[tier]} ${isCurrent ? "relative" : ""}`}
            >
              {isCurrent && (
                <span className="absolute -top-3 left-4 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full">
                  YOUR PLAN
                </span>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tier === "pro" ? "bg-yellow-500/10 text-yellow-600" : "bg-primary/10 text-primary"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {plan.price === 0 ? "Free" : `$${plan.price}/mo`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-foreground">{f}</span>
                  </div>
                ))}
                {plan.limitations.map((l) => (
                  <div key={l} className="flex items-start gap-2">
                    <span className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0 text-center text-xs">✕</span>
                    <span className="text-xs text-muted-foreground">{l}</span>
                  </div>
                ))}
              </div>

              {isUpgrade && (
                <Button
                  onClick={() => handleSubscribe(tier)}
                  disabled={!!loading}
                  className={`w-full rounded-full h-11 font-semibold ${
                    tier === "pro" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""
                  }`}
                >
                  {loading === tier ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {loading === tier ? "Processing..." : `Upgrade to ${plan.name}`}
                </Button>
              )}

              {isCurrent && subscribed && (
                <Button
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={managingPortal}
                  className="w-full rounded-full h-11 font-semibold gap-2"
                >
                  {managingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                  Manage Subscription
                </Button>
              )}
            </div>
          );
        })}

        <Button
          variant="ghost"
          onClick={refreshSubscription}
          className="w-full text-sm text-muted-foreground"
        >
          Refresh subscription status
        </Button>
      </div>
    </MobileLayout>
  );
};

export default Plans;
