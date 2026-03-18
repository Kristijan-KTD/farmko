import { useState, useEffect } from "react";
import { Heart, Package, Loader2, AlertTriangle, Trash2, CheckCircle } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getPlanBadge } from "@/services/planService";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface FavoriteProduct {
  favoriteId: string;
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  unit: string;
  farmer_id: string;
  farmerName: string;
  farmerPlan: string;
  farmerVerified: boolean;
}

const Favorites = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const load = async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from("favorites")
          .select("id, listing_id, product:products!favorites_listing_id_fkey(id, title, price, images, unit, farmer_id, farmer:profiles!products_farmer_id_fkey(name, verified))")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (fetchErr) throw fetchErr;
        if (!mounted) return;

        const farmerIds = [...new Set((data || []).map((d: any) => {
          const prod = Array.isArray(d.product) ? d.product[0] : d.product;
          return prod?.farmer_id;
        }).filter(Boolean))];

        const { data: subs } = await supabase
          .from("farmer_subscriptions")
          .select("farmer_id, plan")
          .in("farmer_id", farmerIds);

        const planMap = new Map(subs?.map(s => [s.farmer_id, s.plan]) || []);

        const enriched: FavoriteProduct[] = (data || [])
          .map((d: any) => {
            const prod = Array.isArray(d.product) ? d.product[0] : d.product;
            if (!prod) return null;
            const farmer = Array.isArray(prod.farmer) ? prod.farmer[0] : prod.farmer;
            return {
              favoriteId: d.id,
              id: prod.id,
              title: prod.title,
              price: prod.price,
              images: prod.images,
              unit: prod.unit,
              farmer_id: prod.farmer_id,
              farmerName: farmer?.name || "Unknown",
              farmerPlan: planMap.get(prod.farmer_id) || "starter",
              farmerVerified: farmer?.verified || false,
            };
          })
          .filter(Boolean) as FavoriteProduct[];

        setProducts(enriched);
      } catch {
        if (mounted) {
          setError(true);
          toast({ title: "Failed to load favorites", variant: "destructive" });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [user]);

  const handleRemove = async (favoriteId: string) => {
    setProducts(prev => prev.filter(p => p.favoriteId !== favoriteId));
    const { error } = await supabase.from("favorites").delete().eq("id", favoriteId);
    if (error) {
      toast({ title: "Failed to remove favorite", variant: "destructive" });
    }
  };

  return (
    <MobileLayout>
      <PageHeader title="Saved Products" />

      <div className="flex-1 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-destructive/8 flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-destructive/60" />
            </div>
            <p className="text-foreground font-medium mb-1">Something went wrong</p>
            <p className="text-muted-foreground text-sm mb-4">Failed to load favorites</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="rounded-md">Retry</Button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Heart className="w-9 h-9 text-muted-foreground/30" />
            </div>
            <p className="text-foreground font-medium mb-1">No saved products</p>
            <p className="text-sm text-muted-foreground text-center max-w-[240px] mb-5">Browse the explore page and save products you're interested in.</p>
            <Button variant="outline" size="sm" onClick={() => navigate("/explore")} className="rounded-xl">
              Browse Products
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {products.map((product) => {
              const badge = getPlanBadge(product.farmerPlan);
              return (
                <div key={product.favoriteId} className="card-interactive flex items-center gap-3 p-3.5">
                  <button
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0"
                  >
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground/30" />
                    )}
                  </button>
                  <button onClick={() => navigate(`/product/${product.id}`)} className="flex-1 min-w-0 text-left">
                    <h3 className="text-sm font-semibold text-foreground truncate">{product.title}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[11px] text-muted-foreground truncate">{product.farmerName}</span>
                      {product.farmerVerified && <CheckCircle className="w-3 h-3 text-blue-500 shrink-0" />}
                      {badge && (
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-lg ${badge.color}`}>{badge.label}</span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-primary mt-0.5 block">${product.price.toFixed(2)}/{product.unit}</span>
                  </button>
                  <button
                    onClick={() => handleRemove(product.favoriteId)}
                    className="p-2.5 rounded-xl hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-destructive/50" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

export default Favorites;
