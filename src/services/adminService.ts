import { supabase } from "@/integrations/supabase/client";
import type { DashboardStats, Farmer, Subscription, Plan, SubscriptionStatus, AdminUser, AdminProduct, AdminInstafarmPost } from "@/types/admin";

const invoke = async <T>(action: string, params: Record<string, unknown> = {}): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("admin", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
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
