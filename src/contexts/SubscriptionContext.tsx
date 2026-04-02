import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type PlanTier = "starter" | "growth" | "pro";

export type BillingInterval = "monthly" | "annual";

export const PLANS = {
  starter: {
    name: "Starter",
    price: 0,
    annualPrice: 0,
    listingLimit: 3 as number | null,
    features: ["Up to 3 active listings", "1 photo per listing", "Basic farmer profile", "Visible in search", "Customer messaging", "Farm location map"],
    limitations: ["No analytics", "No featured placement", "No promoted listings"],
  },
  growth: {
    name: "Growth",
    price: 12,
    annualPrice: 9,
    priceId: "price_1T8miqCsFOwH9CIqJHpjiL2o",
    annualPriceId: "price_1THkEJCsFOwH9CIqnl7ADGN3",
    productId: "prod_U70kdowQgNhm1Q",
    annualProductId: "prod_UGGlYMMmgvNhPH",
    listingLimit: 20 as number | null,
    features: ["Up to 20 active listings", "Up to 3 photos per listing", "Enhanced farmer profile", "Farm story section", "Basic analytics", "Higher search ranking", "Customers can favorite products"],
    limitations: [],
  },
  pro: {
    name: "Pro Farmer",
    price: 29,
    annualPrice: 25,
    priceId: "price_1T8mjBCsFOwH9CIqdEB6GVzZ",
    annualPriceId: "price_1THkF3CsFOwH9CIq01ygPzTW",
    productId: "prod_U70kEspnycdHnj",
    annualProductId: "prod_UGGmDQhtv8bzwh",
    listingLimit: null as number | null,
    features: ["Unlimited listings", "Up to 6 photos per listing", "Featured farmer badge", "Top search ranking", "Full analytics dashboard", "Featured in promotions", "Early access to new features"],
    limitations: [],
  },
} as const;

interface SubscriptionState {
  plan: PlanTier;
  subscribed: boolean;
  subscriptionEnd: string | null;
  isLoading: boolean;
  listingLimit: number | null;
  postLimit: number | null;
  canCreateListing: (currentCount: number) => boolean;
  canCreatePost: (currentMonthCount: number) => boolean;
  canTagProducts: boolean;
  hasFeature: (feature: "analytics" | "featured_badge" | "farm_story" | "favorites") => boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionState>({} as SubscriptionState);

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user, session, isLoading: authLoading } = useAuth();
  const [plan, setPlan] = useState<PlanTier>("starter");
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSubscription = useCallback(async () => {
    // Wait for auth to finish loading before resolving subscription
    if (authLoading) {
      console.log("[Subscription] Auth still loading, deferring resolution");
      return;
    }

    // No session → starter
    if (!session) {
      console.log("[Subscription] No session, defaulting to starter");
      setPlan("starter");
      setSubscribed(false);
      setSubscriptionEnd(null);
      setIsLoading(false);
      return;
    }

    // No profile yet → starter
    if (!user) {
      console.log("[Subscription] No user profile, defaulting to starter");
      setPlan("starter");
      setSubscribed(false);
      setSubscriptionEnd(null);
      setIsLoading(false);
      return;
    }

    // Not a farmer → starter
    if (user.role !== "farmer") {
      console.log("[Subscription] User is not a farmer, defaulting to starter");
      setPlan("starter");
      setSubscribed(false);
      setSubscriptionEnd(null);
      setIsLoading(false);
      return;
    }

    // Authenticated farmer → resolve subscription
    let resolved = false;

    // Strategy 1: Edge function
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");

      if (!error && data) {
        const resolvedPlan = (data.plan as PlanTier) || "starter";
        setPlan(resolvedPlan);
        setSubscribed(data.subscribed || false);
        setSubscriptionEnd(data.subscription_end || null);
        resolved = true;
        console.log("[Subscription] Resolved via edge function:", {
          userId: user.id,
          plan: resolvedPlan,
          listingLimit: resolvedPlan === "pro" ? null : PLANS[resolvedPlan].listingLimit,
          source: "edge-function",
        });
      } else if (error) {
        console.warn("[Subscription] Edge function failed:", error.message);
      }
    } catch (e: unknown) {
      console.warn("[Subscription] Edge function exception:", e instanceof Error ? e.message : e);
    }

    // Strategy 2: Direct DB fallback (only if edge function failed)
    if (!resolved) {
      try {
        const { data: sub, error } = await supabase
          .from("farmer_subscriptions")
          .select("plan, status, renewal_date")
          .eq("farmer_id", user.id)
          .maybeSingle();

        if (!error && sub) {
          const fallbackPlan = (sub.plan as PlanTier) || "starter";
          setPlan(fallbackPlan);
          setSubscribed(sub.status === "active");
          setSubscriptionEnd(sub.renewal_date || null);
          resolved = true;
          console.log("[Subscription] Resolved via DB fallback:", {
            userId: user.id,
            plan: fallbackPlan,
            listingLimit: fallbackPlan === "pro" ? null : PLANS[fallbackPlan].listingLimit,
            source: "db-fallback",
          });
        } else {
          console.warn("[Subscription] DB fallback failed:", error?.message);
        }
      } catch (e: unknown) {
        console.warn("[Subscription] DB fallback exception:", e instanceof Error ? e.message : e);
      }
    }

    // Only fall back to starter after both strategies have been attempted
    if (!resolved) {
      console.warn("[Subscription] All resolution strategies failed, defaulting to starter:", { userId: user.id });
      setPlan("starter");
      setSubscribed(false);
      setSubscriptionEnd(null);
    }

    setIsLoading(false);
  }, [authLoading, session, user]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  useEffect(() => {
    if (!session || user?.role !== "farmer") return;
    const interval = setInterval(refreshSubscription, 60000);
    return () => clearInterval(interval);
  }, [session, user, refreshSubscription]);

  const listingLimit: number | null = plan === "pro" ? null : (PLANS[plan].listingLimit ?? 3);
  const postLimit: number | null = plan === "pro" ? null : (plan === "growth" ? 20 : 3);
  const canTagProducts = plan === "growth" || plan === "pro";

  const canCreateListing = useCallback((currentCount: number) => {
    if (isLoading) return false;
    if (plan === "pro") return true;
    if (listingLimit === null) return true;
    return currentCount < listingLimit;
  }, [plan, listingLimit, isLoading]);

  const canCreatePost = useCallback((currentMonthCount: number) => {
    if (isLoading) return false;
    if (plan === "pro") return true;
    if (postLimit === null) return true;
    return currentMonthCount < postLimit;
  }, [plan, postLimit, isLoading]);

  const hasFeature = useCallback((feature: "analytics" | "featured_badge" | "farm_story" | "favorites") => {
    switch (feature) {
      case "analytics":
      case "farm_story":
      case "favorites":
        return plan === "growth" || plan === "pro";
      case "featured_badge":
        return plan === "pro";
      default:
        return false;
    }
  }, [plan]);

  return (
    <SubscriptionContext.Provider value={{ plan, subscribed, subscriptionEnd, isLoading, listingLimit, postLimit, canCreateListing, canCreatePost, canTagProducts, hasFeature, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
