import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
    listingLimit: Infinity,
    features: ["Unlimited listings", "Featured farmer badge", "Top search ranking", "Full analytics dashboard", "Custom farm banner", "Featured in promotions", "Early access to new features"],
    limitations: [],
  },
} as const;

interface SubscriptionState {
  plan: PlanTier;
  subscribed: boolean;
  subscriptionEnd: string | null;
  isLoading: boolean;
  listingLimit: number;
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
    // If session exists but user profile hasn't loaded yet, keep loading
    if (!user) return;
    if (user.role !== "farmer") {
      setPlan("starter");
      setSubscribed(false);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      // Handle auth errors (401) - session expired or invalid
      if (error && error.message?.includes("Session expired")) {
        console.log("Subscription check: Session expired, falling back to local data");
        const { data: sub } = await supabase
          .from("farmer_subscriptions")
          .select("plan")
          .eq("farmer_id", user!.id)
          .maybeSingle();
        setPlan((sub?.plan as PlanTier) || "starter");
        setSubscribed(false);
        setIsLoading(false);
        return;
      }
      
      // Handle successful response
      if (!error && data) {
        setPlan((data.plan as PlanTier) || "starter");
        setSubscribed(data.subscribed || false);
        setSubscriptionEnd(data.subscription_end || null);
      } else if (error) {
        // Other errors - fallback to local table
        console.error("Subscription check error:", error);
        const { data: sub } = await supabase
          .from("farmer_subscriptions")
          .select("plan")
          .eq("farmer_id", user!.id)
          .maybeSingle();
        setPlan((sub?.plan as PlanTier) || "starter");
      }
    } catch (err) {
      console.error("Subscription check exception:", err);
      // Fallback: read from local table
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

  // Refresh every 60 seconds
  useEffect(() => {
    if (!session || user?.role !== "farmer") return;
    const interval = setInterval(refreshSubscription, 60000);
    return () => clearInterval(interval);
  }, [session, user, refreshSubscription]);

  const listingLimit = PLANS[plan].listingLimit;

  const canCreateListing = (currentCount: number) => {
    if (plan === "pro") return true;
    return currentCount < PLANS[plan].listingLimit;
  };

  const hasFeature = (feature: "analytics" | "featured_badge" | "farm_story" | "farm_banner" | "favorites") => {
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
  };

  return (
    <SubscriptionContext.Provider value={{ plan, subscribed, subscriptionEnd, isLoading, listingLimit, canCreateListing, hasFeature, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
