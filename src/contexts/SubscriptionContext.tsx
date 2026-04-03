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

interface ListingQuota {
  postedThisPeriod: number;
  limitPerPeriod: number | null;
  periodEnd: string | null;
}

interface SubscriptionState {
  plan: PlanTier;
  subscribed: boolean;
  subscriptionEnd: string | null;
  isLoading: boolean;
  listingLimit: number | null;
  postLimit: number | null;
  listingQuota: ListingQuota;
  canCreateListing: () => boolean;
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
  const [listingQuota, setListingQuota] = useState<ListingQuota>({
    postedThisPeriod: 0,
    limitPerPeriod: 3,
    periodEnd: null,
  });

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
    let quotaData: ListingQuota = { postedThisPeriod: 0, limitPerPeriod: 3, periodEnd: null };

    // Strategy 1: Edge function
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");

      if (!error && data) {
        const resolvedPlan = (data.plan as PlanTier) || "starter";
        setPlan(resolvedPlan);
        setSubscribed(data.subscribed || false);
        setSubscriptionEnd(data.subscription_end || null);
        resolved = true;
      } else if (error) {
        console.warn("[Subscription] Edge function failed:", error.message);
      }
    } catch (e: unknown) {
      console.warn("[Subscription] Edge function exception:", e instanceof Error ? e.message : e);
    }

    // Strategy 2: Direct DB fallback
    if (!resolved) {
      try {
        const { data: sub, error } = await supabase
          .from("farmer_subscriptions")
          .select("plan, status, renewal_date, listings_posted_this_period, listings_limit_per_period, period_end")
          .eq("farmer_id", user.id)
          .maybeSingle();

        if (!error && sub) {
          const fallbackPlan = (sub.plan as PlanTier) || "starter";
          setPlan(fallbackPlan);
          setSubscribed(sub.status === "active");
          setSubscriptionEnd(sub.renewal_date || null);
          resolved = true;
          quotaData = {
            postedThisPeriod: (sub as any).listings_posted_this_period ?? 0,
            limitPerPeriod: (sub as any).listings_limit_per_period ?? 3,
            periodEnd: (sub as any).period_end || null,
          };
        }
      } catch (e: unknown) {
        console.warn("[Subscription] DB fallback exception:", e instanceof Error ? e.message : e);
      }
    }

    // Always fetch quota from DB (edge function doesn't return it)
    try {
      const { data: sub } = await supabase
        .from("farmer_subscriptions")
        .select("listings_posted_this_period, listings_limit_per_period, period_end")
        .eq("farmer_id", user.id)
        .maybeSingle();
      if (sub) {
        quotaData = {
          postedThisPeriod: (sub as any).listings_posted_this_period ?? 0,
          limitPerPeriod: (sub as any).listings_limit_per_period ?? 3,
          periodEnd: (sub as any).period_end || null,
        };
      }
    } catch {}

    setListingQuota(quotaData);

    if (!resolved) {
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

  const listingLimit: number | null = listingQuota.limitPerPeriod;
  const postLimit: number | null = plan === "pro" ? null : (plan === "growth" ? 20 : 3);
  const canTagProducts = plan === "growth" || plan === "pro";

  const canCreateListing = useCallback(() => {
    if (isLoading) return false;
    if (listingQuota.limitPerPeriod === null) return true;
    return listingQuota.postedThisPeriod < listingQuota.limitPerPeriod;
  }, [listingQuota, isLoading]);

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
    <SubscriptionContext.Provider value={{ plan, subscribed, subscriptionEnd, isLoading, listingLimit, postLimit, listingQuota, canCreateListing, canCreatePost, canTagProducts, hasFeature, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
