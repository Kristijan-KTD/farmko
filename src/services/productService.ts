import { supabase } from "@/integrations/supabase/client";

export interface EnrichedProduct {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  farmer_id: string;
  farmer: { name: string } | null;
  farmerPlan: string;
  category: string | null;
  stock: number | null;
  unit: string;
  created_at: string;
}

export const PLAN_PRIORITY: Record<string, number> = { pro: 0, growth: 1, starter: 2 };

export async function fetchEnrichedProducts(): Promise<EnrichedProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, title, price, images, farmer_id, category, stock, unit, created_at, farmer:profiles!products_farmer_id_fkey(name)")
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

export async function trackListingClick(farmerId: string, productId: string) {
  await supabase.from("analytics_events").insert({
    farmer_id: farmerId,
    event_type: "listing_click",
    reference_id: productId,
  });
}
