import { useState, useEffect } from "react";
import { User, MapPin, Package, Image as ImageIcon, MessageCircle, Loader2, Star, Heart } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";

interface FarmerProfile {
  id: string;
  name: string;
  location: string | null;
  avatar_url: string | null;
  bio: string | null;
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
  const { id } = useParams<{id: string;}>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trackProfileView, trackListingClick, trackContactFarmer } = useAnalyticsTracking();
  const [farmer, setFarmer] = useState<FarmerProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [photos, setPhotos] = useState<InstafarmPost[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [profileRes, productsRes, photosRes, reviewsRes] = await Promise.all([
      supabase.from("profiles").select("id, name, location, avatar_url, bio").eq("id", id).maybeSingle(),
      supabase.from("products").select("id, title, price, images").eq("farmer_id", id).eq("status", "active"),
      supabase.from("instafarm_posts").select("id, image_url").eq("farmer_id", id).order("created_at", { ascending: false }).limit(6),
      supabase.from("reviews").select("rating").eq("farmer_id", id)]
      );

      if (profileRes.data) setFarmer(profileRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (photosRes.data) setPhotos(photosRes.data);
      if (reviewsRes.data && reviewsRes.data.length > 0) {
        setAvgRating(reviewsRes.data.reduce((a, r) => a + r.rating, 0) / reviewsRes.data.length);
      }
      setLoading(false);

      // Track profile view
      if (profileRes.data && user && user.id !== id) {
        trackProfileView(id);
      }
    };
    fetchData();
  }, [id]);

  const handleProductClick = (product: Product) => {
    if (id && user && user.id !== id) {
      trackListingClick(id, product.id);
    }
    navigate(`/product/${product.id}`);
  };

  const handleContact = async () => {
    if (!user || !farmer) return;

    // Track contact event
    if (user.id !== farmer.id) {
      trackContactFarmer(farmer.id);
    }

    const { data: existing } = await supabase.
    from("conversations").
    select("id").
    or(`and(participant_one.eq.${user.id},participant_two.eq.${farmer.id}),and(participant_one.eq.${farmer.id},participant_two.eq.${user.id})`).
    maybeSingle();

    if (existing) {
      navigate(`/chat/${existing.id}`);
    } else {
      const { data: conv } = await supabase.from("conversations").insert({
        participant_one: user.id,
        participant_two: farmer.id
      }).select("id").single();
      if (conv) navigate(`/chat/${conv.id}`);
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title="Farmer Profile" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>);

  }

  if (!farmer) {
    return (
      <MobileLayout>
        <PageHeader title="Farmer Profile" />
        <div className="flex-1 flex flex-col items-center justify-center">
          <User className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Farmer not found</p>
        </div>
      </MobileLayout>);

  }

  return (
    <MobileLayout>
      <PageHeader title="Farmer Profile" />

      <div className="flex-1 space-y-6 pb-20">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-3 overflow-hidden">
            {farmer.avatar_url ?
            <img src={farmer.avatar_url} alt="" className="w-full h-full object-cover" /> :

            <User className="w-10 h-10 text-muted-foreground" />
            }
          </div>
          <h2 className="text-lg font-bold text-foreground">{farmer.name}</h2>
          {farmer.location &&
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="w-4 h-4" />
              <span className="text-center">{farmer.location}</span>
            </div>
          }
          {farmer.bio && <p className="text-sm text-muted-foreground mt-2 text-center">{farmer.bio}</p>}
          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <p className="font-bold text-foreground">{products.length}</p>
              <p className="text-xs text-muted-foreground">Products</p>
            </div>
            <div className="text-center flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <p className="font-bold text-foreground">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</p>
            </div>
          </div>
        </div>

        {photos.length > 0 &&
        <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Farm Photos</h3>
            <div className="grid grid-cols-3 gap-1">
              {photos.map((photo) =>
            <div key={photo.id} className="aspect-square bg-muted rounded-sm overflow-hidden">
                  <img src={photo.image_url} alt="" className="w-full h-full object-cover" />
                </div>
            )}
            </div>
          </div>
        }

        {products.length > 0 &&
        <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Products</h3>
            <div className="space-y-2">
              {products.map((p) =>
            <button key={p.id} onClick={() => handleProductClick(p)} className="w-full flex items-center gap-3 p-2 rounded-lg border border-border text-left">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    {p.images && p.images[0] ?
                <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> :

                <Package className="w-5 h-5 text-muted-foreground/40" />
                }
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{p.title}</p>
                    <p className="text-xs font-bold text-primary">${p.price.toFixed(2)}</p>
                  </div>
                </button>
            )}
            </div>
          </div>
        }
      </div>

      <div className="pb-8 pt-4">
        <Button onClick={handleContact} className="w-full rounded-full h-12 text-base font-semibold gap-2">
          <MessageCircle className="w-5 h-5" />
          Contact Farmer
        </Button>
      </div>
    </MobileLayout>);

};

export default FarmerDetail;