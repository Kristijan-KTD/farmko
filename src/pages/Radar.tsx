import { useState, useEffect, useRef } from "react";
import { MapPin, User, MessageCircle, Loader2 } from "lucide-react";
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
}

type FilterType = "all" | "farmer" | "customer";

// Custom marker icons
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

const youIcon = new L.DivIcon({
  className: "",
  html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:hsl(152,70%,48%);border:3px solid white;box-shadow:0 0 0 3px hsl(152,70%,48%,0.3),0 2px 8px rgba(0,0,0,0.3);">
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Component to fly to user location
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
  const [selectedPin, setSelectedPin] = useState<RadarUser | null>(null);
  const [users, setUsers] = useState<RadarUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Try getting browser geolocation for current user
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {
          // Fallback: use profile location if available
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
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, role, location, avatar_url, latitude, longitude")
        .neq("id", user?.id || "");

      if (data) {
        setUsers(
          data
            .filter((u) => u.latitude != null && u.longitude != null)
            .map((u) => ({
              ...u,
              role: u.role as "farmer" | "customer",
            }))
        );
      }
      setLoading(false);
    };
    fetchUsers();
  }, [user]);

  const filteredPins = users.filter((p) => filter === "all" || p.role === filter);

  const handleContact = async (targetUser: RadarUser) => {
    if (!user) return;
    setSelectedPin(null);
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(participant_one.eq.${user.id},participant_two.eq.${targetUser.id}),and(participant_one.eq.${targetUser.id},participant_two.eq.${user.id})`
      )
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

  const defaultCenter: [number, number] = myLocation
    ? [myLocation.lat, myLocation.lng]
    : [14.5995, 120.9842]; // Manila fallback

  return (
    <MobileLayout noPadding>
      <div className="px-6">
        <PageHeader title="Radar" />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-6 pb-3">
        {(["all", "farmer", "customer"] as FilterType[]).map((f) => (
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

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: "calc(100vh - 160px)" }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={12}
            className="z-0"
            style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {myLocation && (
              <>
                <FlyToLocation lat={myLocation.lat} lng={myLocation.lng} />
                <Marker position={[myLocation.lat, myLocation.lng]} icon={youIcon}>
                  <Popup>
                    <span className="font-semibold">You are here</span>
                  </Popup>
                </Marker>
              </>
            )}

            {filteredPins.map((pin) => (
              <Marker
                key={pin.id}
                position={[pin.latitude!, pin.longitude!]}
                icon={pin.role === "farmer" ? farmerIcon : customerIcon}
                eventHandlers={{ click: () => setSelectedPin(pin) }}
              />
            ))}
          </MapContainer>
        )}

        {/* Legend */}
        <div className="absolute left-4 bottom-36 bg-card/90 backdrop-blur-sm rounded-lg p-2 border border-border z-[1000]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-primary rounded-full" />
            <span className="text-[10px] text-foreground">Farmers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-destructive rounded-full" />
            <span className="text-[10px] text-foreground">Customers</span>
          </div>
        </div>

        {/* Nearby count card */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-card rounded-xl shadow-lg p-3 flex items-center gap-3 border border-border w-[calc(100%-3rem)] z-[1000]">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{user?.name || "You"}</p>
            <p className="text-xs text-muted-foreground">{filteredPins.length} users on map</p>
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
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${
                    selectedPin.role === "farmer" ? "bg-primary/10" : "bg-destructive/10"
                  }`}
                >
                  {selectedPin.avatar_url ? (
                    <img src={selectedPin.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User
                      className={`w-6 h-6 ${
                        selectedPin.role === "farmer" ? "text-primary" : "text-destructive"
                      }`}
                    />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground capitalize">{selectedPin.role}</p>
                  {selectedPin.location && (
                    <p className="text-xs text-muted-foreground">{selectedPin.location}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleContact(selectedPin)}
                  className="flex-1 rounded-full gap-2"
                >
                  <MessageCircle className="w-4 h-4" /> Message
                </Button>
                {selectedPin.role === "farmer" && (
                  <Button
                    onClick={() => {
                      setSelectedPin(null);
                      navigate(`/farmer/${selectedPin.id}`);
                    }}
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
