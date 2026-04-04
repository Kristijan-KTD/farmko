import { useState, useEffect, useRef, forwardRef, type ComponentPropsWithoutRef } from "react";
import { MapPin, User, MessageCircle, Loader2, Package, Star, SlidersHorizontal, Navigation } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { haversineKm, formatDistance } from "@/lib/distance";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useIsMobile } from "@/hooks/use-mobile";

interface RadarUser {
  id: string;
  name: string;
  role: "farmer" | "customer";
  location: string | null;
  avatar_url: string | null;
  latitude: number | null;
  longitude: number | null;
  verified?: boolean;
}

interface RadarProduct {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  farmer_id: string;
  farmerName: string;
  latitude: number | null;
  longitude: number | null;
}

type ViewMode = "all" | "farmers" | "products";
type RadiusOption = 5 | 10 | 25 | 50 | null;

const farmerIcon = new L.DivIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:hsl(152,70%,48%);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const customerIcon = new L.DivIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:hsl(0,84%,60%);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const productIcon = new L.DivIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:hsl(25,95%,53%);border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const youIcon = new L.DivIcon({
  className: "",
  html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:hsl(152,70%,48%);border:3px solid white;box-shadow:0 0 0 3px hsl(152,70%,48%,0.3),0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function FlyToLocation({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom ?? 12, { duration: 1.5 });
  }, [lat, lng, zoom, map]);
  return null;
}

const RADIUS_OPTIONS: { value: RadiusOption; label: string }[] = [
  { value: null, label: "Any" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
];

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "all", label: "All" },
  { value: "farmers", label: "Farmers" },
  { value: "products", label: "Products" },
];

type RadarFilterTriggerProps = ComponentPropsWithoutRef<"button"> & {
  activeFilterCount: number;
};

const RadarFilterTrigger = forwardRef<HTMLButtonElement, RadarFilterTriggerProps>(
  ({ activeFilterCount, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      {...props}
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card text-sm font-medium text-foreground border border-border hover:border-primary/30 transition-colors active:scale-[0.97] relative"
    >
      <SlidersHorizontal className="w-4 h-4" />
      <span>Filter</span>
      {activeFilterCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
          {activeFilterCount}
        </span>
      )}
    </button>
  ),
);

RadarFilterTrigger.displayName = "RadarFilterTrigger";

const RadarFilterBody = ({
  localView, setLocalView, localRadius, setLocalRadius, activeFilterCount, onApply, onReset,
}: {
  localView: ViewMode; setLocalView: (v: ViewMode) => void;
  localRadius: RadiusOption; setLocalRadius: (r: RadiusOption) => void;
  activeFilterCount: number; onApply: () => void; onReset: () => void;
}) => (
  <div className="space-y-5">
    <div className="flex items-center justify-between">
      <h3 className="text-base font-semibold text-foreground">Filters</h3>
      {activeFilterCount > 0 && (
        <button onClick={onReset} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Clear all
        </button>
      )}
    </div>
    <div>
      <div className="flex items-center gap-2 mb-3">
        <User className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Show</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {VIEW_OPTIONS.map((opt) => (
          <button key={opt.value} onClick={() => setLocalView(opt.value)}
            className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 active:scale-[0.97] ${
              localView === opt.value ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-foreground hover:bg-accent border border-border"
            }`}>{opt.label}</button>
        ))}
      </div>
    </div>
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Distance</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {RADIUS_OPTIONS.map((opt) => (
          <button key={opt.value} onClick={() => setLocalRadius(opt.value)}
            className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 active:scale-[0.97] ${
              localRadius === opt.value ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-foreground hover:bg-accent border border-border"
            }`}>{opt.label}</button>
        ))}
      </div>
    </div>
    <Button onClick={onApply} className="w-full h-12 rounded-md text-sm font-semibold">Apply Filters</Button>
  </div>
);

const Radar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [radius, setRadius] = useState<RadiusOption>(null);
  const [selectedPin, setSelectedPin] = useState<RadarUser | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<RadarProduct | null>(null);
  const [users, setUsers] = useState<RadarUser[]>([]);
  const [products, setProducts] = useState<RadarProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [localView, setLocalView] = useState<ViewMode>("all");
  const [localRadius, setLocalRadius] = useState<RadiusOption>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {
          if (user) {
            supabase.from("profiles").select("latitude, longitude").eq("id", user.id).single()
              .then(({ data }) => {
                if (data?.latitude && data?.longitude) {
                  setMyLocation({ lat: data.latitude, lng: data.longitude });
                }
              });
          }
        }
      );
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      const [usersRes, productsRes] = await Promise.all([
        supabase.from("profiles").select("id, name, role, location, avatar_url, latitude, longitude, verified").neq("id", user?.id || ""),
        supabase.from("products").select("id, title, price, images, farmer_id, farmer:profiles!products_farmer_id_fkey(name, latitude, longitude)").eq("status", "active"),
      ]);

      if (usersRes.data) {
        setUsers(usersRes.data.filter(u => u.latitude != null && u.longitude != null && u.role === "farmer").map(u => ({ ...u, role: u.role as "farmer" | "customer" })));
      }
      if (productsRes.data) {
        setProducts(productsRes.data.map((p: any) => {
          const farmer = Array.isArray(p.farmer) ? p.farmer[0] : p.farmer;
          return {
            id: p.id,
            title: p.title,
            price: p.price,
            images: p.images,
            farmer_id: p.farmer_id,
            farmerName: farmer?.name || "Unknown",
            latitude: farmer?.latitude ?? null,
            longitude: farmer?.longitude ?? null,
          };
        }).filter((p: RadarProduct) => p.latitude != null && p.longitude != null));
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const filteredUsers = users.filter(p => {
    if (viewMode === "products") return false;
    if (viewMode === "farmers" && p.role !== "farmer") return false;
    if (radius !== null && myLocation && p.latitude && p.longitude) {
      const dist = haversineKm(myLocation.lat, myLocation.lng, p.latitude, p.longitude);
      if (dist > radius) return false;
    }
    return true;
  });

  const filteredProducts = products.filter(p => {
    if (viewMode === "farmers") return false;
    if (radius === null || !myLocation || !p.latitude || !p.longitude) return true;
    return haversineKm(myLocation.lat, myLocation.lng, p.latitude, p.longitude) <= radius;
  });

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
      const { data: conv } = await supabase
        .from("conversations")
        .insert({ participant_one: user.id, participant_two: targetUser.id })
        .select("id")
        .single();
      if (conv) navigate(`/chat/${conv.id}`);
    }
  };

  const handleFindMyLocation = () => {
    if (myLocation) {
      setFlyTarget({ lat: myLocation.lat, lng: myLocation.lng, zoom: 15 });
      // Reset after animation
      setTimeout(() => setFlyTarget(null), 2000);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyLocation(loc);
          setFlyTarget({ ...loc, zoom: 15 });
          setTimeout(() => setFlyTarget(null), 2000);
        }
      );
    }
  };

  const handleOpenFilter = (isOpen: boolean) => {
    if (isOpen) {
      setLocalView(viewMode);
      setLocalRadius(radius);
    }
    setFilterOpen(isOpen);
  };

  const handleApplyFilter = () => {
    setViewMode(localView);
    setRadius(localRadius);
    setFilterOpen(false);
  };

  const handleResetFilter = () => {
    setLocalView("all");
    setLocalRadius(null);
    setViewMode("all");
    setRadius(null);
    setFilterOpen(false);
  };

  const defaultCenter: [number, number] = myLocation ? [myLocation.lat, myLocation.lng] : [14.5995, 120.9842];
  const markerCount = filteredUsers.length + filteredProducts.length;

  const activeFilterCount = [
    viewMode !== "all" ? viewMode : null,
    radius !== null ? radius : null,
  ].filter(Boolean).length;

  return (
    <MobileLayout noPadding>
      <div className="px-6 flex items-center justify-between sticky top-0 z-30 bg-background">
        <PageHeader title="Radar" />
        {isMobile ? (
          <Sheet open={filterOpen} onOpenChange={handleOpenFilter}>
            <SheetTrigger asChild>
              <RadarFilterTrigger activeFilterCount={activeFilterCount} />
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-3 max-h-[70vh]">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <RadarFilterBody
                localView={localView}
                setLocalView={setLocalView}
                localRadius={localRadius}
                setLocalRadius={setLocalRadius}
                activeFilterCount={activeFilterCount}
                onApply={handleApplyFilter}
                onReset={handleResetFilter}
              />
            </SheetContent>
          </Sheet>
        ) : (
          <Popover open={filterOpen} onOpenChange={handleOpenFilter}>
            <PopoverTrigger asChild>
              <RadarFilterTrigger activeFilterCount={activeFilterCount} />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-5">
              <RadarFilterBody
                localView={localView}
                setLocalView={setLocalView}
                localRadius={localRadius}
                setLocalRadius={setLocalRadius}
                activeFilterCount={activeFilterCount}
                onApply={handleApplyFilter}
                onReset={handleResetFilter}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative pb-20" style={{ minHeight: "calc(100vh - 180px)" }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <MapContainer center={defaultCenter} zoom={12} className="z-0" style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} zoomControl={false}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {myLocation && (
              <>
                <FlyToLocation lat={myLocation.lat} lng={myLocation.lng} />
                <Marker position={[myLocation.lat, myLocation.lng]} icon={youIcon}>
                  <Popup><span className="font-semibold">You are here</span></Popup>
                </Marker>
              </>
            )}

            {flyTarget && <FlyToLocation lat={flyTarget.lat} lng={flyTarget.lng} zoom={flyTarget.zoom} />}

            {filteredUsers.map(pin => (
              <Marker key={pin.id} position={[pin.latitude!, pin.longitude!]} icon={pin.role === "farmer" ? farmerIcon : customerIcon} eventHandlers={{ click: () => setSelectedPin(pin) }} />
            ))}

            {filteredProducts.map(pin => (
              <Marker key={pin.id} position={[pin.latitude!, pin.longitude!]} icon={productIcon} eventHandlers={{ click: () => setSelectedProduct(pin) }} />
            ))}
          </MapContainer>
        )}

        {/* Legend - hidden when filter is open */}
        {!filterOpen && (
          <div className="absolute left-4 top-4 bg-card/90 backdrop-blur-sm rounded-lg p-2 border border-border z-[1000]">
            {(viewMode === "all" || viewMode === "farmers") && (
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-primary rounded-full" />
                <span className="text-[10px] text-foreground">Farmers</span>
              </div>
            )}
            {(viewMode === "all" || viewMode === "products") && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded" />
                <span className="text-[10px] text-foreground">Products</span>
              </div>
            )}
          </div>
        )}

        {/* Bottom card - hidden when filter is open */}
        {!filterOpen && (
          <button
            onClick={handleFindMyLocation}
            className="absolute bottom-24 lg:bottom-4 left-1/2 -translate-x-1/2 bg-card rounded-xl shadow-lg p-3 flex items-center gap-3 border border-border w-[calc(100%-2rem)] z-[1000] text-left active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{user?.name || "You"}</p>
              <p className="text-xs text-muted-foreground">{markerCount} results on map · {radius}km radius</p>
            </div>
            <MapPin className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Farmer detail dialog */}
      <Dialog open={!!selectedPin} onOpenChange={open => !open && setSelectedPin(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPin?.name}</DialogTitle>
          </DialogHeader>
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
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground capitalize">{selectedPin.role}</p>
                    {selectedPin.verified && (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4 bg-blue-50 text-blue-600 border-blue-200">✓ Verified</Badge>
                    )}
                  </div>
                  {selectedPin.location && <p className="text-xs text-muted-foreground">{selectedPin.location}</p>}
                  {myLocation && selectedPin.latitude && selectedPin.longitude && (
                    <p className="text-xs text-muted-foreground">{formatDistance(haversineKm(myLocation.lat, myLocation.lng, selectedPin.latitude, selectedPin.longitude))}</p>
                  )}
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

      {/* Product detail dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={open => !open && setSelectedProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedProduct?.title}</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                  {selectedProduct.images?.[0] ? (
                    <img src={selectedProduct.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-6 h-6 text-muted-foreground/30" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-bold text-primary">${selectedProduct.price.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">by {selectedProduct.farmerName}</p>
                  {myLocation && selectedProduct.latitude && selectedProduct.longitude && (
                    <p className="text-xs text-muted-foreground">{formatDistance(haversineKm(myLocation.lat, myLocation.lng, selectedProduct.latitude, selectedProduct.longitude))}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => { setSelectedProduct(null); navigate(`/product/${selectedProduct.id}`); }} className="flex-1 rounded-full">
                  View Product
                </Button>
                <Button onClick={() => { setSelectedProduct(null); navigate(`/farmer/${selectedProduct.farmer_id}`); }} variant="outline" className="flex-1 rounded-full">
                  View Farmer
                </Button>
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
