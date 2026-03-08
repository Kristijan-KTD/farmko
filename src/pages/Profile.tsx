import { User, MapPin, Mail, Phone, Crown, ArrowUpRight, Loader2 } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription, PLANS } from "@/contexts/SubscriptionContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const planColors: Record<string, string> = {
  growth: "bg-blue-500 text-white",
  pro: "bg-gradient-to-r from-amber-500 to-yellow-400 text-white",
};

const Profile = () => {
  const { user } = useAuth();
  const { plan, subscribed, subscriptionEnd, isLoading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);

  const showBadge = user?.role === "farmer" && plan !== "starter";
  const isFarmer = user?.role === "farmer";

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      toast({ title: "Error", description: "Could not open subscription management", variant: "destructive" });
    }
    setPortalLoading(false);
  };


  return (
    <MobileLayout>
      <PageHeader title="Profile" />

      <div className="flex-1 flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-muted-foreground" />
            )}
          </div>
          {showBadge && (
            <Badge className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] px-2 py-0.5 border-2 border-background shadow-md ${planColors[plan] || ""}`}>
              {plan === "pro" ? "⭐ Pro" : "Growth"}
            </Badge>
          )}
        </div>
        <h2 className="text-xl font-bold text-foreground">{user?.name}</h2>
        <p className="text-sm text-primary capitalize mb-2">{user?.role}</p>

        {/* Subscription Section for Farmers */}
        {isFarmer && (
          <div className="w-full mt-4 p-4 rounded-2xl bg-secondary space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Subscription</span>
              </div>
              <Badge variant={subscribed ? "default" : "secondary"} className="text-[10px]">
                {PLANS[plan].name}
              </Badge>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Listings: <span className="font-medium text-foreground">{plan === "pro" ? "Unlimited" : `Up to ${PLANS[plan].listingLimit}`}</span></p>
              {subscriptionEnd && (
                <p>Renews: <span className="font-medium text-foreground">{new Date(subscriptionEnd).toLocaleDateString()}</span></p>
              )}
            </div>

            <div className="flex gap-2">
              {subscribed ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-full text-xs"
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {portalLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  Manage Subscription
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="flex-1 rounded-full text-xs"
                  onClick={() => navigate("/plans")}
                >
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  Upgrade Plan
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="w-full mt-4 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-foreground">{user?.email}</span>
          </div>
          {user?.phone && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-foreground">{user.phone}</span>
            </div>
          )}
          {user?.location && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-foreground">{user.location}</span>
            </div>
          )}
          {user?.bio && (
            <p className="text-sm text-muted-foreground px-3">{user.bio}</p>
          )}
        </div>
      </div>

      <div className="pb-8 pt-4">
        <Button onClick={() => navigate("/edit-profile")} className="w-full rounded-full h-12 text-base font-semibold">
          Edit Profile
        </Button>
      </div>
    </MobileLayout>
  );
};

export default Profile;
