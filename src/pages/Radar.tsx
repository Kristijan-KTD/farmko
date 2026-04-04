import { useState, useEffect, useRef, forwardRef, useMemo, type ComponentPropsWithoutRef } from "react";
import { MapPin, Loader2, Package, SlidersHorizontal, Navigation, LayoutGrid } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm, formatDistance } from "@/lib/distance";
import { CATEGORIES } from "@/lib/categories";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { useIsMobile } from "@/hooks/use-mobile";

interface RadarProduct {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  farmer_id: string;
  farmerName: string;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
}

// Distance slider steps in miles
const DISTANCE_STEPS = [5, 20, 50, 100] as const;
const DISTANCE_LABELS = ["5 mi", "20 mi", "50 mi", "100+ mi"];

function milesToKm(miles: number): number {
  return miles * 1.60934;
}

const productIcon = new L.DivIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:hsl(152,70%,48%);border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
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

// Marker cluster layer component
function MarkerClusterGroup({ products, onSelect }: { products: RadarProduct[]; onSelect: (p: RadarProduct) => void }) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
    }

    const cluster = (L as any).markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (c: any) => {
        const count = c.getChildCount();
        return L.divIcon({
          html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:hsl(152,70%,48%);color:white;font-weight:700;font-size:13px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${count}</div>`,
          className: "",
          iconSize: L.point(36, 36),
          iconAnchor: L.point(18, 18),
        });
      },
    });

    products.forEach((p) => {
      if (p.latitude == null || p.longitude == null) return;
      const marker = L.marker([p.latitude, p.longitude], { icon: productIcon });
      // Add tooltip with product name
      marker.bindTooltip(p.title, {
        permanent: true,
        direction: "top",
        offset: L.point(0, -16),
        className: "radar-product-tooltip",
      });
      marker.on("click", () => onSelect(p));
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);
    clusterRef.current = cluster;

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
      }
    };
  }, [products, map, onSelect]);

  return null;
}

// Map bounds tracker for lazy loading
function MapBoundsTracker({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
    zoomend: () => onBoundsChange(map.getBounds()),
  });

  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, []);

  return null;
}

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
  localCategory, setLocalCategory,
  localDistIdx, setLocalDistIdx,
  activeFilterCount, onApply, onReset,
}: {
  localCategory: string | null; setLocalCategory: (c: string | null) => void;
  localDistIdx: number; setLocalDistIdx: (i: number) => void;
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

    {/* Category */}
    <div>
      <div className="flex items-center gap-2 mb-3">
        <LayoutGrid className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Category</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const catValue = cat.key === "all" ? null : cat.key;
          const isActive = localCategory === catValue;
          return (
            <button
              key={cat.key}
              onClick={() => setLocalCategory(catValue)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all duration-150 active:scale-[0.97] ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-foreground hover:bg-accent border border-border"
              }`}
            >
              <cat.icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>

    {/* Distance Slider */}
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Distance</h3>
      </div>
      <div className="px-1">
        <Slider
          min={0}
          max={3}
          step={1}
          value={[localDistIdx]}
          onValueChange={([val]) => setLocalDistIdx(val)}
        />
        <div className="flex justify-between mt-2">
          {DISTANCE_LABELS.map((label, i) => (
            <span
              key={label}
              className={`text-[11px] ${i === localDistIdx ? "text-primary font-semibold" : "text-muted-foreground"}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>

    <Button onClick={onApply} className="w-full h-12 rounded-md text-sm font-semibold">Apply Filters</Button>
  </div>
);

const MAX_VISIBLE = 200;

const Radar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [category, setCategory] = useState<string | null>(null);
  const [distIdx, setDistIdx] = useState(3); // default 100+ (any)
  const [selectedProduct, setSelectedProduct] = useState<RadarProduct | null>(null);
  const [allProducts, setAllProducts] = useState<RadarProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [localCategory, setLocalCategory] = useState<string | null>(null);
  const [localDistIdx, setLocalDistIdx] = useState(3);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

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
      const { data } = await supabase
        .from("products")
        .select("id, title, price, images, farmer_id, category, farmer:profiles!products_farmer_id_fkey(name, latitude, longitude)")
        .eq("status", "active");

      if (data) {
        setAllProducts(data.map((p: any) => {
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
            category: p.category,
          };
        }).filter((p: RadarProduct) => p.latitude != null && p.longitude != null));
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  // Apply filters + bounds + limit
  const filteredProducts = useMemo(() => {
    let result = allProducts;

    // Category filter
    if (category) {
      result = result.filter(p => p.category === category);
    }

    // Distance filter
    const miles = DISTANCE_STEPS[distIdx];
    if (miles < 100 && myLocation) {
      const maxKm = milesToKm(miles);
      result = result.filter(p =>
        p.latitude != null && p.longitude != null &&
        haversineKm(myLocation.lat, myLocation.lng, p.latitude, p.longitude) <= maxKm
      );
    }

    // Bounds filter (lazy loading)
    if (mapBounds) {
      result = result.filter(p =>
        p.latitude != null && p.longitude != null &&
        mapBounds.contains(L.latLng(p.latitude, p.longitude))
      );
    }

    // Limit
    return result.slice(0, MAX_VISIBLE);
  }, [allProducts, category, distIdx, myLocation, mapBounds]);

  const handleFindMyLocation = () => {
    if (myLocation) {
      setFlyTarget({ lat: myLocation.lat, lng: myLocation.lng, zoom: 15 });
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
      setLocalCategory(category);
      setLocalDistIdx(distIdx);
    }
    setFilterOpen(isOpen);
  };

  const handleApplyFilter = () => {
    setCategory(localCategory);
    setDistIdx(localDistIdx);
    setFilterOpen(false);
  };

  const handleResetFilter = () => {
    setLocalCategory(null);
    setLocalDistIdx(3);
    setCategory(null);
    setDistIdx(3);
    setFilterOpen(false);
  };

  const defaultCenter: [number, number] = myLocation ? [myLocation.lat, myLocation.lng] : [14.5995, 120.9842];

  const activeFilterCount = [
    category !== null ? category : null,
    distIdx !== 3 ? distIdx : null,
  ].filter(v => v !== null).length;

  const distLabel = DISTANCE_LABELS[distIdx];

  const handleSelectProduct = useMemo(() => (p: RadarProduct) => setSelectedProduct(p), []);

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
                localCategory={localCategory} setLocalCategory={setLocalCategory}
                localDistIdx={localDistIdx} setLocalDistIdx={setLocalDistIdx}
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
                localCategory={localCategory} setLocalCategory={setLocalCategory}
                localDistIdx={localDistIdx} setLocalDistIdx={setLocalDistIdx}
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

            <MapBoundsTracker onBoundsChange={setMapBounds} />

            {myLocation && (
              <>
                <FlyToLocation lat={myLocation.lat} lng={myLocation.lng} />
                <Marker position={[myLocation.lat, myLocation.lng]} icon={youIcon}>
                  <Popup><span className="font-semibold">You are here</span></Popup>
                </Marker>
              </>
            )}

            {flyTarget && <FlyToLocation lat={flyTarget.lat} lng={flyTarget.lng} zoom={flyTarget.zoom} />}

            <MarkerClusterGroup products={filteredProducts} onSelect={handleSelectProduct} />
          </MapContainer>
        )}

        {/* Legend */}
        {!filterOpen && (
          <div className="absolute left-4 top-4 bg-card/90 backdrop-blur-sm rounded-lg p-2 border border-border z-[1000]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded" />
              <span className="text-[10px] text-foreground">Products</span>
            </div>
          </div>
        )}

        {/* Bottom card */}
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
              <p className="text-xs text-muted-foreground">{filteredProducts.length} products on map · {distLabel}</p>
            </div>
            <MapPin className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

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
