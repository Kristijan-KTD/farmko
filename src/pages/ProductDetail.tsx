import { useState } from "react";
import { Star, MapPin, Package, User, MessageCircle } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ProductDetail = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviews, setReviews] = useState([
    { id: 1, user: "Alice", rating: 5, text: "Excellent quality, very fresh!", time: "2 days ago" },
    { id: 2, user: "Bob", rating: 4, text: "Good tomatoes, will order again", time: "1 week ago" },
    { id: 3, user: "Sarah", rating: 4, text: "Fresh and organic as advertised", time: "2 weeks ago" },
  ]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const handleSubmitReview = () => {
    if (userRating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    setReviews([
      { id: Date.now(), user: user?.name || "You", rating: userRating, text: reviewText, time: "Just now" },
      ...reviews,
    ]);
    setUserRating(0);
    setReviewText("");
    toast({ title: "Review submitted!", description: "Thank you for your feedback" });
  };

  return (
    <MobileLayout>
      <PageHeader title="Product Details" />

      <div className="flex-1 space-y-4 pb-4">
        <div className="aspect-square bg-muted rounded-xl flex items-center justify-center">
          <Package className="w-20 h-20 text-muted-foreground/30" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary">$55.00</span>
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
          <h2 className="text-lg font-bold text-foreground">Fresh Organic Tomatoes</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Freshly picked organic tomatoes from our farm. No pesticides, no chemicals. 
            Available for pickup or delivery within 20km radius.
          </p>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">Jane's Farm</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>Springfield, IL</span>
            </div>
          </div>
        </div>

        {/* Write a review - visible for customers */}
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
            <Button onClick={handleSubmitReview} size="sm" className="rounded-full">
              Submit Review
            </Button>
          </div>
        )}

        {/* Reviews list */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Reviews ({reviews.length})</h3>
          {reviews.map((review) => (
            <div key={review.id} className="p-3 rounded-xl bg-secondary space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-[10px] font-bold text-muted-foreground">{review.user[0]}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{review.user}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{review.time}</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-3 h-3 ${s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-border"}`} />
                ))}
                <span className="text-xs text-muted-foreground ml-1">{review.rating}/5</span>
              </div>
              {review.text && <p className="text-xs text-muted-foreground">{review.text}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="pb-8 pt-4">
        <Button onClick={() => navigate("/chat")} className="w-full rounded-full h-12 text-base font-semibold gap-2">
          <MessageCircle className="w-5 h-5" />
          Contact Farmer
        </Button>
      </div>
    </MobileLayout>
  );
};

export default ProductDetail;
