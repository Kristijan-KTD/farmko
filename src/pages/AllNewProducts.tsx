import { useState, useEffect } from "react";
import { Package, Crown } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchEnrichedProducts, trackListingClick, type EnrichedProduct } from "@/services/productService";
import { toast } from "@/hooks/use-toast";

const AllNewProducts = () => {
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchEnrichedProducts();
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
      <PageHeader title="New Products" />
      <div className="flex-1 pb-20 overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-md border border-border bg-card overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-muted" />
                <div className="p-2 space-y-1.5">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => handleClick(product)}
                className="flex flex-col rounded-md border border-border bg-card overflow-hidden text-left hover:shadow-md transition-shadow"
              >
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  {product.farmerPlan === "pro" && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center">
                      <Crown className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="p-2 space-y-0">
                  <h3 className="text-xs font-semibold text-foreground truncate">{product.title}</h3>
                  <p className="text-[10px] text-muted-foreground">{product.stock ?? 0} {product.unit}s</p>
                  <span className="text-xs font-bold text-primary block">${product.price.toFixed(2)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </MobileLayout>
  );
};

export default AllNewProducts;
