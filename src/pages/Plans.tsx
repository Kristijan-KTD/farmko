import { useState } from "react";
import { Check, Crown, Zap, Leaf, Loader2, Settings } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useSubscription, PLANS, PlanTier, BillingInterval } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const planIcons = { starter: Leaf, growth: Zap, pro: Crown };

const Plans = () => {
  const { plan: currentPlan, subscribed, subscriptionEnd, refreshSubscription } = useSubscription();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [managingPortal, setManagingPortal] = useState(false);
  const [billing, setBilling] = useState<BillingInterval>("monthly");

  const handleSubscribe = async (tier: PlanTier) => {
    if (tier === "starter" || tier === currentPlan) return;
    const planConfig = PLANS[tier];
    const priceId = billing === "annual" && "annualPriceId" in planConfig
      ? planConfig.annualPriceId
      : "priceId" in planConfig ? planConfig.priceId : null;
    if (!priceId) return;

    setLoading(tier);
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId },
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

  const getPrice = (tier: PlanTier) => {
    const plan = PLANS[tier];
    if (plan.price === 0) return "Free";
    const price = billing === "annual" ? plan.annualPrice : plan.price;
    return `$${price}`;
  };

  const getMonthlySavings = (tier: PlanTier) => {
    const plan = PLANS[tier];
    if (plan.price === 0) return null;
    const saved = plan.price - plan.annualPrice;
    return saved > 0 ? saved : null;
  };

  return (
    <MobileLayout>
      <PageHeader title="Choose Your Plan" />

      <div className="flex-1 pb-8 px-4 space-y-5">
        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-1 p-1 rounded-xl bg-muted max-w-xs mx-auto">
          <button
            onClick={() => setBilling("monthly")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              billing === "monthly"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all relative ${
              billing === "annual"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
            <span className="ml-1 text-[10px] font-bold text-primary">Save $3/mo</span>
          </button>
        </div>

        {subscribed && subscriptionEnd && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs text-primary font-medium text-center">
              Your <span className="font-bold capitalize">{PLANS[currentPlan].name}</span> plan renews on{" "}
              {new Date(subscriptionEnd).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Plan cards */}
        {tiers.map((tier) => {
          const plan = PLANS[tier];
          const Icon = planIcons[tier];
          const isCurrent = tier === currentPlan;
          const isUpgrade = tiers.indexOf(tier) > tiers.indexOf(currentPlan);
          const savings = billing === "annual" ? getMonthlySavings(tier) : null;
          const isGrowth = tier === "growth";

          return (
            <div
              key={tier}
              className={`rounded-xl border-2 p-5 space-y-4 bg-card relative transition-all ${
                isGrowth
                  ? "border-primary ring-2 ring-primary/20 shadow-lg"
                  : tier === "pro"
                  ? "border-yellow-500/50"
                  : "border-border"
              } ${isCurrent ? "ring-2 ring-primary/30" : ""}`}
            >
              {/* Badges */}
              <div className="flex items-center gap-2">
                {isGrowth && (
                  <span className="absolute -top-3 left-4 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">
                    BEST VALUE
                  </span>
                )}
                {isCurrent && (
                  <span className={`absolute -top-3 ${isGrowth ? 'right-4' : 'left-4'} bg-foreground text-background text-[10px] font-bold px-3 py-1 rounded-full tracking-wide`}>
                    YOUR PLAN
                  </span>
                )}
              </div>

              {/* Plan header */}
              <div className="flex items-start justify-between pt-1">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
                    tier === "pro" ? "bg-yellow-500/10 text-yellow-600" : tier === "growth" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {tier === "starter" ? "Get started for free" : tier === "growth" ? "Grow your farm business" : "Maximum reach & tools"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-2xl font-bold text-foreground">{getPrice(tier)}</span>
                    {plan.price > 0 && <span className="text-xs text-muted-foreground">/mo</span>}
                  </div>
                  {billing === "annual" && savings && (
                    <p className="text-[10px] font-semibold text-primary">
                      Save ${savings}/mo
                    </p>
                  )}
                  {billing === "annual" && plan.price > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      ${plan.annualPrice * 12}/year
                    </p>
                  )}
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2 pt-1">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      tier === "pro" ? "bg-yellow-500/10" : "bg-primary/10"
                    }`}>
                      <Check className={`w-2.5 h-2.5 ${tier === "pro" ? "text-yellow-600" : "text-primary"}`} />
                    </div>
                    <span className="text-xs text-foreground leading-relaxed">{f}</span>
                  </div>
                ))}
                {plan.limitations.map((l) => (
                  <div key={l} className="flex items-start gap-2.5">
                    <span className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 text-center text-[10px] mt-0.5">✕</span>
                    <span className="text-xs text-muted-foreground">{l}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {isUpgrade && (
                <Button
                  onClick={() => handleSubscribe(tier)}
                  disabled={!!loading}
                  className={`w-full rounded-lg h-12 font-semibold text-sm ${
                    tier === "pro"
                      ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                      : isGrowth
                      ? "bg-primary hover:bg-primary/90"
                      : ""
                  }`}
                >
                  {loading === tier ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {loading === tier ? "Processing..." : `Upgrade to ${plan.name}`}
                </Button>
              )}

              {isCurrent && tier === "starter" && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Upgrade to reach more customers</p>
                </div>
              )}

              {isCurrent && subscribed && (
                <Button
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={managingPortal}
                  className="w-full rounded-lg h-11 font-semibold gap-2"
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
          className="w-full text-xs text-muted-foreground"
        >
          Refresh subscription status
        </Button>
      </div>
    </MobileLayout>
  );
};

export default Plans;
