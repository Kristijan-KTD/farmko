import { supabase } from "@/integrations/supabase/client";
import type { DashboardStats, Farmer, Subscription, Plan, SubscriptionStatus } from "@/types/admin";

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
};
