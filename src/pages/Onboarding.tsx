import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Apple, Users } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";

const slides = [
  {
    icon: User,
    title: "Set Up Your Farm Profile",
    description: "Create your personal farm profile to showcase your products and connect with local customers.",
  },
  {
    icon: Apple,
    title: "Post Your First Product",
    description: "List your fresh produce, dairy, eggs, and more for customers in your area to discover.",
  },
  {
    icon: Users,
    title: "Connect with Customers",
    description: "Chat directly with buyers, negotiate prices, and arrange delivery or pickup.",
  },
];

const Onboarding = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate("/login");
    }
  };

  const slide = slides[currentSlide];

  return (
    <MobileLayout>
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
          <slide.icon className="w-12 h-12 text-primary" />
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-xl font-bold text-foreground">{slide.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed px-4">
            {slide.description}
          </p>
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
      <div className="pb-8">
        <Button onClick={handleNext} className="w-full rounded-full h-12 text-base font-semibold">
          {currentSlide < slides.length - 1 ? "Next" : "Get Started"}
        </Button>
      </div>
    </MobileLayout>
  );
};

export default Onboarding;
