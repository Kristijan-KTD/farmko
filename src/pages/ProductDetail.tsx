import { useState, useEffect } from "react";
import { Star, MapPin, Package, User, MessageCircle, Loader2, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: { name: string; avatar_url: string | null } | null;
}

interface ProductData {
  id: string;
  title: string;
  description: string | null;
  price: number;
  unit: string;
  images: string[] | null;
  farmer_id: string;
  farmer: { id: string; name: string; location: string | null; avatar_url: string | null } | null;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [farmerPlan, setFarmerPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const { data: prod } = await supabase
        .from("products")
        .select("id, title, description, price, unit, images, farmer_id, farmer:profiles!products_farmer_id_fkey(id, name, location, avatar_url)")
        .eq("id", id)
        .maybeSingle();

      if (prod) {
        setProduct({
          ...prod,
          farmer: Array.isArray(prod.farmer) ? prod.farmer[0] : prod.farmer,
        });

        // Track listing view analytics
        if (user) {
          await supabase.from("listing_views").insert({ listing_id: prod.id, viewer_id: user.id });
          await supabase.from("analytics_events").insert({ farmer_id: prod.farmer_id, event_type: "listing_view", reference_id: prod.id });
        }

        // Check farmer's plan for badge
        const { data: sub } = await supabase
          .from("farmer_subscriptions")
          .select("plan")
          .eq("farmer_id", prod.farmer_id)
          .maybeSingle();
        if (sub) setFarmerPlan(sub.plan);
      }

      const { data: revs } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url)")
        .eq("product_id", id)
        .order("created_at", { ascending: false });

      if (revs) {
        setReviews(revs.map(r => ({
          ...r,
          reviewer: Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer,
        })));
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const handleSubmitReview = async () => {
    if (userRating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    if (!user || !product) return;

    setSubmitting(true);
    const { data, error } = await supabase.from("reviews").insert({
      product_id: product.id,
      farmer_id: product.farmer_id,
      reviewer_id: user.id,
      rating: userRating,
      comment: reviewText || null,
    }).select("id, rating, comment, created_at").single();

    if (!error && data) {
      setReviews([{ ...data, reviewer: { name: user.name, avatar_url: user.avatar_url || null } }, ...reviews]);
      setUserRating(0);
      setReviewText("");
      toast({ title: "Review submitted!", description: "Thank you for your feedback" });
    } else {
      toast({ title: "Error", description: error?.message || "Could not submit review", variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleContactFarmer = async () => {
    if (!user || !product?.farmer) return;
    const farmerId = product.farmer.id;

    // Find or create conversation
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(participant_one.eq.${user.id},participant_two.eq.${farmerId}),and(participant_one.eq.${farmerId},participant_two.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      navigate(`/chat/${existing.id}`);
    } else {
      const { data: conv } = await supabase
        .from("conversations")
        .insert({ participant_one: user.id, participant_two: farmerId })
        .select("id")
        .single();
      if (conv) navigate(`/chat/${conv.id}`);
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title="Product Details" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  if (!product) {
    return (
      <MobileLayout>
        <PageHeader title="Product Details" />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Product not found</p>
        </div>
      </MobileLayout>
    );
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <MobileLayout>
      <PageHeader title="Product Details" />

      <div className="flex-1 space-y-4 pb-4">
        <div className="aspect-square bg-muted rounded-xl flex items-center justify-center overflow-hidden">
          {product.images && product.images[0] ? (
            <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-20 h-20 text-muted-foreground/30" />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary">${product.price.toFixed(2)}/{product.unit}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-foreground">{avgRating}</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-4 h-4 ${s <= Math.round(Number(avgRating)) ? "fill-yellow-400 text-yellow-400" : "text-border"}`} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">({reviews.length})</span>
            </div>
          </div>
          <h2 className="text-lg font-bold text-foreground">{product.title}</h2>
          {product.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          )}
        </div>

        {product.farmer && (
          <button
            onClick={() => navigate(`/farmer/${product.farmer!.id}`)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary text-left"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {product.farmer.avatar_url ? (
                <img src={product.farmer.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-foreground">{product.farmer.name}</h3>
                {farmerPlan === "pro" && (
                  <Crown className="w-3.5 h-3.5 text-yellow-500" />
                )}
              </div>
              {product.farmer.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{product.farmer.location}</span>
                </div>
              )}
            </div>
          </button>
        )}

        {user?.role === "customer" && (
          <div className="space-y-3 p-4 rounded-xl border border-border">
            <h3 className="text-sm font-semibold text-foreground">Write a Review</h3>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setUserRating(s)}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <Star className={`w-7 h-7 transition-colors ${
                    s <= (hoverRating || userRating) ? "fill-yellow-400 text-yellow-400" : "text-border"
                  }`} />
                </button>
              ))}
              {userRating > 0 && <span className="text-sm text-muted-foreground ml-2">{userRating}/5</span>}
            </div>
            <textarea
              placeholder="Share your experience..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full bg-secondary rounded-lg p-3 text-sm outline-none resize-none h-20 placeholder:text-muted-foreground"
            />
            <Button onClick={handleSubmitReview} disabled={submitting} size="sm" className="rounded-full">
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Reviews ({reviews.length})</h3>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No reviews yet</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="p-3 rounded-xl bg-secondary space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {review.reviewer?.avatar_url ? (
                        <img src={review.reviewer.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {review.reviewer?.name?.[0] || "?"}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground">{review.reviewer?.name || "Anonymous"}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(review.created_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-3 h-3 ${s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-border"}`} />
                  ))}
                </div>
                {review.comment && <p className="text-xs text-muted-foreground">{review.comment}</p>}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pb-8 pt-2">
        <Button variant="outline" onClick={handleContactFarmer} className="w-full rounded-full h-12 text-base font-semibold gap-2">
          <MessageCircle className="w-5 h-5" />
          Contact Farmer
        </Button>
      </div>
    </MobileLayout>
  );
};

export default ProductDetail;
