export type Plan = "starter" | "growth" | "pro";
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "past_due" | "trialing";

export interface DashboardStats {
  totalFarmers: number;
  totalCustomers: number;
  totalProducts: number;
  activeChats: number;
  planCounts: {
    starter: number;
    growth: number;
    pro: number;
  };
  newUsersLast7Days: number;
  productsCreatedLast7Days: number;
  mostActiveFarmers: {
    id: string;
    name: string;
    avatar_url: string | null;
    productCount: number;
  }[];
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
  verified: boolean;
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

export interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  role: "farmer" | "customer";
  avatar_url: string | null;
  created_at: string;
  verified: boolean;
  plan: Plan | null;
  isAdmin: boolean;
  adminRole: string | null;
  is_test_account: boolean;
  created_by_admin: boolean;
}

export interface CreateTestUserParams {
  email: string;
  password: string;
  fullName: string;
  role: "farmer" | "customer";
  plan?: Plan;
  location?: string;
  isTestAccount?: boolean;
  avatarUrl?: string;
}

export interface AdminProduct {
  id: string;
  title: string;
  status: string;
  category: string | null;
  price: number;
  unit: string;
  images: string[] | null;
  created_at: string;
  farmer_id: string;
  farmer: { id?: string; name: string; avatar_url?: string | null };
}

export interface AdminInstafarmPost {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  farmer_id: string;
  product_id: string | null;
  farmer: { id?: string; name: string; avatar_url?: string | null };
  product: { id: string; title: string } | null;
}
