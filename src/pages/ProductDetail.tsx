import { useState, useEffect } from "react";
import { Star, MapPin, Package, User, MessageCircle, Loader2, Heart, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Truck, Clock } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";
import HorizontalScroll from "@/components/HorizontalScroll";
import { getPlanBadge } from "@/services/planService";

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
  stock: number | null;
  images: string[] | null;
  farmer_id: string;
  category: string | null;
  farmer: { id: string; name: string; location: string | null; avatar_url: string | null; verified?: boolean; last_seen_at?: string | null } | null;
}

interface RelatedProduct {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  unit: string;
  category?: string | null;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackListingView, trackContactFarmer, trackFavoriteListing } = useAnalyticsTracking();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [farmerPlan, setFarmerPlan] = useState<string>("starter");
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [moreFromFarmer, setMoreFromFarmer] = useState<RelatedProduct[]>([]);
  const [similarProducts, setSimilarProducts] = useState<RelatedProduct[]>([]);
  const [farmerProductCount, setFarmerProductCount] = useState(0);
  const [farmerReviewCount, setFarmerReviewCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const fetchData = async () => {
      try {
        const { data: prod, error: prodError } = await supabase
          .from("products")
          .select("id, title, description, price, unit, stock, images, farmer_id, category, farmer:profiles!products_farmer_id_fkey(id, name, location, avatar_url, verified, last_seen_at)")
          .eq("id", id)
          .maybeSingle();

        if (prodError) throw prodError;
        if (!mounted) return;

        if (prod) {
          const productData = {
            ...prod,
            farmer: Array.isArray(prod.farmer) ? prod.farmer[0] : prod.farmer,
          };
          setProduct(productData);

          if (user && user.id !== prod.farmer_id) {
            trackListingView(prod.farmer_id, prod.id);
            supabase.from("listing_views").insert({ listing_id: prod.id, viewer_id: user.id }).then();
          }

          const [favRes, subRes, revsRes, moreRes, similarRes, farmerProdRes, farmerRevRes] = await Promise.all([
            user ? supabase.from("favorites").select("id").eq("user_id", user.id).eq("listing_id", prod.id).maybeSingle() : Promise.resolve({ data: null }),
            supabase.from("farmer_subscriptions").select("plan").eq("farmer_id", prod.farmer_id).maybeSingle(),
            supabase.from("reviews").select("id, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url)").eq("product_id", id).order("created_at", { ascending: false }),
            supabase.from("products").select("id, title, price, images, unit").eq("farmer_id", prod.farmer_id).eq("status", "active").neq("id", id).limit(5),
            prod.category
              ? supabase.from("products").select("id, title, price, images, unit").eq("category", prod.category).eq("status", "active").neq("id", id).neq("farmer_id", prod.farmer_id).limit(5)
              : Promise.resolve({ data: [] }),
            supabase.from("products").select("id", { count: "exact", head: true }).eq("farmer_id", prod.farmer_id).eq("status", "active"),
            supabase.from("reviews").select("id", { count: "exact", head: true }).eq("farmer_id", prod.farmer_id),
          ]);

          if (!mounted) return;
          setIsFavorited(!!favRes.data);
          if (subRes.data) setFarmerPlan(subRes.data.plan);
          if (revsRes.data) {
            setReviews(revsRes.data.map(r => ({
              ...r,
              reviewer: Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer,
            })));
          }
          setMoreFromFarmer(moreRes.data || []);
          setSimilarProducts((similarRes.data || []) as RelatedProduct[]);
          setFarmerProductCount(farmerProdRes.count ?? 0);
          setFarmerReviewCount(farmerRevRes.count ?? 0);
        }
      } catch (e: unknown) {
        if (!mounted) return;
        console.error("[ProductDetail] Error:", e instanceof Error ? e.message : e);
        setError(true);
        toast({ title: "Failed to load product", variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [id]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const handleToggleFavorite = async () => {
    if (!user || !product) return;
    try {
      if (isFavorited) {
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", product.id);
        setIsFavorited(false);
      } else {
        await supabase.from("favorites").insert({ user_id: user.id, listing_id: product.id });
        setIsFavorited(true);
        if (user.id !== product.farmer_id) {
          trackFavoriteListing(product.farmer_id, product.id);
        }
      }
    } catch {
      toast({ title: "Failed to update favorite", variant: "destructive" });
    }
  };

  const handleSubmitReview = async () => {
    if (userRating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    if (!user || !product) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("reviews").insert({
        product_id: product.id,
        farmer_id: product.farmer_id,
        reviewer_id: user.id,
        rating: userRating,
        comment: reviewText || null,
      }).select("id, rating, comment, created_at").single();

      if (error) throw error;
      if (data) {
        setReviews([{ ...data, reviewer: { name: user.name, avatar_url: user.avatar_url || null } }, ...reviews]);
        setUserRating(0);
        setReviewText("");
        toast({ title: "Review submitted!" });
      }
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Could not submit review", variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleContactFarmer = async () => {
    if (!user || !product?.farmer) return;
    const farmerId = product.farmer.id;

    try {
      if (user.id !== farmerId) trackContactFarmer(farmerId);

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
    } catch {
      toast({ title: "Failed to start conversation", variant: "destructive" });
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const lastActiveLabel = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 5) return "Online now";
    if (mins < 60) return `Active ${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Active ${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `Active ${days}d ago`;
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

  if (error || !product) {
    return (
      <MobileLayout>
        <PageHeader title="Product Details" />
        <div className="flex-1 flex flex-col items-center justify-center">
          {error ? <AlertTriangle className="w-16 h-16 text-destructive/30 mb-4" /> : <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />}
          <p className="text-muted-foreground">{error ? "Failed to load product" : "Product not found"}</p>
          {error && <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-3 rounded-full">Retry</Button>}
        </div>
      </MobileLayout>
    );
  }

  const planBadge = getPlanBadge(farmerPlan);
  const farmerLastActive = lastActiveLabel(product.farmer?.last_seen_at);

  const MiniProductCard = ({ p }: { p: RelatedProduct }) => (
    <button
      onClick={() => navigate(`/product/${p.id}`)}
      className="card-interactive flex flex-col shrink-0 w-[130px] min-w-[130px] snap-start overflow-hidden text-left"
    >
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {p.images?.[0] ? (
          <img src={p.images[0]} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="w-6 h-6 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <h4 className="text-xs font-semibold text-foreground truncate">{p.title}</h4>
        <span className="text-xs font-bold text-primary mt-0.5 block">${p.price.toFixed(2)}</span>
      </div>
    </button>
  );

  return (
    <MobileLayout>
      <PageHeader title="Product Details" />

      <div className="flex-1 section-gap pb-6">
        {/* Image Gallery */}
        <div className="relative aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden shadow-card">
          {product.images && product.images.length > 0 ? (
            <>
              <img src={product.images[currentImageIndex]} alt={product.title} className="w-full h-full object-cover" />
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev - 1 + product.images!.length) % product.images!.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-md bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-card"
                  >
                    <ChevronLeft className="w-5 h-5 text-foreground" />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev + 1) % product.images!.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-md bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-card"
                  >
                    <ChevronRight className="w-5 h-5 text-foreground" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {product.images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-colors ${idx === currentImageIndex ? "bg-primary" : "bg-background/60"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <Package className="w-20 h-20 text-muted-foreground/30" />
          )}
          {user && (
            <button
              onClick={handleToggleFavorite}
              className="absolute top-3 right-3 w-10 h-10 rounded-md bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-card"
            >
              <Heart className={`w-5 h-5 ${isFavorited ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
            </button>
          )}
        </div>

        {/* Price & Rating */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-foreground">${product.price.toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/{product.unit}</span></span>
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

          {/* Trust & Availability Signals */}
          <div className="flex flex-wrap gap-2 mt-1">
            {product.farmer?.verified && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" /> Verified Farmer
              </span>
            )}
            {farmerLastActive && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full ${
                farmerLastActive === "Online now" ? "text-primary bg-primary/10" : "text-muted-foreground bg-secondary"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${farmerLastActive === "Online now" ? "bg-primary" : "bg-muted-foreground"}`} />
                {farmerLastActive}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full">
              💬 Usually responds within 1 hour
            </span>
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full ${
              (product.stock ?? 0) > 0 ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10"
            }`}>
              {(product.stock ?? 0) > 0 ? "✓ In Stock" : "Sold Out"}
            </span>
          </div>

          {/* Pickup / Delivery Info */}
          <div className="flex gap-2.5 mt-1">
             <div className="flex-1 p-3 rounded-md bg-secondary/80 flex items-center gap-2.5 border border-border">
              <Truck className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-foreground">Pickup Available</p>
                <p className="text-[10px] text-muted-foreground">Contact farmer for details</p>
              </div>
            </div>
            <div className="flex-1 p-3 rounded-md bg-secondary/80 flex items-center gap-2.5 border border-border">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-foreground">Fresh Daily</p>
                <p className="text-[10px] text-muted-foreground">Check availability</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5">
          <Button onClick={handleContactFarmer} className="flex-1 rounded-md h-12 font-semibold gap-2 shadow-card">
            <MessageCircle className="w-5 h-5" />
            Contact Farmer
          </Button>
          {user && (
            <Button variant="outline" onClick={handleToggleFavorite} className="rounded-md h-12 px-4 border-border">
              <Heart className={`w-5 h-5 ${isFavorited ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
          )}
        </div>

        {/* Farmer Card */}
        {product.farmer && (
          <button
            onClick={() => navigate(`/farmer/${product.farmer!.id}`)}
            className="card-interactive w-full flex items-center gap-3.5 p-4 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden relative">
              {product.farmer.avatar_url ? (
                <img src={product.farmer.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-muted-foreground" />
              )}
              {farmerLastActive === "Online now" && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-secondary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-foreground truncate">{product.farmer.name}</h3>
                {product.farmer.verified && <CheckCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                {planBadge && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${planBadge.color}`}>
                    {planBadge.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {product.farmer.location && (
                  <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{product.farmer.location}</span>
                )}
                <span>{farmerProductCount} products</span>
                <span>{farmerReviewCount} reviews</span>
              </div>
            </div>
          </button>
        )}

        {/* More From This Farmer */}
        {moreFromFarmer.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">More from this farmer</h3>
            <HorizontalScroll className="gap-3 pb-1">
              {moreFromFarmer.map((p) => <MiniProductCard key={p.id} p={p} />)}
            </HorizontalScroll>
          </section>
        )}

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">Similar products</h3>
            <HorizontalScroll className="gap-3 pb-1">
              {similarProducts.map((p) => <MiniProductCard key={p.id} p={p} />)}
            </HorizontalScroll>
          </section>
        )}

        {/* Write Review */}
        {user?.role === "customer" && (
          <div className="space-y-3 p-4 rounded-lg border border-border bg-card shadow-card">
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
            <Button onClick={handleSubmitReview} disabled={submitting} size="sm" className="rounded-md">
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        )}

        {/* Reviews */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Reviews ({reviews.length})</h3>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No reviews yet</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="p-3.5 rounded-2xl bg-card border border-border shadow-card space-y-1.5">
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
    </MobileLayout>
  );
};

export default ProductDetail;
