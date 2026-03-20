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

const Explore = () => {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ category: null, sortBy: "newest", distance: null });
  const [userLocation, setUserLocation] = useState<{lat: number;lng: number;} | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchEnrichedProducts();
        if (mounted) {
          if (userLocation) {
            data.forEach((p) => {
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
    return () => {mounted = false;};
  }, [userLocation]);

  const activeCategory = selectedCategory || filters.category;

  const filtered = products.filter((p) => {
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.farmer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !activeCategory || p.category === activeCategory;
    const matchesDistance = !filters.distance || !p.distance || p.distance <= filters.distance;
    return matchesSearch && matchesCategory && matchesDistance;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (filters.sortBy === "closest") return (a.distance ?? Infinity) - (b.distance ?? Infinity);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const nearbyProducts = userLocation ?
  [...filtered].filter((p) => p.distance != null).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)).slice(0, 5) :
  [];
  const newProducts = getNewestProducts(sorted, 5);
  const recommended = getRecommendedProducts(filtered, 5);

  const handleProductClick = async (product: EnrichedProduct) => {
    if (user) trackListingClick(product.farmer_id, product.id);
    navigate(`/product/${product.id}`);
  };

  return (
    <MobileLayout>
      <PageHeader title="Explore" />

      {/* Search */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex-1 min-w-0 flex items-center gap-2.5 bg-secondary rounded-md px-4 py-2.5 border border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search products or farmers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          
        </div>
        <ExploreFilter filters={filters} onApply={(f) => {setFilters(f);if (f.category) setSelectedCategory(null);}} hasLocation={!!userLocation} />
      </div>

      {/* Category Chips */}
      <HorizontalScroll className="gap-2 mb-5 pb-1" snap={false}>
        {CATEGORIES.slice(0, 8).map((cat) => {
          const isActive = activeCategory === (cat.key === "all" ? null : cat.key);
          const isAll = cat.key === "all" && !activeCategory;
          return (
            <button
              key={cat.key}
              onClick={() => {setSelectedCategory(cat.key === "all" ? null : cat.key);setFilters((f) => ({ ...f, category: null }));}}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium shrink-0 transition-all duration-200 ${
              isActive || isAll ?
              "bg-primary text-primary-foreground shadow-sm" :
              "bg-card text-muted-foreground border border-border hover:border-primary/30"}`
              }>
              
              <cat.icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>);

        })}
      </HorizontalScroll>

      <div className="flex-1 pb-20 section-gap overflow-y-auto overflow-x-hidden">
        {loading ?
        <LoadingSkeleton /> :
        error ?
        <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-destructive/8 flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-destructive/60" />
            </div>
            <p className="text-foreground font-medium mb-1">Something went wrong</p>
            <p className="text-muted-foreground text-sm mb-4">Failed to load products</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="rounded-md">Retry</Button>
          </div> :
        filtered.length === 0 ?
        <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <p className="text-foreground font-medium mb-1">No products found</p>
            <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
          </div> :

        <>
            {/* Nearby Products */}
            {nearbyProducts.length > 0 &&
          <section>
                <div className="flex items-center gap-2 mb-3.5">
                   <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h2 className="text-sm font-bold text-foreground">Nearby Products</h2>
                </div>
                <HorizontalScroll className="gap-3 pb-1">
                  {nearbyProducts.map((product) =>
              <ProductCard key={`nearby-${product.id}`} product={product} onClick={() => handleProductClick(product)} />
              )}
                </HorizontalScroll>
              </section>
          }

            {/* New Products */}
            <section>
               <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h2 className="text-sm font-bold text-foreground">New Products</h2>
                </div>
                {filtered.length > 5 &&
              <button onClick={() => navigate("/explore/new")} className="text-xs font-semibold text-primary">See all</button>
              }
              </div>
              <HorizontalScroll className="gap-3 pb-1">
                {newProducts.map((product) =>
              <ProductCard key={product.id} product={product} onClick={() => handleProductClick(product)} />
              )}
              </HorizontalScroll>
            </section>

            {/* Recommended */}
            <section>
               <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h2 className="text-sm font-bold text-foreground">Recommended</h2>
                </div>
                {filtered.length > 5 &&
              <button onClick={() => navigate("/explore/recommended")} className="text-xs font-semibold text-primary">See all</button>
              }
              </div>
              <div className="space-y-2.5">
                {recommended.map((product) =>
              <RecommendedCard key={product.id} product={product} onClick={() => handleProductClick(product)} />
              )}
              </div>
            </section>
          </>
        }
      </div>

      <BottomNav />
    </MobileLayout>);

};

const ProductCard = ({ product, onClick }: {product: EnrichedProduct;onClick: () => void;}) => {
  const badge = getPlanBadge(product.farmerPlan);
  return (
    <button
      onClick={onClick}
      className="card-interactive flex flex-col shrink-0 w-[160px] min-w-[160px] snap-start overflow-hidden text-left">
      
      <div className="aspect-[4/3] bg-muted relative overflow-hidden rounded-t-lg">
        {product.images?.[0] ?
        <img src={product.images[0]} alt={product.title} className="absolute inset-0 w-full h-full object-cover" /> :

        <div className="absolute inset-0 flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground/20" />
          </div>
        }
        {badge &&
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[9px] font-bold ${badge.color}`}>
            {badge.label}
          </div>
        }
      </div>
      <div className="p-3 space-y-1">
        <h3 className="text-xs font-semibold text-foreground truncate">{product.title}</h3>
        <div className="flex items-center gap-1">
          <p className="text-[10px] text-muted-foreground truncate">{product.farmer?.name || "Unknown"}</p>
          {product.farmer?.verified && <CheckCircle className="w-3 h-3 text-blue-500 shrink-0" />}
        </div>
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-xs font-bold text-primary">${product.price.toFixed(2)}</span>
          {product.distance != null &&
          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5" />
              {formatDistance(product.distance)}
            </span>
          }
        </div>
      </div>
    </button>);

};

const RecommendedCard = ({ product, onClick }: {product: EnrichedProduct;onClick: () => void;}) => {
  const badge = getPlanBadge(product.farmerPlan);
  return (
    <button
      onClick={onClick}
      className="list-item-subtle">
      
      <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
        {product.images?.[0] ?
        <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" /> :

        <Package className="w-5 h-5 text-muted-foreground/20" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-foreground truncate">{product.title}</h3>
          {badge &&
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badge.color}`}>{badge.label}</span>
          }
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <p className="text-[11px] text-muted-foreground truncate">{product.stock ?? 0} {product.unit}s · by {product.farmer?.name || "Unknown"}</p>
          {product.farmer?.verified && <CheckCircle className="w-3 h-3 text-blue-500 shrink-0" />}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-bold text-primary">${product.price.toFixed(2)}</span>
          {product.distance != null &&
          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5" />
              {formatDistance(product.distance)}
            </span>
          }
        </div>
      </div>
    </button>);

};

const LoadingSkeleton = () =>
<div className="space-y-6">
    <div className="space-y-3">
      <div className="h-5 bg-muted rounded-lg w-36 animate-pulse" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) =>
      <div key={i} className="shrink-0 w-[160px] rounded-lg border border-border bg-card overflow-hidden animate-pulse">
            <div className="aspect-[4/3] bg-muted" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
      )}
      </div>
    </div>
    <div className="space-y-3">
      <div className="h-5 bg-muted rounded-lg w-32 animate-pulse" />
      {Array.from({ length: 3 }).map((_, i) =>
    <div key={i} className="rounded-lg border border-border bg-card p-3 flex gap-3 animate-pulse">
          <div className="w-16 h-16 rounded-md bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-muted rounded w-2/3" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-1/4" />
          </div>
        </div>
    )}
    </div>
  </div>;


export default Explore;