import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Package, Clock, Sparkles, Camera, User, CheckCircle, Loader2 } from "lucide-react";
import HorizontalScroll from "@/components/HorizontalScroll";
import InstafarmCard from "@/components/instafarm/InstafarmCard";
import { useInstafarmPosts } from "@/hooks/useInstafarmPosts";
import { useAuth } from "@/contexts/AuthContext";
import { fetchEnrichedProducts, getNewestProducts, getRecommendedProducts, trackListingClick, type EnrichedProduct } from "@/services/productService";
import { getPlanBadge } from "@/services/planService";
import { haversineKm, formatDistance } from "@/lib/distance";
import { supabase } from "@/integrations/supabase/client";

// ── Nearby Farmers ──────────────────────────────────────────────
interface NearbyFarmer {
  id: string;
  name: string;
  avatar_url: string | null;
  verified: boolean;
  distance?: number;
  bio: string | null;
}

// ── Main Feed ───────────────────────────────────────────────────
const CustomerFeed = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [farmers, setFarmers] = useState<NearbyFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  // Fetch products + farmers
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [productsData, farmersRes] = await Promise.all([
          fetchEnrichedProducts(),
          supabase
            .from("profiles")
            .select("id, name, avatar_url, verified, bio, latitude, longitude")
            .eq("role", "farmer")
            .limit(20),
        ]);

        if (!mounted) return;

        // Enrich with distance
        if (userLocation) {
          productsData.forEach((p) => {
            if (p.farmer?.latitude && p.farmer?.longitude) {
              p.distance = haversineKm(userLocation.lat, userLocation.lng, p.farmer.latitude, p.farmer.longitude);
            }
          });
        }
        setProducts(productsData);

        // Process farmers
        let farmerList: NearbyFarmer[] = (farmersRes.data || []).map((f) => ({
          id: f.id,
          name: f.name,
          avatar_url: f.avatar_url,
          verified: f.verified,
          bio: f.bio,
          distance: userLocation && f.latitude && f.longitude
            ? haversineKm(userLocation.lat, userLocation.lng, f.latitude, f.longitude)
            : undefined,
        }));

        // Sort by distance if available
        farmerList.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        setFarmers(farmerList.slice(0, 8));
      } catch {
        // non-critical
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [userLocation]);

  const handleProductClick = (product: EnrichedProduct) => {
    if (user) trackListingClick(product.farmer_id, product.id);
    navigate(`/product/${product.id}`);
  };

  const nearbyProducts = userLocation
    ? [...products].filter((p) => p.distance != null).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)).slice(0, 8)
    : [];

  const recommended = getRecommendedProducts(products, 6);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="section-gap pb-24">
      {/* SECTION 1 – Hero / Search */}
      <section className="space-y-3">
        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">
            {getGreeting()}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Discover fresh, local products near you</p>
        </div>
        <button
          onClick={() => navigate("/explore")}
          className="w-full flex items-center gap-2.5 bg-secondary rounded-md px-4 py-3 border border-border"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Search products or farmers...</span>
        </button>
      </section>

      {/* SECTION 2 – Nearby Products */}
      {nearbyProducts.length > 0 && (
        <section>
          <SectionHeader icon={MapPin} title="Nearby Products" onSeeAll={() => navigate("/explore")} />
          <HorizontalScroll className="gap-3 pb-1">
            {nearbyProducts.map((product) => (
              <NearbyProductCard key={product.id} product={product} onClick={() => handleProductClick(product)} />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* SECTION 3 – Fresh from Farms (Instafarm) */}
      <FreshFromFarmsSection userLocation={userLocation} />

      {/* SECTION 4 – Recommended Products */}
      {recommended.length > 0 && (
        <section>
          <SectionHeader icon={Sparkles} title="Recommended" onSeeAll={() => navigate("/explore/recommended")} />
          <div className="space-y-2">
            {recommended.map((product) => (
              <RecommendedProductItem key={product.id} product={product} onClick={() => handleProductClick(product)} />
            ))}
          </div>
        </section>
      )}

      {/* SECTION 5 – Nearby Farmers */}
      {farmers.length > 0 && (
        <section>
          <SectionHeader icon={User} title="Farmers near you" onSeeAll={() => navigate("/find-farmer")} />
          <HorizontalScroll className="gap-3 pb-1">
            {farmers.map((farmer) => (
              <FarmerCard key={farmer.id} farmer={farmer} onClick={() => navigate(`/farmer/${farmer.id}`)} />
            ))}
          </HorizontalScroll>
        </section>
      )}
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// ── Section Header ──────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, title, onSeeAll }: { icon: React.ElementType; title: string; onSeeAll?: () => void }) => (
  <div className="flex items-center justify-between mb-3.5">
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
    </div>
    {onSeeAll && (
      <button onClick={onSeeAll} className="text-xs font-semibold text-primary">See all</button>
    )}
  </div>
);

// ── Nearby Product Card ─────────────────────────────────────────

const NearbyProductCard = ({ product, onClick }: { product: EnrichedProduct; onClick: () => void }) => {
  const badge = getPlanBadge(product.farmerPlan);
  return (
    <button onClick={onClick} className="card-interactive flex flex-col shrink-0 w-[160px] min-w-[160px] snap-start overflow-hidden text-left">
      <div className="aspect-[4/3] bg-muted relative overflow-hidden rounded-t-lg">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground/20" />
          </div>
        )}
        {badge && (
          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[9px] font-bold ${badge.color}`}>
            {badge.label}
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <h3 className="text-xs font-semibold text-foreground truncate">{product.title}</h3>
        <div className="flex items-center gap-1">
          <p className="text-[10px] text-muted-foreground truncate">{product.farmer?.name || "Unknown"}</p>
          {product.farmer?.verified && <CheckCircle className="w-3 h-3 text-blue-500 shrink-0" />}
        </div>
        <div className="flex items-center justify-between pt-0.5">
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

// ── Recommended Product Item ────────────────────────────────────

const RecommendedProductItem = ({ product, onClick }: { product: EnrichedProduct; onClick: () => void }) => {
  const badge = getPlanBadge(product.farmerPlan);
  return (
    <button onClick={onClick} className="list-item-subtle">
      <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-5 h-5 text-muted-foreground/20" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-foreground truncate">{product.title}</h3>
          {badge && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badge.color}`}>{badge.label}</span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">by {product.farmer?.name || "Unknown"}</p>
        <div className="flex items-center gap-2 mt-0.5">
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

// ── Fresh from Farms ────────────────────────────────────────────

const FreshFromFarmsSection = ({ userLocation }: { userLocation: { lat: number; lng: number } | null }) => {
  const { posts, loading, isFallback } = useInstafarmPosts({ limit: 6, userLocation, maxDistance: 100 });
  const navigate = useNavigate();

  if (loading || posts.length === 0) return null;

  return (
    <section>
      <SectionHeader icon={Camera} title="Fresh from farms" onSeeAll={() => navigate("/instafarm")} />
      {isFallback && userLocation && (
        <p className="text-[11px] text-muted-foreground mb-2">No nearby farms found. Showing farms from your region.</p>
      )}
      <HorizontalScroll className="gap-3 pb-1">
        {posts.map((post) => (
          <InstafarmCard key={post.id} post={post} variant="compact" />
        ))}
      </HorizontalScroll>
    </section>
  );
};

// ── Farmer Card ─────────────────────────────────────────────────

const FarmerCard = ({ farmer, onClick }: { farmer: NearbyFarmer; onClick: () => void }) => (
  <button onClick={onClick} className="card-interactive flex flex-col items-center shrink-0 w-[120px] min-w-[120px] snap-start p-4 text-center">
    <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex items-center justify-center mb-2.5 ring-2 ring-border">
      {farmer.avatar_url ? (
        <img src={farmer.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-sm font-bold text-muted-foreground">{farmer.name[0]}</span>
      )}
    </div>
    <p className="text-xs font-semibold text-foreground truncate w-full">{farmer.name}</p>
    <div className="flex items-center gap-1 mt-1">
      {farmer.verified && <CheckCircle className="w-3 h-3 text-blue-500" />}
      {farmer.distance != null && (
        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
          <MapPin className="w-2.5 h-2.5" />
          {formatDistance(farmer.distance)}
        </span>
      )}
    </div>
  </button>
);

export default CustomerFeed;
