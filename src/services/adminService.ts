import { supabase } from "@/integrations/supabase/client";
import type { DashboardStats, Farmer, Subscription, Plan, SubscriptionStatus, AdminUser, AdminProduct, AdminInstafarmPost, CreateTestUserParams } from "@/types/admin";

const invoke = async <T>(action: string, params: Record<string, unknown> = {}): Promise<T> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Your admin session has expired. Please log in again.");
  }

  const { data, error } = await supabase.functions.invoke("admin", {
    body: { action, ...params },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    // Parse the error message for user-friendly messages
    const msg = error.message || "An unknown error occurred";
    if (msg.includes("401") || msg.includes("authentication") || msg.includes("session")) {
      throw new Error("Your admin session has expired. Please log in again.");
    }
    if (msg.includes("403") || msg.includes("not authorized")) {
      throw new Error("You are not authorized to perform this action.");
    }
    throw new Error(msg);
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  return data as T;
};

export const adminService = {
  getDashboardStats: () => invoke<DashboardStats>("get_dashboard_stats"),
  getFarmers: () => invoke<Farmer[]>("get_farmers"),
  promoteFarmer: (farmerId: string, plan: Plan) =>
    invoke<{ success: boolean }>("promote_farmer", { farmerId, plan }),
  getSubscriptions: () => invoke<Subscription[]>("get_subscriptions"),
  updateSubscription: (farmerId: string, plan: Plan, status: SubscriptionStatus = "active") =>
    invoke<{ success: boolean }>("update_subscription", { farmerId, plan, status }),
  verifyFarmer: (farmerId: string, verified: boolean) =>
    invoke<{ success: boolean }>("verify_farmer", { farmerId, verified }),

  // Users Management
  getUsers: () => invoke<AdminUser[]>("get_users"),
  changeUserRole: (userId: string, newRole: "farmer" | "customer") =>
    invoke<{ success: boolean }>("change_user_role", { userId, newRole }),
  toggleAdmin: (userId: string, makeAdmin: boolean) =>
    invoke<{ success: boolean }>("toggle_admin", { userId, makeAdmin }),
  banUser: (userId: string, ban: boolean) =>
    invoke<{ success: boolean }>("ban_user", { userId, ban }),

  // Test User Management
  createTestUser: (params: CreateTestUserParams) =>
    invoke<{ success: boolean; userId: string }>("create_test_user", params as unknown as Record<string, unknown>),
  deleteTestUser: (userId: string) =>
    invoke<{ success: boolean }>("delete_test_user", { userId }),

  // Products Management
  getAllProducts: () => invoke<AdminProduct[]>("get_all_products"),
  removeProduct: (productId: string) =>
    invoke<{ success: boolean }>("remove_product", { productId }),
  updateProductStatus: (productId: string, status: string) =>
    invoke<{ success: boolean }>("update_product_status", { productId, status }),

  // Content Moderation
  getAllInstafarmPosts: () => invoke<AdminInstafarmPost[]>("get_all_instafarm_posts"),
  deleteInstafarmPost: (postId: string) =>
    invoke<{ success: boolean }>("delete_instafarm_post", { postId }),
};
