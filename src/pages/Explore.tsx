import { useState, useEffect } from "react";
import { Search, Package, Crown, Clock, Sparkles } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import HorizontalScroll from "@/components/HorizontalScroll";
import ExploreFilter, { type FilterState } from "@/components/explore/ExploreFilter";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchEnrichedProducts, trackListingClick, PLAN_PRIORITY, type EnrichedProduct } from "@/services/productService";
import { toast } from "@/hooks/use-toast";

const Explore = () => {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ category: null, sortBy: "newest", distance: null });
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchEnrichedProducts();
        if (mounted) setProducts(data);
      } catch {
        if (mounted) {
          setError(true);
          toast({ title: "Failed to load products", variant: "destructive" });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
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

  const handleProductClick = async (product: EnrichedProduct) => {
    if (user) trackListingClick(product.farmer_id, product.id);
    navigate(`/product/${product.id}`);
  };

  return (
    <MobileLayout>
      <PageHeader title="Explore" />

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 min-w-0 flex items-center gap-2 bg-secondary rounded-full px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search products or farmers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ExploreFilter filters={filters} onApply={setFilters} />
      </div>

      <div className="flex-1 pb-20 space-y-4 overflow-y-auto overflow-x-hidden">
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm mb-3">Failed to load products</p>
            <button onClick={() => window.location.reload()} className="text-xs font-semibold text-primary">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No products found</p>
          </div>
        ) : (
          <>
            {/* New Products */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">New Products</h2>
                </div>
              </div>
              <HorizontalScroll className="gap-3 pb-1">
                {newProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onClick={() => handleProductClick(product)} />
                ))}
                {filtered.length > 5 && (
                  <button
                    onClick={() => navigate("/explore/new")}
                    className="flex flex-col items-center justify-center shrink-0 w-[160px] min-w-[160px] snap-start rounded-xl border border-dashed border-border bg-card hover:bg-accent transition-colors"
                  >
                    <span className="text-xs font-semibold text-primary">Show more…</span>
                  </button>
                )}
              </HorizontalScroll>
            </section>

            {/* Recommended */}
            <section>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Recommended</h2>
              </div>
              <div className="space-y-2">
                {recommended.map((product) => (
                  <RecommendedCard key={product.id} product={product} onClick={() => handleProductClick(product)} />
                ))}
                {filtered.length > 5 && (
                  <button
                    onClick={() => navigate("/explore/recommended")}
                    className="w-full py-2.5 rounded-xl border border-dashed border-border bg-card text-xs font-semibold text-primary hover:bg-accent transition-colors"
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

const ProductCard = ({ product, onClick }: { product: EnrichedProduct; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex flex-col shrink-0 w-[160px] min-w-[160px] snap-start rounded-xl border border-border bg-card overflow-hidden text-left hover:shadow-md transition-shadow"
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

const RecommendedCard = ({ product, onClick }: { product: EnrichedProduct; onClick: () => void }) => (
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
      <p className="text-[10px] text-muted-foreground truncate">{product.stock ?? 0} {product.unit}s • by {product.farmer?.name || "Unknown"}</p>
      <span className="text-xs font-bold text-primary">${product.price.toFixed(2)}</span>
    </div>
  </button>
);

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="space-y-2">
      <div className="h-5 bg-muted rounded w-32" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="shrink-0 w-[160px] rounded-xl border border-border bg-card overflow-hidden animate-pulse">
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
          <div className="w-14 h-14 rounded-lg bg-muted shrink-0" />
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
