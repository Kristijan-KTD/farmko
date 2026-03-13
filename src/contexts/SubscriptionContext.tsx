import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type PlanTier = "starter" | "growth" | "pro";

export const PLANS = {
  starter: {
    name: "Starter",
    price: 0,
    listingLimit: 3,
    features: ["Up to 3 active listings", "Basic farmer profile", "Photo uploads", "Visible in search", "Customer messaging", "Farm location map"],
    limitations: ["No analytics", "No featured placement", "No promoted listings"],
  },
  growth: {
    name: "Growth",
    price: 12,
    priceId: "price_1T8miqCsFOwH9CIqJHpjiL2o",
    productId: "prod_U70kdowQgNhm1Q",
    listingLimit: 20,
    features: ["Up to 20 active listings", "Enhanced farmer profile", "Farm story section", "Multiple photos per listing", "Basic analytics", "Higher search ranking", "Customers can favorite products"],
    limitations: [],
  },
  pro: {
    name: "Pro Farmer",
    price: 29,
    priceId: "price_1T8mjBCsFOwH9CIqdEB6GVzZ",
    productId: "prod_U70kEspnycdHnj",
    listingLimit: null as number | null,
    features: ["Unlimited listings", "Featured farmer badge", "Top search ranking", "Full analytics dashboard", "Custom farm banner", "Featured in promotions", "Early access to new features"],
    limitations: [],
  },
} as const;

interface SubscriptionState {
  plan: PlanTier;
  subscribed: boolean;
  subscriptionEnd: string | null;
  isLoading: boolean;
  listingLimit: number | null;
  canCreateListing: (currentCount: number) => boolean;
  hasFeature: (feature: "analytics" | "featured_badge" | "farm_story" | "farm_banner" | "favorites") => boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionState>({} as SubscriptionState);

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user, session } = useAuth();
  const [plan, setPlan] = useState<PlanTier>("starter");
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSubscription = useCallback(async () => {
    if (!session) {
      setPlan("starter");
      setSubscribed(false);
      setIsLoading(false);
      return;
    }
    if (!user) return;
    if (user.role !== "farmer") {
      setPlan("starter");
      setSubscribed(false);
      setIsLoading(false);
      return;
    }

    try {
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !currentSession) {
        console.log("[Subscription] Session no longer valid, resetting to starter");
        setPlan("starter");
        setSubscribed(false);
        setSubscriptionEnd(null);
        setIsLoading(false);
        return;
      }

      // Proactive token refresh if expiring soon
      const expiresAt = currentSession.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
      
      if (timeUntilExpiry < 300) {
        console.log("[Subscription] Token expiring soon, refreshing...");
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error("[Subscription] Failed to refresh session:", refreshError);
        }
      }

      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error && (error.message?.includes("Session expired") || error.message?.includes("Auth session missing"))) {
        console.log("[Subscription] Auth error, attempting retry after refresh");
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError && refreshData.session) {
          const { data: retryData, error: retryError } = await supabase.functions.invoke("check-subscription");
          if (!retryError && retryData) {
            const resolvedPlan = (retryData.plan as PlanTier) || "starter";
            setPlan(resolvedPlan);
            setSubscribed(retryData.subscribed || false);
            setSubscriptionEnd(retryData.subscription_end || null);
            console.log("[Subscription] Resolved after retry:", { plan: resolvedPlan, userId: user.id });
            setIsLoading(false);
            return;
          }
        }
        
        // Fallback to local data
        const { data: sub } = await supabase
          .from("farmer_subscriptions")
          .select("plan")
          .eq("farmer_id", user.id)
          .maybeSingle();
        const fallbackPlan = (sub?.plan as PlanTier) || "starter";
        setPlan(fallbackPlan);
        console.log("[Subscription] Fallback from local DB:", { plan: fallbackPlan, userId: user.id });
        setSubscribed(false);
        setIsLoading(false);
        return;
      }
      
      if (!error && data) {
        const resolvedPlan = (data.plan as PlanTier) || "starter";
        setPlan(resolvedPlan);
        setSubscribed(data.subscribed || false);
        setSubscriptionEnd(data.subscription_end || null);
        console.log("[Subscription] Resolved:", { plan: resolvedPlan, subscribed: data.subscribed, userId: user.id });
      } else if (error) {
        console.error("[Subscription] Check error:", error);
        const { data: sub } = await supabase
          .from("farmer_subscriptions")
          .select("plan")
          .eq("farmer_id", user.id)
          .maybeSingle();
        const fallbackPlan = (sub?.plan as PlanTier) || "starter";
        setPlan(fallbackPlan);
        console.log("[Subscription] Fallback from local DB:", { plan: fallbackPlan, userId: user.id });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Subscription] Exception:", msg);
      const { data: sub } = await supabase
        .from("farmer_subscriptions")
        .select("plan")
        .eq("farmer_id", user!.id)
        .maybeSingle();
      if (sub) setPlan(sub.plan as PlanTier);
    }
    setIsLoading(false);
  }, [session, user]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  useEffect(() => {
    if (!session || user?.role !== "farmer") return;
    const interval = setInterval(refreshSubscription, 60000);
    return () => clearInterval(interval);
  }, [session, user, refreshSubscription]);

  // Single source of truth for listing limit
  const listingLimit: number | null = plan === "pro" ? null : PLANS[plan].listingLimit;

  const canCreateListing = useCallback((currentCount: number) => {
    // Pro plan: always unlimited
    if (plan === "pro") return true;
    // If limit is null or Infinity, allow
    const limit = PLANS[plan].listingLimit;
    if (limit === null || limit === Infinity) return true;
    const result = currentCount < limit;
    console.log("[Subscription] canCreateListing:", { userId: user?.id, plan, listingLimit: limit, activeCount: currentCount, canCreate: result });
    return result;
  }, [plan, user?.id]);

  const hasFeature = useCallback((feature: "analytics" | "featured_badge" | "farm_story" | "farm_banner" | "favorites") => {
    switch (feature) {
      case "analytics":
        return plan === "growth" || plan === "pro";
      case "featured_badge":
      case "farm_banner":
        return plan === "pro";
      case "farm_story":
      case "favorites":
        return plan === "growth" || plan === "pro";
      default:
        return false;
    }
  }, [plan]);

  return (
    <SubscriptionContext.Provider value={{ plan, subscribed, subscriptionEnd, isLoading, listingLimit, canCreateListing, hasFeature, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
