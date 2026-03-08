import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const pinIcon = new L.DivIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:hsl(152,70%,48%);border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function ClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const flown = useRef(false);
  useEffect(() => {
    if (!flown.current) {
      map.flyTo([lat, lng], 14, { duration: 1 });
      flown.current = true;
    }
  }, [lat, lng, map]);
  return null;
}

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
}

const LocationPicker = ({ latitude, longitude, onLocationChange }: LocationPickerProps) => {
  const [detecting, setDetecting] = useState(false);
  const center: [number, number] = latitude && longitude ? [latitude, longitude] : [14.5995, 120.9842];

  const handleDetect = () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationChange(pos.coords.latitude, pos.coords.longitude);
        setDetecting(false);
      },
      () => setDetecting(false)
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Tap the map to set your location</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDetect}
          disabled={detecting}
          className="gap-1.5 text-xs h-7"
        >
          {detecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
          Use GPS
        </Button>
      </div>
      <div className="w-full h-48 rounded-xl overflow-hidden border border-border">
        <MapContainer
          center={center}
          zoom={latitude && longitude ? 14 : 6}
          className="w-full h-full z-0"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onLocationSelect={onLocationChange} />
          {latitude && longitude && (
            <>
              <Marker position={[latitude, longitude]} icon={pinIcon} />
              <FlyTo lat={latitude} lng={longitude} />
            </>
          )}
        </MapContainer>
      </div>
      {latitude && longitude && (
        <p className="text-[10px] text-muted-foreground text-center">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </p>
      )}
    </div>
  );
};

export default LocationPicker;
