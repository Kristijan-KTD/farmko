import { useState } from "react";
import { Search, Star, Package, Heart } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useNavigate } from "react-router-dom";

const mockExploreProducts = [
  { id: 1, name: "Fresh Tomatoes", farmer: "Jane Farm", price: "$55.00", rating: 4.5 },
  { id: 2, name: "Organic Eggs", farmer: "Green Valley", price: "$8.00", rating: 4.8 },
  { id: 3, name: "Raw Milk", farmer: "Sunny Acres", price: "$6.50", rating: 4.2 },
  { id: 4, name: "Hot Peppers", farmer: "Spice Farm", price: "$4.00", rating: 4.7 },
  { id: 5, name: "Fresh Cheese", farmer: "Dairy Hills", price: "$12.00", rating: 4.9 },
  { id: 6, name: "Grass-fed Beef", farmer: "Ranch Co", price: "$25.00", rating: 4.6 },
];

const Explore = () => {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = mockExploreProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.farmer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MobileLayout>
      <PageHeader title="Explore" />

      <div className="flex items-center gap-2 bg-secondary rounded-full px-4 py-2.5 mb-4">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search products or farmers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex-1 pb-20">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((product) => (
            <button
              key={product.id}
              onClick={() => navigate(`/product/${product.id}`)}
              className="flex flex-col rounded-xl border border-border bg-card overflow-hidden text-left"
            >
              <div className="aspect-square bg-muted flex items-center justify-center relative">
                <Package className="w-10 h-10 text-muted-foreground/30" />
                <button className="absolute top-2 right-2 p-1">
                  <Heart className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="p-3 space-y-1">
                <h3 className="text-sm font-semibold text-foreground truncate">{product.name}</h3>
                <p className="text-xs text-muted-foreground">{product.farmer}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">{product.price}</span>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-muted-foreground">{product.rating}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

export default Explore;
