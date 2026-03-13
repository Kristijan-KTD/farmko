export type Plan = "starter" | "growth" | "pro";
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "past_due" | "trialing";

export interface DashboardStats {
  totalFarmers: number;
  totalCustomers: number;
  totalProducts: number;
  planCounts: {
    starter: number;
    growth: number;
    pro: number;
  };
}

export interface FarmerSubscription {
  plan: Plan;
  status: SubscriptionStatus;
}

export interface Farmer {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  location: string | null;
  created_at: string;
  subscription: FarmerSubscription;
  productCount: number;
}

export interface Subscription {
  id: string;
  farmer_id: string;
  plan: Plan;
  status: SubscriptionStatus;
  stripe_subscription_id: string | null;
  renewal_date: string | null;
  created_at: string;
  farmer: {
    id: string;
    name: string;
    email: string | null;
    avatar_url: string | null;
  } | null;
}
