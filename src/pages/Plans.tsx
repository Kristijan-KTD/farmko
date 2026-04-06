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

const planDescriptions: Record<PlanTier, string> = {
  starter: "Get started for free",
  growth: "Grow your farm business",
  pro: "Maximum reach & tools",
};

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
      <PageHeader title="Plans" />

      <div className="flex-1 pb-8 px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 pt-2">
          <h1 className="text-2xl font-bold text-foreground">Pick your plan</h1>
          <p className="text-sm text-muted-foreground">Choose the plan that fits your farm</p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-1 p-1 rounded-xl bg-muted max-w-xs mx-auto">
          <button
            onClick={() => setBilling("monthly")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
              billing === "monthly"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
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

        {/* Plan columns — horizontal on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier) => {
            const plan = PLANS[tier];
            const Icon = planIcons[tier];
            const isCurrent = tier === currentPlan;
            const isUpgrade = tiers.indexOf(tier) > tiers.indexOf(currentPlan);
            const isDowngrade = tiers.indexOf(tier) < tiers.indexOf(currentPlan);
            const savings = billing === "annual" ? getMonthlySavings(tier) : null;
            const isGrowth = tier === "growth";

            return (
              <div
                key={tier}
                className={`rounded-xl border bg-card flex flex-col relative transition-all ${
                  isGrowth
                    ? "border-primary ring-1 ring-primary/20"
                    : "border-border"
                } ${isCurrent ? "ring-1 ring-primary/30" : ""}`}
              >
                {/* Badges */}
                <div className="relative h-0">
                  {isGrowth && (
                    <span className="absolute -top-3 left-4 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full tracking-wide z-10">
                      BEST VALUE
                    </span>
                  )}
                  {isCurrent && (
                    <span className={`absolute -top-3 ${isGrowth ? 'right-4' : 'left-4'} bg-foreground text-background text-[10px] font-bold px-3 py-1 rounded-full tracking-wide z-10`}>
                      YOUR PLAN
                    </span>
                  )}
                </div>

                {/* Plan header */}
                <div className="p-5 pb-0 pt-6 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      tier === "pro" ? "bg-yellow-500/10 text-yellow-600" : tier === "growth" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{planDescriptions[tier]}</p>
                </div>

                {/* Pricing */}
                <div className="px-5 py-4 border-b border-border">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-3xl font-bold text-foreground">{getPrice(tier)}</span>
                    {plan.price > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
                  </div>
                  {billing === "annual" && savings && (
                    <p className="text-xs font-semibold text-primary mt-1">Save ${savings}/mo</p>
                  )}
                  {billing === "annual" && plan.price > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      ${plan.annualPrice * 12} billed annually
                    </p>
                  )}
                  {plan.price === 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">No credit card required</p>
                  )}
                </div>

                {/* CTA — always visible */}
                <div className="px-5 pt-4">
                  {isCurrent && !subscribed && (
                    <Button variant="outline" disabled className="w-full rounded-lg h-11 font-semibold">
                      Current Plan
                    </Button>
                  )}
                  {isCurrent && subscribed && (
                    <Button
                      variant="outline"
                      onClick={handleManageSubscription}
                      disabled={managingPortal}
                      className="w-full rounded-lg h-11 font-semibold gap-2"
                    >
                      {managingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                      Manage Plan
                    </Button>
                  )}
                  {isUpgrade && (
                    <Button
                      onClick={() => handleSubscribe(tier)}
                      disabled={!!loading}
                      className={`w-full rounded-lg h-11 font-semibold ${
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
                  {isDowngrade && !isCurrent && (
                    <Button variant="outline" disabled className="w-full rounded-lg h-11 font-semibold text-muted-foreground">
                      Included in your plan
                    </Button>
                  )}
                </div>

                {/* Features */}
                <div className="p-5 pt-4 space-y-2.5 flex-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {tier === "starter" ? "Includes:" : tier === "growth" ? "Everything in Starter, plus:" : "Everything in Growth, plus:"}
                  </p>
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                        tier === "pro" ? "text-yellow-600" : "text-primary"
                      }`} />
                      <span className="text-xs text-foreground leading-relaxed">{f}</span>
                    </div>
                  ))}
                  {plan.limitations.map((l) => (
                    <div key={l} className="flex items-start gap-2">
                      <span className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0 text-center text-[10px] mt-0.5">✕</span>
                      <span className="text-xs text-muted-foreground">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

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
