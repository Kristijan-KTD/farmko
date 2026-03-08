import { useState, useEffect } from "react";
import { Search, Star, Package, Heart } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  farmer: { name: string } | null;
}

const Explore = () => {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, price, images, farmer:profiles!products_farmer_id_fkey(name)")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (data) {
        setProducts(data.map(p => ({
          ...p,
          farmer: Array.isArray(p.farmer) ? p.farmer[0] : p.farmer,
        })));
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.farmer?.name?.toLowerCase().includes(search.toLowerCase())
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
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
                <div className="aspect-square bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((product) => (
              <button
                key={product.id}
                onClick={() => navigate(`/product/${product.id}`)}
                className="flex flex-col rounded-xl border border-border bg-card overflow-hidden text-left"
              >
                <div className="aspect-square bg-muted flex items-center justify-center relative">
                  {product.images && product.images[0] ? (
                    <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-10 h-10 text-muted-foreground/30" />
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="text-sm font-semibold text-foreground truncate">{product.title}</h3>
                  <p className="text-xs text-muted-foreground">{product.farmer?.name || "Unknown"}</p>
                  <span className="text-sm font-bold text-primary">${product.price.toFixed(2)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

export default Explore;
