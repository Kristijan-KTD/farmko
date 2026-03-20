import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Package, Sparkles, Camera, User, CheckCircle, Loader2, TrendingUp, Leaf, Clock } from "lucide-react";
import HorizontalScroll from "@/components/HorizontalScroll";
import InstafarmCard from "@/components/instafarm/InstafarmCard";
import { useInstafarmPosts } from "@/hooks/useInstafarmPosts";
import { useAuth } from "@/contexts/AuthContext";
import { fetchEnrichedProducts, getRecommendedProducts, trackListingClick, type EnrichedProduct } from "@/services/productService";
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
        const [productsData, farmersRes] = await Promise.all([
          fetchEnrichedProducts(),
          supabase
            .from("profiles")
            .select("id, name, avatar_url, verified, bio, latitude, longitude")
            .eq("role", "farmer")
            .limit(20),
        ]);

        if (!mounted) return;

        if (userLocation) {
          productsData.forEach((p) => {
            if (p.farmer?.latitude && p.farmer?.longitude) {
              p.distance = haversineKm(userLocation.lat, userLocation.lng, p.farmer.latitude, p.farmer.longitude);
            }
          });
        }
        setProducts(productsData);

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

        farmerList.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        setFarmers(farmerList.slice(0, 6));
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
    ? [...products].filter((p) => p.distance != null).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)).slice(0, 4)
    : [];

  const recommended = getRecommendedProducts(products, 4);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      {/* SECTION 1 – Greeting */}
      <section className="space-y-1">
        <h1 className="text-lg font-bold text-foreground leading-tight">
          {getGreeting()}{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="section-subtitle">Discover what's fresh and local today</p>
      </section>

      {/* SECTION 2 – Trending Near You */}
      {nearbyProducts.length > 0 && (
        <section>
          <FeedSectionHeader
            icon={TrendingUp}
            title="Trending near you"
            subtitle="Popular this week"
            onSeeAll={() => navigate("/explore")}
          />
          <HorizontalScroll className="gap-3 pb-1">
            {nearbyProducts.map((product) => (
              <FeedProductCard key={product.id} product={product} onClick={() => handleProductClick(product)} />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* SECTION 3 – Fresh from Farms (Instafarm) */}
      <FreshFromFarmsSection userLocation={userLocation} />

      {/* SECTION 4 – Picked for You (horizontal scroll) */}
      {recommended.length > 0 && (
        <section>
          <FeedSectionHeader
            icon={Sparkles}
            title="Picked for you"
            subtitle="Fresh today"
            onSeeAll={() => navigate("/explore/recommended")}
          />
          <HorizontalScroll className="gap-3 pb-1">
            {recommended.map((product) => (
              <FeedProductCard key={product.id} product={product} onClick={() => handleProductClick(product)} />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* SECTION 5 – Farmers Near You */}
      {farmers.length > 0 && (
        <section>
          <FeedSectionHeader
            icon={User}
            title="Farmers near you"
            subtitle="Meet your local growers"
            onSeeAll={() => navigate("/find-farmer")}
          />
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

const FeedSectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  onSeeAll,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
}) => (
  <div className="flex items-start justify-between mb-3">
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="section-subtitle mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {onSeeAll && (
      <button onClick={onSeeAll} className="text-xs font-semibold text-primary mt-0.5">See all</button>
    )}
  </div>
);

// ── Feed Product Card (visual, spacious) ────────────────────────

const FeedProductCard = ({ product, onClick }: { product: EnrichedProduct; onClick: () => void }) => {
  const badge = getPlanBadge(product.farmerPlan);
  return (
    <button onClick={onClick} className="card-interactive flex flex-col shrink-0 w-[164px] min-w-[164px] snap-start overflow-hidden text-left">
      <div className="aspect-[3/2] bg-muted relative overflow-hidden" style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground/20" />
          </div>
        )}
        {badge && (
          <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${badge.color}`}>
            {badge.label}
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <h3 className="text-[13px] font-semibold text-foreground truncate">{product.title}</h3>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold text-primary">${product.price.toFixed(2)}</span>
          {product.distance != null && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
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
  const { posts, loading, isFallback } = useInstafarmPosts({ limit: 4, userLocation, maxDistance: 100 });
  const navigate = useNavigate();

  if (loading || posts.length === 0) return null;

  return (
    <section>
      <FeedSectionHeader
        icon={Camera}
        title="Fresh from farms"
        subtitle="Stories from local growers"
        onSeeAll={() => navigate("/instafarm")}
      />
      {isFallback && userLocation && (
        <p className="text-[11px] text-muted-foreground mb-2.5">No nearby farms found. Showing farms from your region.</p>
      )}
      <HorizontalScroll className="gap-4 pb-1">
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
        <span className="text-[11px] font-bold text-muted-foreground">{farmer.name[0]}</span>
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
