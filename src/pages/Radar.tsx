import { MapPin, User, MessageCircle } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useAuth } from "@/contexts/AuthContext";

const mockPins = [
  { id: 1, name: "Jane's Farm", lat: 30, left: 25, type: "farmer" },
  { id: 2, name: "Green Valley", lat: 50, left: 60, type: "farmer" },
  { id: 3, name: "Bob (Customer)", lat: 35, left: 70, type: "customer" },
  { id: 4, name: "Sunny Acres", lat: 65, left: 40, type: "farmer" },
  { id: 5, name: "Alice (Customer)", lat: 20, left: 50, type: "customer" },
];

const Radar = () => {
  const { user } = useAuth();

  return (
    <MobileLayout noPadding>
      <div className="px-6">
        <PageHeader title="Radar" />
      </div>

      <div className="flex-1 relative bg-secondary overflow-hidden">
        {/* Mock map background */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Map pins */}
        {mockPins.map((pin) => (
          <button
            key={pin.id}
            className="absolute transform -translate-x-1/2 -translate-y-full group"
            style={{ top: `${pin.lat}%`, left: `${pin.left}%` }}
          >
            <div className="relative">
              <MapPin className={`w-8 h-8 ${pin.type === "farmer" ? "text-primary" : "text-destructive"} fill-current`} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-card shadow-lg rounded-lg px-2 py-1 whitespace-nowrap border border-border">
                <p className="text-xs font-medium text-foreground">{pin.name}</p>
              </div>
            </div>
          </button>
        ))}

        {/* Your location */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-card rounded-xl shadow-lg p-3 flex items-center gap-3 border border-border w-[calc(100%-3rem)]">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground">Your location</p>
          </div>
          <button className="p-2 bg-primary rounded-full">
            <MessageCircle className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

export default Radar;
