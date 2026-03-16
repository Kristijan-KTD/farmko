import { useState, useEffect } from "react";
import { Search, Package, Clock, Sparkles, AlertTriangle, MapPin, CheckCircle } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import HorizontalScroll from "@/components/HorizontalScroll";
import ExploreFilter, { type FilterState } from "@/components/explore/ExploreFilter";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchEnrichedProducts, getNewestProducts, getRecommendedProducts, trackListingClick, type EnrichedProduct } from "@/services/productService";
import { getPlanBadge } from "@/services/planService";
import { CATEGORIES } from "@/lib/categories";
import { haversineKm, formatDistance } from "@/lib/distance";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Explore = () => {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ category: null, sortBy: "newest", distance: null });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // silent fail
      );
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchEnrichedProducts();
        if (mounted) {
          // Enrich with distance
          if (userLocation) {
            data.forEach(p => {
              if (p.farmer?.latitude && p.farmer?.longitude) {
                p.distance = haversineKm(userLocation.lat, userLocation.lng, p.farmer.latitude, p.farmer.longitude);
              }
            });
          }
          setProducts(data);
        }
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
  }, [userLocation]);

  const activeCategory = selectedCategory || filters.category;

  const filtered = products.filter(p => {
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.farmer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !activeCategory || p.category === activeCategory;
    const matchesDistance = !filters.distance || !p.distance || p.distance <= filters.distance;
    return matchesSearch && matchesCategory && matchesDistance;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (filters.sortBy === "closest") {
      const da = a.distance ?? Infinity;
      const db = b.distance ?? Infinity;
      return da - db;
    }
    if (filters.sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const newProducts = getNewestProducts(sorted, 5);
  const recommended = getRecommendedProducts(filtered, 5);

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
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ExploreFilter filters={filters} onApply={f => { setFilters(f); if (f.category) setSelectedCategory(null); }} hasLocation={!!userLocation} />
      </div>

      <HorizontalScroll className="gap-2 mb-4 pb-1" snap={false}>
        {CATEGORIES.slice(0, 8).map(cat => {
          const isActive = activeCategory === (cat.key === "all" ? null : cat.key);
          const isAll = cat.key === "all" && !activeCategory;
          return (
            <button
              key={cat.key}
              onClick={() => { setSelectedCategory(cat.key === "all" ? null : cat.key); setFilters(f => ({ ...f, category: null })); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors ${isActive || isAll ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-accent"}`}
            >
              <cat.icon className="w-3 h-3" />
              {cat.label}
            </button>
          );
        })}
      </HorizontalScroll>

      <div className="flex-1 pb-20 space-y-5 overflow-y-auto overflow-x-hidden">
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="w-12 h-12 text-destructive/40 mb-3" />
            <p className="text-muted-foreground text-sm mb-3">Failed to load products</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="rounded-full">Retry</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No products found</p>
          </div>
        ) : (
          <>
            <section>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">New Products</h2>
                </div>
                {filtered.length > 5 && (
                  <button onClick={() => navigate("/explore/new")} className="text-xs font-semibold text-primary">See all</button>
                )}
              </div>
              <HorizontalScroll className="gap-3 pb-1">
                {newProducts.map(product => (
                  <ProductCard key={product.id} product={product} onClick={() => handleProductClick(product)} />
                ))}
              </HorizontalScroll>
            </section>

            <section>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Recommended</h2>
                </div>
                {filtered.length > 5 && (
                  <button onClick={() => navigate("/explore/recommended")} className="text-xs font-semibold text-primary">See all</button>
                )}
              </div>
              <div className="space-y-2">
                {recommended.map(product => (
                  <RecommendedCard key={product.id} product={product} onClick={() => handleProductClick(product)} />
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

const ProductCard = ({ product, onClick }: { product: EnrichedProduct; onClick: () => void }) => {
  const badge = getPlanBadge(product.farmerPlan);
  return (
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
        {badge && (
          <div className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${badge.color}`}>
            {badge.label}
          </div>
        )}
      </div>
      <div className="p-2 space-y-0.5">
        <h3 className="text-xs font-semibold text-foreground truncate">{product.title}</h3>
        <div className="flex items-center gap-1">
          <p className="text-[10px] text-muted-foreground truncate">
            {product.farmer?.name || "Unknown"}
          </p>
          {product.farmer?.verified && (
            <CheckCircle className="w-3 h-3 text-blue-500 shrink-0" />
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-primary">${product.price.toFixed(2)}</span>
          {product.distance != null && (
            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5" />
              {formatDistance(product.distance)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

const RecommendedCard = ({ product, onClick }: { product: EnrichedProduct; onClick: () => void }) => {
  const badge = getPlanBadge(product.farmerPlan);
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full rounded-xl border border-border bg-card p-2.5 text-left hover:shadow-md transition-shadow"
    >
      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-5 h-5 text-muted-foreground/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-semibold text-foreground truncate">{product.title}</h3>
          {badge && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badge.color}`}>{badge.label}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <p className="text-[10px] text-muted-foreground truncate">{product.stock ?? 0} {product.unit}s · by {product.farmer?.name || "Unknown"}</p>
          {product.farmer?.verified && <CheckCircle className="w-3 h-3 text-blue-500 shrink-0" />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary">${product.price.toFixed(2)}</span>
          {product.distance != null && (
            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5" />
              {formatDistance(product.distance)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

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
