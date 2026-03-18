import { useState, useEffect } from "react";
import { User, MapPin, Package, MessageCircle, Loader2, Star, AlertTriangle, Calendar, ShoppingBag, CheckCircle } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import { useToast } from "@/hooks/use-toast";
import { getPlanBadge } from "@/services/planService";

interface FarmerProfile {
  id: string;
  name: string;
  location: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  verified: boolean;
}

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
}

interface InstafarmPost {
  id: string;
  image_url: string;
}

const FarmerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackProfileView, trackListingClick, trackContactFarmer } = useAnalyticsTracking();
  const [farmer, setFarmer] = useState<FarmerProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [photos, setPhotos] = useState<InstafarmPost[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [farmerPlan, setFarmerPlan] = useState("starter");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const fetchData = async () => {
      try {
        const [profileRes, productsRes, photosRes, reviewsRes, subRes] = await Promise.all([
          supabase.from("profiles").select("id, name, location, avatar_url, bio, created_at, verified").eq("id", id).maybeSingle(),
          supabase.from("products").select("id, title, price, images").eq("farmer_id", id).eq("status", "active"),
          supabase.from("instafarm_posts").select("id, image_url").eq("farmer_id", id).order("created_at", { ascending: false }).limit(6),
          supabase.from("reviews").select("rating").eq("farmer_id", id),
          supabase.from("farmer_subscriptions").select("plan").eq("farmer_id", id).maybeSingle(),
        ]);

        if (!mounted) return;

        if (profileRes.data) setFarmer(profileRes.data);
        if (productsRes.data) setProducts(productsRes.data);
        if (photosRes.data) setPhotos(photosRes.data);
        if (subRes.data) setFarmerPlan(subRes.data.plan);

        const revs = reviewsRes.data ?? [];
        setReviewCount(revs.length);
        if (revs.length > 0) {
          setAvgRating(revs.reduce((a, r) => a + r.rating, 0) / revs.length);
        }

        if (profileRes.data && user && user.id !== id) {
          trackProfileView(id);
        }
      } catch (e: unknown) {
        if (!mounted) return;
        console.error("[FarmerDetail] Error:", e instanceof Error ? e.message : e);
        setError(true);
        toast({ title: "Failed to load farmer profile", variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [id]);

  const handleProductClick = (product: Product) => {
    if (id && user && user.id !== id) trackListingClick(id, product.id);
    navigate(`/product/${product.id}`);
  };

  const handleContact = async () => {
    if (!user || !farmer) return;
    try {
      if (user.id !== farmer.id) trackContactFarmer(farmer.id);

      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(participant_one.eq.${user.id},participant_two.eq.${farmer.id}),and(participant_one.eq.${farmer.id},participant_two.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        navigate(`/chat/${existing.id}`);
      } else {
        const { data: conv } = await supabase.from("conversations").insert({
          participant_one: user.id,
          participant_two: farmer.id,
        }).select("id").single();
        if (conv) navigate(`/chat/${conv.id}`);
      }
    } catch {
      toast({ title: "Failed to start conversation", variant: "destructive" });
    }
  };

  const planBadge = getPlanBadge(farmerPlan);

  const joinedDate = farmer?.created_at
    ? new Date(farmer.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title="Farmer Profile" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  if (error || !farmer) {
    return (
      <MobileLayout>
        <PageHeader title="Farmer Profile" />
        <div className="flex-1 flex flex-col items-center justify-center">
          {error ? <AlertTriangle className="w-16 h-16 text-destructive/30 mb-4" /> : <User className="w-16 h-16 text-muted-foreground/30 mb-4" />}
          <p className="text-muted-foreground">{error ? "Failed to load profile" : "Farmer not found"}</p>
          {error && <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-3 rounded-full">Retry</Button>}
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader title="Farmer Profile" />

      <div className="flex-1 space-y-6 pb-20">
        {/* Profile Header */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-3 overflow-hidden border border-border">
            {farmer.avatar_url ? (
              <img src={farmer.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">{farmer.name}</h2>
            {farmer.verified && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 border-blue-200 gap-0.5">
                <CheckCircle className="w-3 h-3" /> Verified
              </Badge>
            )}
            {planBadge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${planBadge.color}`}>
                {planBadge.label}
              </span>
            )}
          </div>
          {farmer.location && (
            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span>{farmer.location}</span>
            </div>
          )}
          {farmer.bio && <p className="text-sm text-muted-foreground mt-2 text-center px-4">{farmer.bio}</p>}

          {/* Trust Stats */}
          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <div className="flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                <p className="font-bold text-foreground">{products.length}</p>
              </div>
              <p className="text-xs text-muted-foreground">Products</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <p className="font-bold text-foreground">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</p>
              </div>
              <p className="text-xs text-muted-foreground">{reviewCount} reviews</p>
            </div>
            {joinedDate && (
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="font-bold text-foreground text-sm">{joinedDate}</p>
                </div>
                <p className="text-xs text-muted-foreground">Joined</p>
              </div>
            )}
          </div>
        </div>

        {/* Farm Photos */}
        {photos.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Farm Photos</h3>
            <div className="grid grid-cols-3 gap-1">
              {photos.map((photo) => (
                <div key={photo.id} className="aspect-square bg-muted rounded-sm overflow-hidden">
                  <img src={photo.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        {products.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Products</h3>
            <div className="space-y-2">
              {products.map((p) => (
                <button key={p.id} onClick={() => handleProductClick(p)} className="w-full flex items-center gap-3 p-2 rounded-lg border border-border text-left hover:shadow-sm transition-shadow">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                    <p className="text-xs font-bold text-primary">${p.price.toFixed(2)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pb-8 pt-4">
        <Button onClick={handleContact} className="w-full rounded-full h-12 text-base font-semibold gap-2">
          <MessageCircle className="w-5 h-5" />
          Contact Farmer
        </Button>
      </div>
    </MobileLayout>
  );
};

export default FarmerDetail;
