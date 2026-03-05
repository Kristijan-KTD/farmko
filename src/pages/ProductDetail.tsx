import { Star, MapPin, Package, User, MessageCircle } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ProductDetail = () => {
  const navigate = useNavigate();

  return (
    <MobileLayout>
      <PageHeader title="Product Details" />

      <div className="flex-1 space-y-4">
        <div className="aspect-square bg-muted rounded-xl flex items-center justify-center">
          <Package className="w-20 h-20 text-muted-foreground/30" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary">$55.00</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`w-4 h-4 ${s <= 4 ? "fill-yellow-400 text-yellow-400" : "text-border"}`} />
              ))}
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
