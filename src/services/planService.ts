export type Plan = "starter" | "growth" | "pro";

export const PLAN_PRIORITY: Record<Plan, number> = { pro: 0, growth: 1, starter: 2 };

export const PLAN_CONFIG: Record<Plan, { name: string; listingLimit: number | null }> = {
  starter: { name: "Starter", listingLimit: 3 },
  growth: { name: "Growth", listingLimit: 20 },
  pro: { name: "Pro Farmer", listingLimit: null },
};

export const FEATURE_ACCESS: Record<string, Plan[]> = {
  analytics: ["growth", "pro"],
  featured_badge: ["pro"],
  farm_story: ["growth", "pro"],
  farm_banner: ["pro"],
  favorites: ["growth", "pro"],
};

export function getPlanBadge(plan: string): { label: string; color: string } | null {
  if (plan === "pro") return { label: "Pro", color: "bg-yellow-500 text-white" };
  if (plan === "growth") return { label: "Growth", color: "bg-primary text-primary-foreground" };
  return null;
}
