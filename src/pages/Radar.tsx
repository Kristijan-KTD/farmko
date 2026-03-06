import { useState } from "react";
import { MapPin, User, MessageCircle, Navigation, Filter, Layers, ZoomIn, ZoomOut } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const mockPins = [
  { id: 1, name: "Jane's Farm", lat: 25, left: 20, type: "farmer", distance: "2.4 mi", products: 8, rating: 4.8 },
  { id: 2, name: "Green Valley", lat: 45, left: 55, type: "farmer", distance: "5.1 mi", products: 12, rating: 4.5 },
  { id: 3, name: "Bob (Customer)", lat: 30, left: 75, type: "customer", distance: "1.8 mi", products: 0, rating: 0 },
  { id: 4, name: "Sunny Acres", lat: 60, left: 35, type: "farmer", distance: "8.3 mi", products: 15, rating: 4.9 },
  { id: 5, name: "Alice (Customer)", lat: 15, left: 45, type: "customer", distance: "3.2 mi", products: 0, rating: 0 },
  { id: 6, name: "Heritage Farm", lat: 70, left: 70, type: "farmer", distance: "12 mi", products: 6, rating: 4.3 },
  { id: 7, name: "Mike's Ranch", lat: 40, left: 15, type: "farmer", distance: "7.5 mi", products: 10, rating: 4.6 },
];

type FilterType = "all" | "farmer" | "customer";

const Radar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedPin, setSelectedPin] = useState<typeof mockPins[0] | null>(null);
  const [zoom, setZoom] = useState(1);

  const filteredPins = mockPins.filter(p => filter === "all" || p.type === filter);

  return (
    <MobileLayout noPadding>
      <div className="px-6">
        <PageHeader title="Radar" />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-6 pb-3">
        {(["all", "farmer", "customer"] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground"
            }`}
          >
            {f === "all" ? "All" : f === "farmer" ? "Farmers" : "Customers"}
          </button>
        ))}
      </div>

      <div className="flex-1 relative bg-secondary overflow-hidden">
        {/* Map grid background */}
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

        {/* Animated center pulse (your location) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="relative">
            <div className="w-4 h-4 bg-primary rounded-full border-2 border-primary-foreground shadow-lg" />
            <div className="absolute inset-0 w-4 h-4 bg-primary rounded-full animate-ping opacity-30" />
            <div className="absolute -inset-6 w-16 h-16 border-2 border-primary/20 rounded-full" />
            <div className="absolute -inset-12 w-28 h-28 border border-primary/10 rounded-full" />
          </div>
        </div>

        {/* Map pins */}
        {filteredPins.map((pin) => (
          <button
            key={pin.id}
            className="absolute transform -translate-x-1/2 -translate-y-full z-20 transition-all duration-300 hover:scale-125"
            style={{
              top: `${pin.lat}%`,
              left: `${pin.left}%`,
            }}
            onClick={() => setSelectedPin(pin)}
          >
            <div className="relative">
              <MapPin className={`w-8 h-8 drop-shadow-md ${
                pin.type === "farmer" ? "text-primary fill-primary/80" : "text-destructive fill-destructive/80"
              }`} />
              {pin.type === "farmer" && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-foreground rounded-full flex items-center justify-center">
                  <span className="text-[6px] font-bold text-primary">{pin.products}</span>
                </div>
              )}
            </div>
          </button>
        ))}

        {/* Zoom controls */}
        <div className="absolute right-4 top-4 flex flex-col gap-2 z-30">
          <button
            onClick={() => setZoom(Math.min(zoom + 0.25, 2))}
            className="w-9 h-9 bg-card border border-border rounded-lg flex items-center justify-center shadow-sm hover:bg-secondary transition-colors"
          >
            <ZoomIn className="w-4 h-4 text-foreground" />
          </button>
          <button
            onClick={() => setZoom(Math.max(zoom - 0.25, 0.5))}
            className="w-9 h-9 bg-card border border-border rounded-lg flex items-center justify-center shadow-sm hover:bg-secondary transition-colors"
          >
            <ZoomOut className="w-4 h-4 text-foreground" />
          </button>
          <button className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-sm">
            <Navigation className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>

        {/* Distance legend */}
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

        {/* Your location card */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-card rounded-xl shadow-lg p-3 flex items-center gap-3 border border-border w-[calc(100%-3rem)] z-30">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Navigation className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{user?.name || "You"}</p>
            <p className="text-xs text-muted-foreground">Your location · {filteredPins.length} nearby</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-primary">{filteredPins.filter(p => p.type === "farmer").length}</p>
            <p className="text-[10px] text-muted-foreground">Farmers</p>
          </div>
        </div>
      </div>

      {/* Pin detail dialog */}
      <Dialog open={!!selectedPin} onOpenChange={(open) => !open && setSelectedPin(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPin?.name}</DialogTitle>
          </DialogHeader>
          {selectedPin && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  selectedPin.type === "farmer" ? "bg-primary/10" : "bg-destructive/10"
                }`}>
                  <User className={`w-6 h-6 ${selectedPin.type === "farmer" ? "text-primary" : "text-destructive"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground capitalize">{selectedPin.type}</p>
                  <p className="text-xs text-muted-foreground">{selectedPin.distance} from you</p>
                </div>
              </div>

              {selectedPin.type === "farmer" && (
                <div className="flex gap-4">
                  <div className="text-center flex-1 p-2 rounded-lg bg-secondary">
                    <p className="text-lg font-bold text-foreground">{selectedPin.products}</p>
                    <p className="text-[10px] text-muted-foreground">Products</p>
                  </div>
                  <div className="text-center flex-1 p-2 rounded-lg bg-secondary">
                    <p className="text-lg font-bold text-foreground">{selectedPin.rating}</p>
                    <p className="text-[10px] text-muted-foreground">Rating</p>
                  </div>
                  <div className="text-center flex-1 p-2 rounded-lg bg-secondary">
                    <p className="text-lg font-bold text-foreground">{selectedPin.distance}</p>
                    <p className="text-[10px] text-muted-foreground">Distance</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => { setSelectedPin(null); navigate("/chat"); }}
                  className="flex-1 rounded-full gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Message
                </Button>
                {selectedPin.type === "farmer" && (
                  <Button
                    onClick={() => { setSelectedPin(null); navigate(`/farmer/${selectedPin.id}`); }}
                    variant="outline"
                    className="flex-1 rounded-full"
                  >
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
