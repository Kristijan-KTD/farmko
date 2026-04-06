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
    features: [
      "3 listings per month",
      "3 Instafarm posts per month",
      "Basic farmer profile",
      "Chat with customers",
      "Basic visibility in search",
      "Farm location on map",
    ],
    limitations: ["No analytics", "No product tagging", "No priority placement"],
  },
  growth: {
    name: "Growth",
    price: 9,
    annualPrice: 6,
    priceId: "price_1TJIFSCsFOwH9CIqDvEvESVH",
    annualPriceId: "price_1TJIFzCsFOwH9CIquXzuGRyP",
    productId: "prod_UHrz1RSt4wYPMv",
    annualProductId: "prod_UHrz0fvvCu2twD",
    listingLimit: 6 as number | null,
    features: [
      "6 listings per month",
      "6 Instafarm posts per month",
      "Higher visibility in Explore",
      "Product tagging in Instafarm",
      "Basic analytics dashboard",
      "Priority placement in Radar",
      "Customers can favorite products",
    ],
    limitations: [],
  },
  pro: {
    name: "Pro Farmer",
    price: 19,
    annualPrice: 16,
    priceId: "price_1TJIGKCsFOwH9CIqmESr1eCh",
    annualPriceId: "price_1TJIGgCsFOwH9CIqRNMwVSWN",
    productId: "prod_UHs0nhWKNv8QRW",
    annualProductId: "prod_UHs0kFNScwGIzd",
    listingLimit: null as number | null,
    features: [
      "Unlimited listings",
      "Unlimited Instafarm posts",
      "Top visibility in Explore + Radar",
      "Advanced analytics dashboard",
      "Verified farmer badge",
      "Featured farmer benefits",
      "Early access to new features",
    ],
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
    if (authLoading) return;
    if (!session) { setPlan("starter"); setSubscribed(false); setSubscriptionEnd(null); setIsLoading(false); return; }
    if (!user) { setPlan("starter"); setSubscribed(false); setSubscriptionEnd(null); setIsLoading(false); return; }
    if (user.role !== "farmer") { setPlan("starter"); setSubscribed(false); setSubscriptionEnd(null); setIsLoading(false); return; }

    let resolved = false;
    let quotaData: ListingQuota = { postedThisPeriod: 0, limitPerPeriod: 3, periodEnd: null };

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (!error && data) {
        const resolvedPlan = (data.plan as PlanTier) || "starter";
        setPlan(resolvedPlan);
        setSubscribed(data.subscribed || false);
        setSubscriptionEnd(data.subscription_end || null);
        resolved = true;
      }
    } catch (e: unknown) {
      console.warn("[Subscription] Edge function exception:", e instanceof Error ? e.message : e);
    }

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
            limitPerPeriod: (sub as any).listings_limit_per_period === null ? null : ((sub as any).listings_limit_per_period ?? 3),
            periodEnd: (sub as any).period_end || null,
          };
        }
      } catch (e: unknown) {
        console.warn("[Subscription] DB fallback exception:", e instanceof Error ? e.message : e);
      }
    }

    try {
      const { data: sub } = await supabase
        .from("farmer_subscriptions")
        .select("listings_posted_this_period, listings_limit_per_period, period_end")
        .eq("farmer_id", user.id)
        .maybeSingle();
      if (sub) {
        quotaData = {
          postedThisPeriod: (sub as any).listings_posted_this_period ?? 0,
          limitPerPeriod: (sub as any).listings_limit_per_period === null ? null : ((sub as any).listings_limit_per_period ?? 3),
          periodEnd: (sub as any).period_end || null,
        };
      }
    } catch {}

    setListingQuota(quotaData);
    if (!resolved) { setPlan("starter"); setSubscribed(false); setSubscriptionEnd(null); }
    setIsLoading(false);
  }, [authLoading, session, user]);

  useEffect(() => { refreshSubscription(); }, [refreshSubscription]);

  useEffect(() => {
    if (!session || user?.role !== "farmer") return;
    const interval = setInterval(refreshSubscription, 60000);
    return () => clearInterval(interval);
  }, [session, user, refreshSubscription]);

  const listingLimit: number | null = listingQuota.limitPerPeriod;
  const postLimit: number | null = plan === "pro" ? null : (plan === "growth" ? 6 : 3);
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
      case "analytics": case "farm_story": case "favorites": return plan === "growth" || plan === "pro";
      case "featured_badge": return plan === "pro";
      default: return false;
    }
  }, [plan]);

  return (
    <SubscriptionContext.Provider value={{ plan, subscribed, subscriptionEnd, isLoading, listingLimit, postLimit, listingQuota, canCreateListing, canCreatePost, canTagProducts, hasFeature, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
