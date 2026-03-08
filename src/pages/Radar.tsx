import { useState, useEffect } from "react";
import { MapPin, User, MessageCircle, Navigation, ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RadarUser {
  id: string;
  name: string;
  role: "farmer" | "customer";
  location: string | null;
  avatar_url: string | null;
  // Computed position for the map
  top: number;
  left: number;
}

type FilterType = "all" | "farmer" | "customer";

const Radar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedPin, setSelectedPin] = useState<RadarUser | null>(null);
  const [zoom, setZoom] = useState(1);
  const [users, setUsers] = useState<RadarUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, role, location, avatar_url")
        .neq("id", user?.id || "");

      if (data) {
        // Assign pseudo-random positions based on user id hash
        setUsers(data.map((u, i) => ({
          ...u,
          role: u.role as "farmer" | "customer",
          top: 10 + ((i * 37 + 13) % 70),
          left: 10 + ((i * 53 + 7) % 75),
        })));
      }
      setLoading(false);
    };
    fetchUsers();
  }, [user]);

  const filteredPins = users.filter(p => filter === "all" || p.role === filter);

  const handleContact = async (targetUser: RadarUser) => {
    if (!user) return;
    setSelectedPin(null);
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(participant_one.eq.${user.id},participant_two.eq.${targetUser.id}),and(participant_one.eq.${targetUser.id},participant_two.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      navigate(`/chat/${existing.id}`);
    } else {
      const { data: conv } = await supabase.from("conversations").insert({
        participant_one: user.id,
        participant_two: targetUser.id,
      }).select("id").single();
      if (conv) navigate(`/chat/${conv.id}`);
    }
  };

  return (
    <MobileLayout noPadding>
      <div className="px-6">
        <PageHeader title="Radar" />
      </div>

      <div className="flex gap-2 px-6 pb-3">
        {(["all", "farmer", "customer"] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
            }`}
          >
            {f === "all" ? "All" : f === "farmer" ? "Farmers" : "Customers"}
          </button>
        ))}
      </div>

      <div className="flex-1 relative bg-secondary overflow-hidden">
        <div className="absolute inset-0">
          <div className="w-full h-full" style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.05), transparent 70%),
              linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)
            `,
            backgroundSize: `100% 100%, ${40 / zoom}px ${40 / zoom}px, ${40 / zoom}px ${40 / zoom}px`,
          }} />
        </div>

        {/* Center pulse */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="relative">
            <div className="w-4 h-4 bg-primary rounded-full border-2 border-primary-foreground shadow-lg" />
            <div className="absolute inset-0 w-4 h-4 bg-primary rounded-full animate-ping opacity-30" />
            <div className="absolute -inset-6 w-16 h-16 border-2 border-primary/20 rounded-full" />
          </div>
        </div>

        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          filteredPins.map((pin) => (
            <button
              key={pin.id}
              className="absolute transform -translate-x-1/2 -translate-y-full z-20 transition-all duration-300 hover:scale-125"
              style={{ top: `${pin.top}%`, left: `${pin.left}%` }}
              onClick={() => setSelectedPin(pin)}
            >
              <MapPin className={`w-8 h-8 drop-shadow-md ${
                pin.role === "farmer" ? "text-primary fill-primary/80" : "text-destructive fill-destructive/80"
              }`} />
            </button>
          ))
        )}

        {/* Zoom controls */}
        <div className="absolute right-4 top-4 flex flex-col gap-2 z-30">
          <button onClick={() => setZoom(Math.min(zoom + 0.25, 2))} className="w-9 h-9 bg-card border border-border rounded-lg flex items-center justify-center shadow-sm">
            <ZoomIn className="w-4 h-4 text-foreground" />
          </button>
          <button onClick={() => setZoom(Math.max(zoom - 0.25, 0.5))} className="w-9 h-9 bg-card border border-border rounded-lg flex items-center justify-center shadow-sm">
            <ZoomOut className="w-4 h-4 text-foreground" />
          </button>
        </div>

        {/* Legend */}
        <div className="absolute left-4 bottom-36 bg-card/90 backdrop-blur-sm rounded-lg p-2 border border-border z-30">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-primary rounded-full" />
            <span className="text-[10px] text-foreground">Farmers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-destructive rounded-full" />
            <span className="text-[10px] text-foreground">Customers</span>
          </div>
        </div>

        {/* Your location */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-card rounded-xl shadow-lg p-3 flex items-center gap-3 border border-border w-[calc(100%-3rem)] z-30">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Navigation className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{user?.name || "You"}</p>
            <p className="text-xs text-muted-foreground">{filteredPins.length} nearby</p>
          </div>
        </div>
      </div>

      {/* Pin detail */}
      <Dialog open={!!selectedPin} onOpenChange={(open) => !open && setSelectedPin(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedPin?.name}</DialogTitle></DialogHeader>
          {selectedPin && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${selectedPin.role === "farmer" ? "bg-primary/10" : "bg-destructive/10"}`}>
                  {selectedPin.avatar_url ? (
                    <img src={selectedPin.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className={`w-6 h-6 ${selectedPin.role === "farmer" ? "text-primary" : "text-destructive"}`} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground capitalize">{selectedPin.role}</p>
                  {selectedPin.location && <p className="text-xs text-muted-foreground">{selectedPin.location}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleContact(selectedPin)} className="flex-1 rounded-full gap-2">
                  <MessageCircle className="w-4 h-4" /> Message
                </Button>
                {selectedPin.role === "farmer" && (
                  <Button onClick={() => { setSelectedPin(null); navigate(`/farmer/${selectedPin.id}`); }} variant="outline" className="flex-1 rounded-full">
                    View Profile
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </MobileLayout>
  );
};

export default Radar;
