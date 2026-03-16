import { useState, useEffect } from "react";
import { MapPin, User, MessageCircle, Loader2, Package, Star } from "lucide-react";
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
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

type FilterType = "all" | "farmer" | "customer";
type ViewMode = "farmers" | "products";
type RadiusOption = 5 | 10 | 25 | 50;

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

function FlyToLocation({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 12, { duration: 1.5 });
  }, [lat, lng, map]);
  return null;
}

const Radar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("farmers");
  const [radius, setRadius] = useState<RadiusOption>(50);
  const [selectedPin, setSelectedPin] = useState<RadarUser | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<RadarProduct | null>(null);
  const [users, setUsers] = useState<RadarUser[]>([]);
  const [products, setProducts] = useState<RadarProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

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
        setUsers(usersRes.data.filter(u => u.latitude != null && u.longitude != null).map(u => ({ ...u, role: u.role as "farmer" | "customer" })));
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
    if (filter !== "all" && p.role !== filter) return false;
    if (myLocation && p.latitude && p.longitude) {
      const dist = haversineKm(myLocation.lat, myLocation.lng, p.latitude, p.longitude);
      if (dist > radius) return false;
    }
    return true;
  });

  const filteredProducts = products.filter(p => {
    if (!myLocation || !p.latitude || !p.longitude) return true;
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

  const defaultCenter: [number, number] = myLocation ? [myLocation.lat, myLocation.lng] : [14.5995, 120.9842];
  const markerCount = viewMode === "farmers" ? filteredUsers.length : filteredProducts.length;

  return (
    <MobileLayout noPadding>
      <div className="px-6">
        <PageHeader title="Radar" />
      </div>

      {/* Controls */}
      <div className="flex gap-2 px-6 pb-2 flex-wrap">
        {/* View mode toggle */}
        <div className="flex rounded-full border border-border overflow-hidden">
          {(["farmers", "products"] as ViewMode[]).map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-3 py-1 text-xs font-medium capitalize transition-colors ${viewMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Radius filter */}
        <select
          value={radius}
          onChange={e => setRadius(Number(e.target.value) as RadiusOption)}
          className="px-2 py-1 rounded-full text-xs border border-border bg-background text-foreground"
        >
          {([5, 10, 25, 50] as RadiusOption[]).map(r => (
            <option key={r} value={r}>{r} km</option>
          ))}
        </select>
      </div>

      {/* Farmer filter chips (only in farmers mode) */}
      {viewMode === "farmers" && (
        <div className="flex gap-2 px-6 pb-3">
          {(["all", "farmer", "customer"] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
            >
              {f === "all" ? "All" : f === "farmer" ? "Farmers" : "Customers"}
            </button>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative pb-20" style={{ minHeight: "calc(100vh - 260px)" }}>
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

            {viewMode === "farmers" && filteredUsers.map(pin => (
              <Marker key={pin.id} position={[pin.latitude!, pin.longitude!]} icon={pin.role === "farmer" ? farmerIcon : customerIcon} eventHandlers={{ click: () => setSelectedPin(pin) }} />
            ))}

            {viewMode === "products" && filteredProducts.map(pin => (
              <Marker key={pin.id} position={[pin.latitude!, pin.longitude!]} icon={productIcon} eventHandlers={{ click: () => setSelectedProduct(pin) }} />
            ))}
          </MapContainer>
        )}

        {/* Legend */}
        <div className="absolute left-4 top-4 bg-card/90 backdrop-blur-sm rounded-lg p-2 border border-border z-[1000]">
          {viewMode === "farmers" ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-primary rounded-full" />
                <span className="text-[10px] text-foreground">Farmers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-destructive rounded-full" />
                <span className="text-[10px] text-foreground">Customers</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded" />
              <span className="text-[10px] text-foreground">Products</span>
            </div>
          )}
        </div>

        {/* Bottom card */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card rounded-xl shadow-lg p-3 flex items-center gap-3 border border-border w-[calc(100%-2rem)] z-[1000]">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{user?.name || "You"}</p>
            <p className="text-xs text-muted-foreground">{markerCount} {viewMode} on map · {radius}km radius</p>
          </div>
        </div>
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
