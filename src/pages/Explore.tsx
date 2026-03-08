import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Package, Crown, Clock, Sparkles } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import HorizontalScroll from "@/components/HorizontalScroll";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES } from "@/lib/categories";
import { format } from "date-fns";

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  farmer_id: string;
  farmer: { name: string } | null;
  farmerPlan?: string;
  category: string | null;
  stock: number | null;
  unit: string;
  created_at: string;
}

const PLAN_PRIORITY: Record<string, number> = { pro: 0, growth: 1, starter: 2 };

const Explore = () => {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, price, images, farmer_id, category, stock, unit, created_at, farmer:profiles!products_farmer_id_fkey(name)")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (data) {
        const farmerIds = [...new Set(data.map(p => p.farmer_id))];
        const { data: subs } = await supabase
          .from("farmer_subscriptions")
          .select("farmer_id, plan")
          .in("farmer_id", farmerIds);

        const planMap = new Map(subs?.map(s => [s.farmer_id, s.plan]) || []);

        const enriched = data.map(p => ({
          ...p,
          farmer: Array.isArray(p.farmer) ? p.farmer[0] : p.farmer,
          farmerPlan: planMap.get(p.farmer_id) || "starter",
        }));

        setProducts(enriched);
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const filtered = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.farmer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // New products = latest 10
  const newProducts = filtered.slice(0, 10);

  // Recommended = sorted by plan priority
  const recommended = [...filtered].sort((a, b) => {
    const pa = PLAN_PRIORITY[a.farmerPlan || "starter"] ?? 2;
    const pb = PLAN_PRIORITY[b.farmerPlan || "starter"] ?? 2;
    return pa - pb;
  });

  const handleProductClick = async (product: Product) => {
    if (user) {
      supabase.from("analytics_events").insert({
        farmer_id: product.farmer_id,
        event_type: "listing_click",
        reference_id: product.id,
      });
    }
    navigate(`/product/${product.id}`);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MM.dd / h:mma");
    } catch {
      return "";
    }
  };

  return (
    <MobileLayout>
      <PageHeader title="Explore" />

      {/* Search */}
      <div className="flex items-center gap-2 bg-secondary rounded-full px-4 py-2.5 mb-5">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search products or farmers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex-1 pb-20 space-y-6">
        {/* ── Categories ── */}
        <section>
          <h2 className="text-base font-bold text-foreground mb-3">Categories</h2>
          <HorizontalScroll className="gap-3 pb-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(isActive ? null : cat.key)}
                  className={`flex flex-col items-center gap-1.5 min-w-[64px] transition-all ${
                    isActive ? "opacity-100" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors ${
                      isActive
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-card border-border text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`text-[11px] leading-tight text-center truncate w-full ${
                    isActive ? "font-semibold text-primary" : "text-muted-foreground"
                  }`}>
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </HorizontalScroll>
        </section>

        {loading ? (
          <LoadingSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">No products found</p>
          </div>
        ) : (
          <>
            {/* ── New Products ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">New products</h2>
              </div>
              <div className="flex gap-3 horizontal-scroll pb-2 lg:grid lg:grid-cols-4 xl:grid-cols-5 lg:overflow-visible lg:touch-auto">
                {newProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="flex flex-col min-w-[160px] lg:min-w-0 rounded-xl border border-border bg-card overflow-hidden text-left hover:shadow-md transition-shadow"
                  >
                    {/* Header with farmer info */}
                    <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase shrink-0">
                        {product.farmer?.name?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground truncate">{formatDate(product.created_at)}</p>
                        <p className="text-[10px] text-muted-foreground truncate">by {product.farmer?.name || "Unknown"}</p>
                      </div>
                    </div>
                    {/* Image */}
                    <div className="aspect-square bg-muted relative mx-2 rounded-lg overflow-hidden">
                      {product.images && product.images[0] ? (
                        <img src={product.images[0]} alt={product.title} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Package className="w-10 h-10 text-muted-foreground/30" />
                        </div>
                      )}
                      {product.farmerPlan === "pro" && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                          <Crown className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-3 space-y-0.5">
                      <h3 className="text-sm font-semibold text-foreground truncate">{product.title}</h3>
                      <p className="text-xs text-muted-foreground">{product.stock ?? 0} {product.unit}s total</p>
                      <span className="text-sm font-bold text-primary block pt-1">${product.price.toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* ── Recommended ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">Recommended</h2>
              </div>
              <div className="space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3 lg:space-y-0">
                {recommended.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="flex items-center gap-3 w-full rounded-xl border border-border bg-card p-3 text-left hover:shadow-md transition-shadow"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {product.images && product.images[0] ? (
                        <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-muted-foreground/30" />
                      )}
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{product.title}</h3>
                      <p className="text-xs text-muted-foreground">{product.stock ?? 0} {product.unit}s</p>
                      <span className="text-sm font-bold text-primary">${product.price.toFixed(2)}</span>
                    </div>
                    {/* Date */}
                    <span className="text-[10px] text-muted-foreground shrink-0 self-end">
                      {formatDate(product.created_at)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-3">
      <div className="h-5 bg-muted rounded w-32" />
      <div className="flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="min-w-[160px] rounded-xl border border-border bg-card overflow-hidden animate-pulse">
            <div className="p-3 flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-muted" /><div className="h-3 bg-muted rounded w-20" /></div>
            <div className="aspect-[4/3] bg-muted mx-2 rounded-lg" />
            <div className="p-3 space-y-2"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /></div>
          </div>
        ))}
      </div>
    </div>
    <div className="space-y-3">
      <div className="h-5 bg-muted rounded w-36" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 animate-pulse">
          <div className="w-16 h-16 rounded-xl bg-muted" />
          <div className="flex-1 space-y-2"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /></div>
        </div>
      ))}
    </div>
  </div>
);

export default Explore;
