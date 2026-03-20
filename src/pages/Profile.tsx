import { User, MapPin, Mail, Phone, Crown, ArrowUpRight, Loader2, Zap } from "lucide-react";
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

const planIcons: Record<string, any> = {
  growth: Zap,
  pro: Crown,
};

const planColors: Record<string, string> = {
  growth: "bg-primary text-primary-foreground",
  pro: "bg-yellow-500 text-white",
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

      <div className="flex-1 flex flex-col items-center section-gap">
        <div className="relative mb-2">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          {showBadge && (() => {
            const Icon = planIcons[plan];
            return Icon ? (
              <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-background shadow-sm ${
                plan === "pro" ? "bg-yellow-500 text-white" : "bg-primary text-primary-foreground"
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            ) : null;
          })()}
        </div>
        <h2 className="text-lg font-bold text-foreground">{user?.name}</h2>
        <p className="text-xs text-primary capitalize">{user?.role}</p>

        {/* Subscription Section for Farmers */}
        {isFarmer && (
          <div className="w-full p-4 rounded-lg border border-border bg-card space-y-3">
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

        <div className="w-full space-y-2">
           <div className="list-item-subtle">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-foreground">{user?.email}</span>
          </div>
          {user?.phone && (
             <div className="list-item-subtle">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-foreground">{user.phone}</span>
            </div>
          )}
          {user?.location && (
            <div className="list-item-subtle">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-foreground">{user.location}</span>
            </div>
          )}
          {user?.bio && (
            <p className="text-sm text-muted-foreground px-3">{user.bio}</p>
          )}
        </div>
      </div>

      <div className="pb-6 pt-3">
        <Button onClick={() => navigate("/edit-profile")} className="w-full rounded-md h-11 text-sm font-semibold">
          Edit Profile
        </Button>
      </div>
    </MobileLayout>
  );
};

export default Profile;
