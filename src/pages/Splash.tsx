import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import farmkoLogo from "@/assets/farmko-logo-white.png";
import { useAuth } from "@/contexts/AuthContext";

const Splash = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) return; // wait for auth to resolve
      if (isAuthenticated) {
        navigate("/home");
      } else {
        navigate("/onboarding");
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate, isAuthenticated, isLoading]);

  // If still loading after splash delay, redirect once resolved
  useEffect(() => {
    if (!isLoading) return;
    const fallback = setTimeout(() => {
      if (isAuthenticated) {
        navigate("/home");
      }
    }, 4000);
    return () => clearTimeout(fallback);
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <MobileLayout noPadding>
      <div className="flex-1 bg-primary flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-primary-foreground/10" />
        <div className="absolute bottom-20 right-5 w-24 h-24 rounded-full bg-primary-foreground/10" />
        
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="w-20 h-20 flex items-center justify-center">
            <img src={farmkoLogo} alt="Farmko logo" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground tracking-wide">FARMKO</h1>
          <p className="text-primary-foreground/80 text-sm">Gateway to Farmko</p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Splash;
