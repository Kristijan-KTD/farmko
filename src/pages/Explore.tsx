import { useState, useEffect, useRef } from "react";
import { Search, Package, Crown, Clock, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import ExploreFilter, { type FilterState } from "@/components/explore/ExploreFilter";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const [filters, setFilters] = useState<FilterState>({ category: null, sortBy: "newest", distance: null });
  const navigate = useNavigate();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

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

        setProducts(data.map(p => ({
          ...p,
          farmer: Array.isArray(p.farmer) ? p.farmer[0] : p.farmer,
          farmerPlan: planMap.get(p.farmer_id) || "starter",
        })));
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const filtered = products.filter((p) => {
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.farmer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !filters.category || p.category === filters.category;
    return matchesSearch && matchesCategory;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (filters.sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const newProducts = sorted.slice(0, 5);

  const recommended = [...filtered].sort((a, b) => {
    const pa = PLAN_PRIORITY[a.farmerPlan || "starter"] ?? 2;
    const pb = PLAN_PRIORITY[b.farmerPlan || "starter"] ?? 2;
    return pa - pb;
  }).slice(0, 5);

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

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 160, behavior: "smooth" });
  };

  return (
    <MobileLayout>
      <PageHeader title="Explore" />

      {/* Search + Filter */}
      <div className="flex items-center gap-1.5 mb-2">
        <div className="flex-1 flex items-center gap-1.5 bg-secondary rounded-full px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search products or farmers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground min-w-0"
          />
        </div>
        <ExploreFilter filters={filters} onApply={setFilters} />
      </div>

      <div className="flex-1 pb-16 space-y-3 overflow-y-auto">
        {loading ? (
          <LoadingSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Package className="w-10 h-10 text-muted-foreground/30 mb-2" />
            <p className="text-muted-foreground text-xs">No products found</p>
          </div>
        ) : (
          <>
            {/* ── New Products ── */}
            <section>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-primary" />
                  <h2 className="text-xs font-bold text-foreground">New Products</h2>
                </div>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => scrollBy(-1)} className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
                    <ChevronLeft className="w-3 h-3 text-foreground" />
                  </button>
                  <button onClick={() => scrollBy(1)} className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
                    <ChevronRight className="w-3 h-3 text-foreground" />
                  </button>
                </div>
              </div>
              <div
                ref={scrollRef}
                className="flex overflow-x-auto gap-2 no-scrollbar snap-x snap-mandatory pb-0.5"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {newProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onClick={() => handleProductClick(product)} />
                ))}
                {filtered.length > 5 && (
                  <button
                    onClick={() => navigate("/explore/new")}
                    className="flex flex-col items-center justify-center flex-none w-[120px] snap-start rounded-lg border border-dashed border-border bg-card hover:bg-accent transition-colors"
                  >
                    <span className="text-[10px] font-semibold text-primary">Show more…</span>
                  </button>
                )}
              </div>
            </section>

            {/* ── Recommended ── */}
            <section>
              <div className="flex items-center gap-1 mb-1.5">
                <Sparkles className="w-3 h-3 text-primary" />
                <h2 className="text-xs font-bold text-foreground">Recommended</h2>
              </div>
              <div className="space-y-1.5">
                {recommended.map((product) => (
                  <RecommendedCard key={product.id} product={product} onClick={() => handleProductClick(product)} />
                ))}
                {filtered.length > 5 && (
                  <button
                    onClick={() => navigate("/explore/recommended")}
                    className="w-full py-2 rounded-lg border border-dashed border-border bg-card text-[10px] font-semibold text-primary hover:bg-accent transition-colors"
                  >
                    Show more…
                  </button>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

/* ── Sub-components ── */

const ProductCard = ({ product, onClick }: { product: Product; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex flex-col flex-none w-[140px] snap-start rounded-xl border border-border bg-card overflow-hidden text-left hover:shadow-md transition-shadow"
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
);

const RecommendedCard = ({ product, onClick }: { product: Product; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2.5 w-full rounded-xl border border-border bg-card p-2.5 text-left hover:shadow-md transition-shadow"
  >
    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0 relative">
      {product.images?.[0] ? (
        <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
      ) : (
        <Package className="w-5 h-5 text-muted-foreground/30" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-xs font-semibold text-foreground truncate">{product.title}</h3>
      <p className="text-[10px] text-muted-foreground">{product.stock ?? 0} {product.unit}s • by {product.farmer?.name || "Unknown"}</p>
      <span className="text-xs font-bold text-primary">${product.price.toFixed(2)}</span>
    </div>
  </button>
);

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-3">
      <div className="h-5 bg-muted rounded w-32" />
      <div className="flex gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="min-w-[140px] rounded-xl border border-border bg-card overflow-hidden animate-pulse">
            <div className="aspect-[4/3] bg-muted" />
            <div className="p-2 space-y-1.5">
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-5 bg-muted rounded w-36" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-2.5 animate-pulse">
          <div className="w-14 h-14 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Explore;
