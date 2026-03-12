import { useState, useEffect } from "react";
import { Package, Crown } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PLAN_PRIORITY: Record<string, number> = { pro: 0, growth: 1, starter: 2 };

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  farmer_id: string;
  farmer: { name: string } | null;
  farmerPlan?: string;
  stock: number | null;
  unit: string;
}

const AllRecommended = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, price, images, farmer_id, stock, unit, farmer:profiles!products_farmer_id_fkey(name)")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (data) {
        const farmerIds = [...new Set(data.map((p) => p.farmer_id))];
        const { data: subs } = await supabase
          .from("farmer_subscriptions")
          .select("farmer_id, plan")
          .in("farmer_id", farmerIds);
        const planMap = new Map(subs?.map((s) => [s.farmer_id, s.plan]) || []);

        const enriched = data.map((p) => ({
          ...p,
          farmer: Array.isArray(p.farmer) ? p.farmer[0] : p.farmer,
          farmerPlan: planMap.get(p.farmer_id) || "starter",
        }));

        enriched.sort((a, b) => {
          const pa = PLAN_PRIORITY[a.farmerPlan || "starter"] ?? 2;
          const pb = PLAN_PRIORITY[b.farmerPlan || "starter"] ?? 2;
          return pa - pb;
        });

        setProducts(enriched);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleClick = async (product: Product) => {
    if (user) {
      supabase.from("analytics_events").insert({
        farmer_id: product.farmer_id,
        event_type: "listing_click",
        reference_id: product.id,
      });
    }
    navigate(`/product/${product.id}`);
  };

  return (
    <MobileLayout>
      <PageHeader title="Recommended" />
      <div className="flex-1 pb-20 overflow-y-auto space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-2.5 animate-pulse">
              <div className="w-14 h-14 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No products found</p>
          </div>
        ) : (
          products.map((product) => (
            <button
              key={product.id}
              onClick={() => handleClick(product)}
              className="flex items-center gap-2.5 w-full rounded-xl border border-border bg-card p-2.5 text-left hover:shadow-md transition-shadow"
            >
              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0 relative">
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-5 h-5 text-muted-foreground/30" />
                )}
                {product.farmerPlan === "pro" && (
                  <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-yellow-500 flex items-center justify-center">
                    <Crown className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold text-foreground truncate">{product.title}</h3>
                <p className="text-[10px] text-muted-foreground">{product.stock ?? 0} {product.unit}s • by {product.farmer?.name || "Unknown"}</p>
                <span className="text-xs font-bold text-primary">${product.price.toFixed(2)}</span>
              </div>
            </button>
          ))
        )}
      </div>
      <BottomNav />
    </MobileLayout>
  );
};

export default AllRecommended;
