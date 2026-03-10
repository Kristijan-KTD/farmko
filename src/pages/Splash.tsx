import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import farmkoLogo from "@/assets/farmko-logo-white.png";
import { useAuth } from "@/contexts/AuthContext";

const Splash = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Show splash for at least 2.5s, then navigate once auth is resolved
    const minDelay = new Promise(resolve => setTimeout(resolve, 2500));
    
    const checkAuth = async () => {
      await minDelay;
      // If still loading, wait for it to resolve
      if (isLoading) return;
      navigate(isAuthenticated ? "/home" : "/onboarding", { replace: true });
    };
    
    checkAuth();
  }, [navigate, isAuthenticated, isLoading]);

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-primary-foreground/10" />
      <div className="absolute bottom-20 right-5 w-24 h-24 rounded-full bg-primary-foreground/10" />
      
      <div className="flex flex-col items-center gap-4 z-10">
        <div className="w-20 h-20 flex items-center justify-center">
          <img src={farmkoLogo} alt="Farmko logo" className="w-20 h-20 object-contain" />
        </div>
        
        <div className="flex gap-2 mt-6">
          <span className="w-2 h-2 rounded-full bg-primary-foreground/70 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-primary-foreground/70 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-primary-foreground/70 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
};

export default Splash;
