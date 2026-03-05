import { useState } from "react";
import { Search, User, MapPin } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useNavigate } from "react-router-dom";

const mockFarmers = [
  { id: 1, name: "John's Organic Farm", location: "Springfield, IL", products: 12, rating: 4.8 },
  { id: 2, name: "Green Valley Ranch", location: "Riverside, CA", products: 8, rating: 4.5 },
  { id: 3, name: "Sunny Acres Dairy", location: "Madison, WI", products: 15, rating: 4.9 },
  { id: 4, name: "Heritage Farm", location: "Austin, TX", products: 6, rating: 4.3 },
  { id: 5, name: "Pine Hill Produce", location: "Portland, OR", products: 20, rating: 4.7 },
];

const FindFarmer = () => {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = mockFarmers.filter(
    (f) => f.name.toLowerCase().includes(search.toLowerCase()) || f.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MobileLayout>
      <PageHeader title="Find Farmer" />

      <div className="flex items-center gap-2 bg-secondary rounded-full px-4 py-2.5 mb-4">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search farmers in your area..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex-1 pb-20 space-y-3">
        {filtered.map((farmer) => (
          <button
            key={farmer.id}
            onClick={() => navigate(`/farmer/${farmer.id}`)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card text-left"
          >
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">{farmer.name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="w-3 h-3" />
                <span>{farmer.location}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{farmer.products} products</p>
            </div>
          </button>
        ))}
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

export default FindFarmer;
