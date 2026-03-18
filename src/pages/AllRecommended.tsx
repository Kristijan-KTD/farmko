import { useState, useEffect } from "react";
import { Package, Crown } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchEnrichedProducts, trackListingClick, PLAN_PRIORITY, type EnrichedProduct } from "@/services/productService";
import { toast } from "@/hooks/use-toast";

const AllRecommended = () => {
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchEnrichedProducts();
        data.sort((a, b) => {
          const pa = PLAN_PRIORITY[a.farmerPlan] ?? 2;
          const pb = PLAN_PRIORITY[b.farmerPlan] ?? 2;
          return pa - pb;
        });
        if (mounted) setProducts(data);
      } catch {
        if (mounted) toast({ title: "Failed to load products", variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const handleClick = (product: EnrichedProduct) => {
    if (user) trackListingClick(product.farmer_id, product.id);
    navigate(`/product/${product.id}`);
  };

  return (
    <MobileLayout>
      <PageHeader title="Recommended" />
      <div className="flex-1 pb-20 overflow-y-auto space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-md border border-border bg-card p-2.5 animate-pulse">
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
              className="flex items-center gap-2.5 w-full rounded-md border border-border bg-card p-2.5 text-left hover:shadow-md transition-shadow"
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
