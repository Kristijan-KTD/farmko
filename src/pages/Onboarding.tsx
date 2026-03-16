import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Apple, Users, ShoppingBag, MapPin, MessageCircle, ArrowLeft, Tractor, Search } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/contexts/AuthContext";

const farmerSlides = [
  {
    icon: User,
    title: "Set Up Your Farm Profile",
    description: "Create your profile, add farm details, and let customers know who you are.",
  },
  {
    icon: Apple,
    title: "Post Your First Product",
    description: "Upload your products with photos, prices, and details so local buyers can discover them.",
  },
  {
    icon: MessageCircle,
    title: "Connect with Customers",
    description: "Chat directly with buyers, answer their questions, and arrange delivery or pickup.",
  },
];

const customerSlides = [
  {
    icon: MapPin,
    title: "Create Your Profile",
    description: "Set up your account and choose your location to discover farms and products near you.",
  },
  {
    icon: Search,
    title: "Explore Local Products",
    description: "Browse fresh products, search by category, and find trusted farmers in your area.",
  },
  {
    icon: ShoppingBag,
    title: "Connect & Arrange Pickup",
    description: "Chat with farmers, ask questions, and arrange delivery or pickup directly.",
  },
];

const Onboarding = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const slides = role === "farmer" ? farmerSlides : customerSlides;

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    } else {
      setRole(null);
      setCurrentSlide(0);
    }
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate("/register", { state: { role } });
    }
  };

  // Role selection screen
  if (!role) {
    return (
      <MobileLayout hideDesktopSidebar>
        <div className="flex-1 flex flex-col items-center justify-center gap-10 px-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Welcome to Farmko</h1>
            <p className="text-sm text-muted-foreground">Choose how you want to use Farmko.</p>
          </div>
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <Button
              onClick={() => { setRole("farmer"); setCurrentSlide(0); }}
              className="w-full rounded-full h-14 text-base font-semibold gap-3"
            >
              <Tractor className="w-5 h-5" />
              Continue as Farmer
            </Button>
            <Button
              variant="outline"
              onClick={() => { setRole("customer"); setCurrentSlide(0); }}
              className="w-full rounded-full h-14 text-base font-semibold gap-3"
            >
              <Users className="w-5 h-5" />
              Continue as Customer
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  const slide = slides[currentSlide];
  const isLast = currentSlide === slides.length - 1;

  return (
    <MobileLayout hideDesktopSidebar>
      {/* Back button */}
      <div className="pt-2 px-1">
        <button onClick={handleBack} className="p-2 rounded-full hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
          <slide.icon className="w-12 h-12 text-primary" />
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-xl font-bold text-foreground">{slide.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed px-4">{slide.description}</p>
        </div>
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentSlide ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="pb-8 px-4">
        <Button onClick={handleNext} className="w-full rounded-full h-12 text-base font-semibold">
          {isLast
            ? `Get Started as ${role === "farmer" ? "Farmer" : "Customer"}`
            : "Next"}
        </Button>
      </div>
    </MobileLayout>
  );
};

export default Onboarding;
