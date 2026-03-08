import { useEffect } from "react";
import { Check } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const { refreshSubscription } = useSubscription();

  useEffect(() => {
    // Refresh subscription status after successful checkout
    const timer = setTimeout(() => refreshSubscription(), 2000);
    return () => clearTimeout(timer);
  }, [refreshSubscription]);

  return (
    <MobileLayout>
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-10 h-10 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Subscription Activated!</h2>
        <p className="text-sm text-muted-foreground text-center">
          Your plan has been upgraded. Enjoy your new features!
        </p>
      </div>
      <div className="pb-8 space-y-3">
        <Button onClick={() => navigate("/home")} className="w-full rounded-full h-12 text-base font-semibold">
          Go to Dashboard
        </Button>
        <Button variant="outline" onClick={() => navigate("/plans")} className="w-full rounded-full h-12 text-base font-semibold">
          View Plans
        </Button>
      </div>
    </MobileLayout>
  );
};

export default SubscriptionSuccess;
