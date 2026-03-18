import { useState, useEffect } from "react";
import { Search, User, MapPin, Star, Navigation, Loader2 } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Farmer {
  id: string;
  name: string;
  location: string | null;
  avatar_url: string | null;
  product_count?: number;
}

const FindFarmer = () => {
  const [search, setSearch] = useState("");
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFarmers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, location, avatar_url")
        .eq("role", "farmer")
        .order("name");

      if (data) {
        // Get product counts
        const ids = data.map(f => f.id);
        const { data: products } = await supabase
          .from("products")
          .select("farmer_id")
          .in("farmer_id", ids)
          .eq("status", "active");

        const countMap = new Map<string, number>();
        products?.forEach(p => countMap.set(p.farmer_id, (countMap.get(p.farmer_id) || 0) + 1));

        setFarmers(data.map(f => ({ ...f, product_count: countMap.get(f.id) || 0 })));
      }
      setLoading(false);
    };
    fetchFarmers();
  }, []);

  const filtered = farmers.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.location || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MobileLayout>
      <PageHeader title="Find Farmer" />

      <div className="flex items-center gap-2 bg-secondary rounded-full px-4 py-2.5 mb-4">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search farmers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex-1 pb-20 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <User className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">No farmers found</p>
          </div>
        ) : (
          filtered.map((farmer) => (
            <button
              key={farmer.id}
              onClick={() => navigate(`/farmer/${farmer.id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-md border border-border bg-card text-left hover:shadow-sm transition-shadow"
            >
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                {farmer.avatar_url ? (
                  <img src={farmer.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{farmer.name}</h3>
                {farmer.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span>{farmer.location}</span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground">{farmer.product_count} products</span>
              </div>
            </button>
          ))
        )}
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

export default FindFarmer;
