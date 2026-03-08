import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AnalyticsEventType =
  | "profile_view"
  | "listing_view"
  | "listing_click"
  | "contact_farmer"
  | "favorite_listing";

interface TrackEventOptions {
  farmerId: string;
  listingId?: string;
  eventType: AnalyticsEventType;
}

export const useAnalyticsTracking = () => {
  const { user } = useAuth();

  const trackEvent = useCallback(
    async ({ farmerId, listingId, eventType }: TrackEventOptions) => {
      try {
        await supabase.from("analytics_events").insert({
          farmer_id: farmerId,
          listing_id: listingId || null,
          event_type: eventType,
          user_id: user?.id || null,
          reference_id: listingId || null,
        });
      } catch (error) {
        console.error("Failed to track analytics event:", error);
      }
    },
    [user?.id]
  );

  const trackProfileView = useCallback(
    (farmerId: string) => trackEvent({ farmerId, eventType: "profile_view" }),
    [trackEvent]
  );

  const trackListingView = useCallback(
    (farmerId: string, listingId: string) =>
      trackEvent({ farmerId, listingId, eventType: "listing_view" }),
    [trackEvent]
  );

  const trackListingClick = useCallback(
    (farmerId: string, listingId: string) =>
      trackEvent({ farmerId, listingId, eventType: "listing_click" }),
    [trackEvent]
  );

  const trackContactFarmer = useCallback(
    (farmerId: string) => trackEvent({ farmerId, eventType: "contact_farmer" }),
    [trackEvent]
  );

  const trackFavoriteListing = useCallback(
    (farmerId: string, listingId: string) =>
      trackEvent({ farmerId, listingId, eventType: "favorite_listing" }),
    [trackEvent]
  );

  return {
    trackEvent,
    trackProfileView,
    trackListingView,
    trackListingClick,
    trackContactFarmer,
    trackFavoriteListing,
  };
};
