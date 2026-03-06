import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import farmkoLogo from "@/assets/farmko-logo-white.png";

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/onboarding"), 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <MobileLayout noPadding>
      <div className="flex-1 bg-primary flex flex-col items-center justify-center relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-primary-foreground/10" />
        <div className="absolute bottom-20 right-5 w-24 h-24 rounded-full bg-primary-foreground/10" />
        
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="w-20 h-20 rounded-full border-2 border-primary-foreground flex items-center justify-center">
            <svg viewBox="0 0 40 40" className="w-10 h-10 text-primary-foreground" fill="currentColor">
              <circle cx="20" cy="12" r="4" />
              <circle cx="12" cy="22" r="4" />
              <circle cx="28" cy="22" r="4" />
              <circle cx="20" cy="30" r="4" />
              <line x1="20" y1="12" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5" />
              <line x1="20" y1="12" x2="28" y2="22" stroke="currentColor" strokeWidth="1.5" />
              <line x1="12" y1="22" x2="20" y2="30" stroke="currentColor" strokeWidth="1.5" />
              <line x1="28" y1="22" x2="20" y2="30" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground tracking-wide">FARMKO</h1>
          <p className="text-primary-foreground/80 text-sm">Gateway to Farmko</p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Splash;
