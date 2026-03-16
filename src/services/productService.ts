import { supabase } from "@/integrations/supabase/client";
import { PLAN_PRIORITY } from "@/services/planService";

export interface EnrichedProduct {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  farmer_id: string;
  farmer: { name: string; latitude?: number | null; longitude?: number | null; verified?: boolean } | null;
  farmerPlan: string;
  category: string | null;
  stock: number | null;
  unit: string;
  created_at: string;
  distance?: number | null;
}

export { PLAN_PRIORITY };

export async function fetchEnrichedProducts(): Promise<EnrichedProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, title, price, images, farmer_id, category, stock, unit, created_at, farmer:profiles!products_farmer_id_fkey(name, latitude, longitude, verified)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error || !data) {
    throw new Error(error?.message || "Failed to fetch products");
  }

  const farmerIds = [...new Set(data.map(p => p.farmer_id))];
  const { data: subs } = await supabase
    .from("farmer_subscriptions")
    .select("farmer_id, plan")
    .in("farmer_id", farmerIds);

  const planMap = new Map(subs?.map(s => [s.farmer_id, s.plan]) || []);

  return data.map(p => ({
    ...p,
    farmer: Array.isArray(p.farmer) ? p.farmer[0] : p.farmer,
    farmerPlan: planMap.get(p.farmer_id) || "starter",
  }));
}

export function getNewestProducts(products: EnrichedProduct[], limit = 5): EnrichedProduct[] {
  return [...products].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
}

export function getRecommendedProducts(products: EnrichedProduct[], limit = 5): EnrichedProduct[] {
  return [...products].sort((a, b) => {
    const pa = PLAN_PRIORITY[a.farmerPlan as keyof typeof PLAN_PRIORITY] ?? 2;
    const pb = PLAN_PRIORITY[b.farmerPlan as keyof typeof PLAN_PRIORITY] ?? 2;
    return pa - pb;
  }).slice(0, limit);
}

export async function trackListingClick(farmerId: string, productId: string) {
  await supabase.from("analytics_events").insert({
    farmer_id: farmerId,
    event_type: "listing_click",
    reference_id: productId,
  });
}
