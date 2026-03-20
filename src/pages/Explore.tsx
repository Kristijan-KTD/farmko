import { useState, useEffect } from "react";
import { Search, Package, AlertTriangle, MapPin, CheckCircle } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import ExploreFilter, { type FilterState } from "@/components/explore/ExploreFilter";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchEnrichedProducts, trackListingClick, type EnrichedProduct } from "@/services/productService";
import { getPlanBadge } from "@/services/planService";
import { CATEGORIES } from "@/lib/categories";
import { haversineKm, formatDistance } from "@/lib/distance";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 6;

const Explore = () => {
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ category: null, sortBy: "newest", distance: null });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
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
    return () => { mounted = false; };
  }, [userLocation]);

  const activeCategory = selectedCategory || filters.category;

  // Reset visible count when filters/search change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, activeCategory, filters.sortBy, filters.distance]);

  const filtered = products.filter((p) => {
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.farmer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !activeCategory || p.category === activeCategory;
    const matchesDistance = !filters.distance || !p.distance || p.distance <= filters.distance;
    return matchesSearch && matchesCategory && matchesDistance;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (filters.sortBy === "closest") return (a.distance ?? Infinity) - (b.distance ?? Infinity);
    if (filters.sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleProductClick = async (product: EnrichedProduct) => {
    if (user) trackListingClick(product.farmer_id, product.id);
    navigate(`/product/${product.id}`);
  };

  return (
    <MobileLayout>
      <PageHeader title="Explore" />

      {/* Search */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 min-w-0 flex items-center gap-2 bg-secondary rounded-md px-3 h-10 border border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search products or farmers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ExploreFilter
          filters={filters}
          onApply={(f) => { setFilters(f); if (f.category) setSelectedCategory(null); }}
          hasLocation={!!userLocation}
        />
      </div>

      {/* Category Chips */}
      <div className="flex overflow-x-auto gap-2 mb-3 pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === (cat.key === "all" ? null : cat.key);
          const isAll = cat.key === "all" && !activeCategory;
          return (
            <button
              key={cat.key}
              onClick={() => { setSelectedCategory(cat.key === "all" ? null : cat.key); setFilters((f) => ({ ...f, category: null })); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium shrink-0 transition-colors duration-150 active:scale-[0.97] ${
                isActive || isAll
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground border border-border hover:border-primary/30"
              }`}
            >
              <cat.icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Results count */}
      {!loading && !error && filtered.length > 0 && (
        <p className="text-tertiary-label mb-1.5">{sorted.length} result{sorted.length !== 1 ? "s" : ""}</p>
      )}

      {/* Product List — flat list, no cards */}
      <div className="flex-1 pb-20 overflow-y-auto overflow-x-hidden">
        {loading ? (
          <ExploreSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 rounded-full bg-destructive/8 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5 text-destructive/60" />
            </div>
            <p className="text-foreground font-medium mb-1 text-sm">Something went wrong</p>
            <p className="text-muted-foreground text-xs mb-3">Failed to load products</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="rounded-md text-xs">Retry</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Package className="w-5 h-5 text-muted-foreground/40" />
            </div>
            <p className="text-foreground font-medium mb-1 text-sm">No products found</p>
            <p className="text-muted-foreground text-xs">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {sorted.slice(0, visibleCount).map((product) => (
              <ExploreProductRow key={product.id} product={product} onClick={() => handleProductClick(product)} />
            ))}
          </div>
          {visibleCount < sorted.length && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full py-3 mt-2 text-sm font-medium text-primary hover:text-primary/80 active:scale-[0.98] transition-colors"
            >
              View more ({sorted.length - visibleCount} remaining)
            </button>
          )}
        )}
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

// ── Explore Product Row (flat list row — no card, no shadow) ────

const ExploreProductRow = ({ product, onClick }: { product: EnrichedProduct; onClick: () => void }) => {
  const badge = getPlanBadge(product.farmerPlan);
  return (
    <button onClick={onClick} className="flex items-center gap-3 w-full text-left py-3 px-1 transition-colors active:scale-[0.98]">
      <div className="w-[52px] h-[52px] rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-5 h-5 text-muted-foreground/20" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <h3 className="text-sm font-medium text-foreground truncate">{product.title}</h3>
          {badge && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badge.color}`}>{badge.label}</span>
          )}
        </div>
        <p className="text-tertiary-label truncate mt-0.5 flex items-center gap-1">
          {product.farmer?.name || "Unknown"}
          {product.farmer?.verified && <CheckCircle className="w-2.5 h-2.5 text-blue-500 shrink-0" />}
        </p>
      </div>
      <div className="text-right shrink-0 space-y-0.5">
        <span className="text-xs font-bold text-primary block">${product.price.toFixed(2)}</span>
        {product.distance != null && (
          <span className="text-tertiary-label flex items-center gap-0.5 justify-end">
            <MapPin className="w-2.5 h-2.5" />
            {formatDistance(product.distance)}
          </span>
        )}
      </div>
    </button>
  );
};

// ── Skeleton ─────────────────────────────────────────────────────

const ExploreSkeleton = () => (
  <div className="divide-y divide-border/60">
    {Array.from({ length: 14 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-1 py-2.5 animate-pulse">
        <div className="w-10 h-10 rounded-sm bg-muted shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-muted rounded w-3/4" />
          <div className="h-2.5 bg-muted rounded w-1/2" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 bg-muted rounded w-10" />
          <div className="h-2 bg-muted rounded w-8 ml-auto" />
        </div>
      </div>
    ))}
  </div>
);

export default Explore;