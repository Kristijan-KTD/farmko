import { User, MapPin, Star, Package, Image as ImageIcon, MessageCircle } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const FarmerDetail = () => {
  const navigate = useNavigate();

  const mockProducts = [
    { id: 1, name: "Fresh Tomatoes", price: "$5.00" },
    { id: 2, name: "Organic Eggs", price: "$8.00" },
    { id: 3, name: "Raw Honey", price: "$12.00" },
  ];

  const mockPhotos = Array.from({ length: 6 });

  return (
    <MobileLayout>
      <PageHeader title="Farmer Profile" />

      <div className="flex-1 space-y-6 pb-20">
        {/* Header */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-3">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground">John's Organic Farm</h2>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin className="w-4 h-4" />
            <span>Springfield, IL</span>
          </div>
          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <p className="font-bold text-foreground">12</p>
              <p className="text-xs text-muted-foreground">Products</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-foreground">4.8</p>
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-foreground">156</p>
              <p className="text-xs text-muted-foreground">Sales</p>
            </div>
          </div>
        </div>

        {/* Photos */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Farm Photos</h3>
          <div className="grid grid-cols-3 gap-1">
            {mockPhotos.map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-sm flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
              </div>
            ))}
          </div>
        </div>

        {/* Products */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Products</h3>
          <div className="space-y-2">
            {mockProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs font-bold text-primary">{p.price}</p>
                </div>
              </div>
            ))}
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

export default FarmerDetail;
